/**
 * RULE: Child joining penalty  (غرامة ضم الأبناء)
 * ---------------------------------------------------------------------------
 * SOURCE OF TRUTH — approved (docs/business-rules.md §ChildJoining).
 * Computed from birth year + membership-creation year + addition year — NOT
 * the child's current age.
 *  - child > 6 at creation ⇒ penalty accrues from the creation year.
 *  - child ≤ 6 at creation ⇒ no immediate penalty; it starts the first year the
 *    child became > 6, up to the year BEFORE the addition.
 *  - addition in the same year the child turned > 6 ⇒ NO penalty.
 * The penalty for each accrued year equals that year's DEPENDENT renewal value.
 */

import { type CalculationResult, type EGP, money } from '../types/money';

/** Approved dependent-renewal table (EGP by year). Single source. */
export const DEPENDENT_RENEWAL: Readonly<Record<number, EGP>> = {
  2016: 100, 2017: 120, 2018: 138, 2019: 147, 2020: 165,
  2021: 185, 2022: 185, 2023: 210, 2024: 210, 2025: 240,
};

export interface ChildJoiningInput {
  readonly birthYear: number;
  readonly membershipCreationYear: number;
  readonly additionYear: number;
}

const AGE_THRESHOLD = 6;

export function childJoiningPenalty(i: ChildJoiningInput): CalculationResult {
  const ageAtCreation = i.membershipCreationYear - i.birthYear;
  // Approved example (born 2013 → starts 2019) fixes the trigger at birthYear + 6.
  const triggerYear = i.birthYear + AGE_THRESHOLD; // first chargeable year for a young child

  // Start year: creation year if already older than the threshold at creation,
  // otherwise the trigger year (birthYear + 6).
  const startYear = ageAtCreation > AGE_THRESHOLD ? i.membershipCreationYear : triggerYear;
  const endYear = i.additionYear - 1; // up to the year before addition

  // Addition in the same year they turned >6 (or earlier) ⇒ no penalty.
  if (startYear > endYear) {
    return {
      total: 0,
      lines: [],
      explanation: 'مفيش غرامة — الإضافة حصلت في نفس سنة تجاوز الـ6 (أو قبلها).',
    };
  }

  const lines = [];
  let total = 0;
  for (let y = startYear; y <= endYear; y++) {
    const v = DEPENDENT_RENEWAL[y];
    if (v == null) continue; // year outside the approved table
    lines.push({ label: `تجديد تابع ${y}`, amount: v });
    total += v;
  }
  total = money(total);

  return {
    total,
    lines,
    explanation:
      `عمره وقت الإنشاء ${ageAtCreation} سنة، فالغرامة بتبدأ من سنة ${startYear} لحد ${endYear} ` +
      `(السنة اللي قبل الإضافة) = مجموع تجديدات التابع = ${total} ج.م.`,
  };
}

/**
 * RULE: Child addition eligibility  (أحقية إضافة الابن) — FINAL, NO EXCEPTIONS.
 * SOURCE OF TRUTH — approved (docs/business-rules.md §Separation):
 *  - Any child aged 25 or older can NEVER be added to a membership, in any form.
 *  - A child reaching 25 while on the membership is mandatorily separated.
 *  - There is NO conversion to any other designation for 25+.
 * The engine rejects automatically; content references this rule, never restates it.
 */
export const CHILD_MAX_AGE_EXCLUSIVE = 25 as const;

export interface ChildEligibilityInput {
  readonly age: number;
  /** If the child's job is printed on the national ID (دكتور/مهندس…). */
  readonly jobOnId?: boolean;
}
export interface EligibilityResult {
  readonly allowed: boolean;
  readonly reason: string;
}

export function childAdditionEligibility(i: ChildEligibilityInput): EligibilityResult {
  if (i.age >= CHILD_MAX_AGE_EXCLUSIVE) {
    return {
      allowed: false,
      reason: 'أي ابن عمره 25 سنة أو أكثر لا يجوز إضافته على العضوية نهائيًا — بأي شكل وبلا استثناءات.',
    };
  }
  if (i.jobOnId) {
    return {
      allowed: false,
      reason: 'لا يُضاف ابن وظيفته مثبتة في بطاقة الرقم القومي.',
    };
  }
  return { allowed: true, reason: 'مستوفي شروط السن — أقل من 25 سنة.' };
}
