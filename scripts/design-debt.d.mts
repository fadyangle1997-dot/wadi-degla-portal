export interface DesignDebt {
  inlineStyles: number;
  important: number;
  rawPaletteTsx: number;
  rawPaletteCss: number;
  rawGold: number;
  goldUses: number;
  arbitraryFontSizes: number;
  literalDurations: number;
  directLucide: number;
}
export const BASELINE_FILE: string;
export function countDesignDebt(srcDir?: string): DesignDebt;
