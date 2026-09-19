/**
 * RULE: Renewal late-penalty  (تجديد العضوية وغرامة التأخير)
 * ---------------------------------------------------------------------------
 * SOURCE OF TRUTH — approved by management (see docs/business-rules.md §Renewal).
 * This is the ONLY place renewal penalties are computed. Lessons, the knowledge
 * center and quizzes all reference this module; none of them restate the maths.
 *
 * WHY two phases: a membership left unrenewed behaves differently *inside* the
 * year vs *after* the year ends. Modelling both here prevents the contradictory
 * copy the previous build shipped ("5% per member" vs "doubles each month").
 *
 * Phase 1 — inside the same year (after the first 3 grace months):
 *   monthly late fee = 5% of the annual renewal value, PER member, NO VAT,
 *   growing each month until year end.
 * Phase 2 — the year ended without renewal:
 *   the 5% stops; ascending tiers apply to the renewal value OF THE UNRENEWED
 *   YEAR (not the current price): year1 50%, year2 100%, year3 200%, year4 300%.
 *   After the regulation window, a board-set % of the CURRENT membership value
 *   applies. 5 consecutive unrenewed years ⇒ membership is dropped.
 */

import { type CalculationResult, type EGP, money } from '../types/money';

export const RENEWAL = {
  graceMonths: 3,
  monthlyRatePhase1: 0.05, // 5% per member per month, no VAT
  annualTiers: [0.5, 1.0, 2.0, 3.0], // year 1..4 after year-end
  dropAfterYears: 5,
} as const;

export interface RenewalPhase1Input {
  /** Annual renewal value for ONE member (EGP). */
  readonly renewalValuePerMember: EGP;
  /** Number of members inside the membership. */
  readonly memberCount: number;
  /** Calendar month 1..12 the renewal is being done in (grace = months 1..3). */
  readonly currentMonth: number;
}

/** Phase 1 — still inside the year. Returns 0 during the grace window. */
export function renewalPenaltyWithinYear(i: RenewalPhase1Input): CalculationResult {
  const monthsLate = Math.max(0, i.currentMonth - RENEWAL.graceMonths);
  if (monthsLate === 0) {
    return {
      total: 0,
      lines: [],
      explanation: 'إحنا لسه في أول 3 شهور من السنة — التجديد من غير أي غرامة.',
    };
  }
  const perMember = money(i.renewalValuePerMember * RENEWAL.monthlyRatePhase1 * monthsLate);
  const total = money(perMember * i.memberCount);
  return {
    total,
    lines: [
      { label: `غرامة 5% × ${monthsLate} شهر × ${i.memberCount} عضو`, amount: total, note: 'من غير ضريبة' },
    ],
    explanation:
      `بعد أول 3 شهور، الغرامة 5% من قيمة التجديد لكل عضو عن كل شهر تأخير (من غير ضريبة). ` +
      `دلوقتي ${monthsLate} شهر تأخير × ${i.memberCount} عضو = ${total} ج.م.`,
  };
}

export interface RenewalPhase2Input {
  /** Renewal value of the SPECIFIC unrenewed year (not the current price). */
  readonly unrenewedYearRenewalValue: EGP;
  /** How many full years have passed unrenewed (1..). */
  readonly yearsUnrenewed: number;
}

/** Phase 2 — the year(s) ended without renewal. Ascending tiers. */
export function renewalPenaltyAfterYear(i: RenewalPhase2Input): CalculationResult {
  if (i.yearsUnrenewed >= RENEWAL.dropAfterYears) {
    return {
      total: 0,
      lines: [],
      explanation: `العضوية فضلت ${i.yearsUnrenewed} سنين من غير تجديد — بتعتبر ساقطة حسب اللائحة.`,
    };
  }
  const tierIndex = Math.min(i.yearsUnrenewed, RENEWAL.annualTiers.length) - 1;
  const rate = RENEWAL.annualTiers[tierIndex] ?? RENEWAL.annualTiers[RENEWAL.annualTiers.length - 1]!;
  const total = money(i.unrenewedYearRenewalValue * rate);
  return {
    total,
    lines: [
      { label: `الشريحة: ${rate * 100}% من قيمة تجديد سنة عدم التجديد`, amount: total, note: 'من قيمة السنة نفسها مش الحالية' },
    ],
    explanation:
      `السنة خلصت من غير تجديد، فبنطبّق الشرائح التصاعدية على قيمة تجديد السنة اللي مجددش فيها: ` +
      `السنة رقم ${i.yearsUnrenewed} = ${rate * 100}% × ${i.unrenewedYearRenewalValue} = ${total} ج.م. ` +
      `(النِسب من قيمة السنة نفسها، مش السعر الحالي).`,
  };
}
