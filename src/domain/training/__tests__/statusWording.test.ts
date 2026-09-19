import { describe, it, expect } from 'vitest';
import { waitingForTrainer } from '../statusWording';

describe('waiting-for-trainer wording — one unified phrase', () => {
  it('names the trainer by first name', () => {
    expect(waitingForTrainer('Mohamed Adel')).toBe('في انتظار مدربك Mohamed');
  });
  it('falls back gracefully when the trainer is unknown', () => {
    expect(waitingForTrainer(undefined)).toBe('في انتظار مدربك');
    expect(waitingForTrainer('')).toBe('في انتظار مدربك');
  });
  it('never uses the old ERP phrasings', () => {
    const out = waitingForTrainer('Adel');
    for (const banned of ['تقييم', 'Pending', 'Evaluation', 'مراجعة']) {
      expect(out).not.toContain(banned);
    }
  });
});
