/**
 * Journey program tests — the 60-day model is pure and fully derived, so every
 * status claim the UI makes is provable here without rendering anything.
 */
import { describe, it, expect } from 'vitest';
import {
  PROGRAM, PROGRAM_DAYS, phaseStatus, currentPhase, programProgress, dayPosition,
  type PhaseContext,
} from '../program';

const ctx = (o: Partial<PhaseContext> = {}): PhaseContext => ({
  isModuleApproved: () => false,
  isModuleWaiting: () => false,
  isModuleStarted: () => false,
  isModuleUnlocked: () => false,
  ...o,
});

describe('program shape matches the official 60-day guide', () => {
  it('has six phases covering day 1 to 60 with no gaps', () => {
    expect(PROGRAM).toHaveLength(6);
    expect(PROGRAM[0]!.dayStart).toBe(1);
    expect(PROGRAM[PROGRAM.length - 1]!.dayEnd).toBe(PROGRAM_DAYS);
    for (let i = 1; i < PROGRAM.length; i++) {
      // each phase starts the day after the previous ends
      expect(PROGRAM[i]!.dayStart).toBe(PROGRAM[i - 1]!.dayEnd + 1);
    }
  });

  it('phases are ordered and every one states outcomes', () => {
    PROGRAM.forEach((p, i) => {
      expect(p.order).toBe(i + 1);
      expect(p.outcomes.length).toBeGreaterThan(0);
      expect(p.purpose.length).toBeGreaterThan(0);
    });
  });

  it('the built curriculum maps onto its phases', () => {
    expect(PROGRAM[0]!.moduleIds).toEqual(['m1']);
    expect(PROGRAM[1]!.moduleIds).toEqual(['m2_1', 'm2_2', 'm2_3', 'm2_4']);
    expect(PROGRAM[2]!.moduleIds).toEqual(['m3']);
  });
});

describe('phase status is derived, never stored', () => {
  it('a phase with no built content reports planned — not available', () => {
    // Honesty rule: unbuilt phases must never look actionable.
    // Every phase is built today, so the rule is held on a synthetic one.
    const unbuilt = { ...PROGRAM[0]!, id: 'unbuilt', moduleIds: [] };
    expect(phaseStatus(unbuilt, ctx({ isModuleUnlocked: () => true }))).toBe('planned');
  });

  it('all units approved → completed', () => {
    expect(phaseStatus(PROGRAM[0]!, ctx({ isModuleApproved: () => true }))).toBe('completed');
  });

  it('any unit waiting on the trainer wins over in-progress', () => {
    const s = phaseStatus(PROGRAM[1]!, ctx({ isModuleWaiting: id => id === 'm2_1', isModuleStarted: () => true }));
    expect(s).toBe('waiting_trainer');
  });

  it('started but not submitted → in progress', () => {
    expect(phaseStatus(PROGRAM[0]!, ctx({ isModuleStarted: () => true }))).toBe('in_progress');
  });

  it('unlocked but untouched → available', () => {
    expect(phaseStatus(PROGRAM[0]!, ctx({ isModuleUnlocked: () => true }))).toBe('available');
  });

  it('nothing unlocked → locked', () => {
    expect(phaseStatus(PROGRAM[1]!, ctx())).toBe('locked');
  });
});

describe('"where am I?" — the one question the screen answers', () => {
  it('points at the first actionable phase', () => {
    const c = ctx({ isModuleUnlocked: id => id === 'm1' });
    expect(currentPhase(c)?.id).toBe('p1');
  });

  it('moves on once the earlier phase is approved', () => {
    const c = ctx({
      isModuleApproved: id => id === 'm1',
      isModuleUnlocked: id => id === 'm2_1',
    });
    expect(currentPhase(c)?.id).toBe('p2');
  });

  it('reports the day and days remaining from the current phase', () => {
    const c = ctx({ isModuleApproved: id => id === 'm1', isModuleUnlocked: id => id === 'm2_1' });
    const { day, remaining } = dayPosition(c);
    expect(day).toBe(3);                       // phase 2 starts on day 3
    expect(remaining).toBe(PROGRAM_DAYS - 3);
  });

  it('progress counts approved units out of built units', () => {
    expect(programProgress(ctx())).toBe(0);
    expect(programProgress(ctx({ isModuleApproved: () => true }))).toBe(1);
    const built = PROGRAM.flatMap(p => p.moduleIds).length;
    expect(programProgress(ctx({ isModuleApproved: id => id === 'm1' }))).toBeCloseTo(1 / built);
  });
});
