import { describe, it, expect } from 'vitest';
import { DEMO_ACCOUNTS, seedTraineeProgress } from '../demoAccounts';
import { progressStore, overallProgress } from '../../progress';

describe('demo seeding produces real, correct progress', () => {
  for (const a of DEMO_ACCOUNTS.filter(x => x.roleId === 'employee')) {
    it(`${a.username} → ~${Math.round((a.progress ?? 0) * 100)}%`, () => {
      seedTraineeProgress(a);
      const actual = overallProgress(progressStore.get());
      expect(actual).toBeGreaterThanOrEqual((a.progress ?? 0) - 0.06);
      expect(actual).toBeLessThanOrEqual((a.progress ?? 0) + 0.06);
    });
  }
});
