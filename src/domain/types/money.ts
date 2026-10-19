/**
 * Financial domain types.
 *
 * WHY: Every monetary calculation in the academy flows through these types.
 * Keeping them here (and nowhere else) means a rule change has exactly one
 * place to touch. Amounts are always in EGP and always represent *teaching*
 * figures — official prices are set by the Club Board (see PricesDisclaimer).
 */

/** Money is modelled as a plain number of EGP. A branded alias documents intent. */
export type EGP = number;

/** A single line in a financial breakdown, shown to the trainee so they can
 *  see exactly where a total came from (never a magic number). */
export interface BreakdownLine {
  readonly label: string;
  readonly amount: EGP;
  /** Optional note explaining the line (e.g. "بعد استبعاد الضريبة"). */
  readonly note?: string;
}

/** The standard result of any calculation in the rules engine. */
export interface CalculationResult {
  readonly total: EGP;
  readonly lines: readonly BreakdownLine[];
  /** Human-readable, plain-Egyptian explanation of the method. */
  readonly explanation: string;
}

/** VAT rate applied by the club where relevant. Late/renewal penalties are VAT-free. */
export const VAT_RATE = 0.14 as const;

/** Remove VAT from a VAT-inclusive amount. e.g. 7410 / 1.14 = 6500. */
export const stripVat = (inclusive: EGP): EGP => inclusive / (1 + VAT_RATE);

/** Round to 2 decimals for display without accumulating float error. */
export const money = (n: number): EGP => Math.round(n * 100) / 100;
