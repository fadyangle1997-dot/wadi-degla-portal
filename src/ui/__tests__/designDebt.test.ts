/**
 * 🔒 Design debt only goes down.
 *
 * The visual migration moves screens onto the system; it must not pay for that
 * with new one-offs. Every count in scripts/design-debt.mjs (inline styles,
 * !important, raw palette and gold, off-scale font sizes, literal durations,
 * icons outside <Icon>) stays at or under the committed baseline. When a count
 * drops, lower the baseline with `node scripts/design-debt.mjs --write`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { countDesignDebt, BASELINE_FILE, type DesignDebt } from '../../../scripts/design-debt.mjs';

const baseline = (JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as { counts: DesignDebt }).counts;
const now = countDesignDebt();

describe('design debt ratchet', () => {
  for (const key of Object.keys(baseline) as (keyof DesignDebt)[]) {
    it(`${key} never rises above its baseline (${baseline[key]})`, () => {
      expect(now[key], `${key}: ${now[key]} > baseline ${baseline[key]}`).toBeLessThanOrEqual(baseline[key]);
    });
  }

  it('the counter counts — an empty result would pass every ratchet', () => {
    expect(now.inlineStyles + now.directLucide + now.goldUses).toBeGreaterThan(50);
  });
});
