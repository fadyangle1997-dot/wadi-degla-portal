/**
 * RULE: Child separation penalty  (غرامة انفصال الأبناء عند تأخّر الفصل)
 * ---------------------------------------------------------------------------
 * SOURCE OF TRUTH — approved (docs/business-rules.md §Separation).
 * The separation service fee (7410) is VAT-INCLUSIVE; VAT is stripped first
 * (7410 / 1.14 = 6500) and the age-based percentage is applied to 6500.
 * The late penalty itself is NEVER taxed. Late penalties start at age 26.
 * Above 28 the base is 10% of the CURRENT membership value, entered manually
 * by staff, + 14% VAT on that 10%.
 *
 * AGE, NEVER BIRTH YEAR. A birth year is true for one calendar year and then
 * silently wrong — «25 سنة» is «مواليد 2001» only during 2026. Every tier here
 * is keyed on age at execution time, and the explanation strings must match.
 */

import { type CalculationResult, type EGP, VAT_RATE, stripVat, money } from '../types/money';

export const SEPARATION = {
  /** VAT-inclusive separation service fee. */
  serviceFeeInclVat: 7410,
  /** Age → percentage of the VAT-stripped base (6500). */
  tiersByAge: {
    25: 0,
    26: 0.5,
    27: 1.0,
    28: 2.0,
  } as Record<number, number>,
  /** For >28 (1997 and older): 10% of current membership value + VAT on it. */
  olderRateOfCurrentValue: 0.1,
} as const;

export interface SeparationInput {
  /** Age of the child at execution time. */
  readonly age: number;
  /** Required ONLY for age > 28: current membership value (entered manually). */
  readonly currentMembershipValue?: EGP;
}

export function separationPenalty(i: SeparationInput): CalculationResult {
  const base = money(stripVat(SEPARATION.serviceFeeInclVat)); // 6500

  if (i.age <= 25) {
    return { total: 0, lines: [], explanation: 'عند 25 سنة: مفيش غرامة تأخير.' };
  }

  if (i.age > 28) {
    const v = i.currentMembershipValue ?? 0;
    const tenPct = money(v * SEPARATION.olderRateOfCurrentValue);
    const vat = money(tenPct * VAT_RATE);
    const total = money(tenPct + vat);
    return {
      total,
      lines: [
        { label: '10% من قيمة العضوية الحالية (إدخال يدوي)', amount: tenPct },
        { label: 'ضريبة 14% على الـ10%', amount: vat },
      ],
      explanation:
        `أكبر من 28 سنة: الموظف بيدخّل قيمة العضوية الحالية يدويًا (${v} ج.م)، ` +
        `والغرامة = 10% منها (${tenPct}) + 14% ضريبة على الـ10% (${vat}) = ${total} ج.م، ` +
        `وبعدين تتضاف قيمة الانفصال. (غرامة التأخير نفسها مفيهاش ضريبة — الضريبة على الـ10% بس).`,
    };
  }

  const rate = SEPARATION.tiersByAge[i.age] ?? 0;
  const total = money(base * rate);
  return {
    total,
    lines: [{ label: `${rate * 100}% من ${base} (بعد استبعاد الضريبة)`, amount: total, note: 'الغرامة من غير ضريبة' }],
    explanation:
      `شيلنا الضريبة الأول: 7410 ÷ 1.14 = ${base}. وعند سن ${i.age} النسبة ${rate * 100}% ` +
      `فالغرامة = ${rate * 100}% × ${base} = ${total} ج.م (من غير ضريبة على الغرامة).`,
  };
}
