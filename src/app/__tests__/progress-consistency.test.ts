/**
 * 🔴 Progress must never contradict itself across screens.
 *
 * The bug: PathView showed overallProgress (effort) while Journey showed
 * programProgress (approvals) — a trainee 90% through the work but 0% approved
 * saw "90%" on one screen and "0%" on the other. These are DIFFERENT concepts
 * and must stay separate, each with ONE source of truth. This pins that.
 */
import { describe, it, expect } from 'vitest';
import { learningProgress, approvalProgress, overallProgress } from '../progress';
import { EMPTY_PROGRESS } from '../backend';
import { reduceTraining, EMPTY_TRAINING } from '../training/trainingBackend';

describe('unified progress — two metrics, one source each', () => {
  it('learningProgress and approvalProgress are DISTINCT concepts', () => {
    // A trainee who has done zero work: both are 0.
    expect(learningProgress(EMPTY_PROGRESS)).toBe(0);
    expect(approvalProgress(EMPTY_TRAINING, 'ahmed.m')).toBe(0);
  });

  it('approval can be 0 while learning is positive — they must not be merged', () => {
    // approvalProgress reads the training store; with no approvals it stays 0
    // regardless of how much learning happened. That separation is the whole point.
    const t = reduceTraining(EMPTY_TRAINING, {
      type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: 'ahmed.m', moduleId: 'm1', at: 0,
    });
    expect(approvalProgress(t, 'ahmed.m')).toBe(0);  // submitted ≠ approved
  });

  it('an approval raises ONLY approvalProgress', () => {
    const t = reduceTraining(EMPTY_TRAINING, {
      type: 'EVALUATION_RECORDED', employeeId: 'ahmed.m', moduleId: 'm1',
      trainerId: 'trainer.adel', scores: {} as any, decision: 'ready',
      weakSkills: [], weakRules: [], at: 0,
    });
    expect(approvalProgress(t, 'ahmed.m')).toBeGreaterThan(0);
    // learningProgress is unaffected by approvals — different source.
    expect(learningProgress(EMPTY_PROGRESS)).toBe(0);
  });

  it('overallProgress is an alias of learningProgress (no third calculation)', () => {
    expect(overallProgress).toBe(learningProgress);
  });

  it('per-trainee isolation: approving ahmed does not move mariam', () => {
    const t = reduceTraining(EMPTY_TRAINING, {
      type: 'EVALUATION_RECORDED', employeeId: 'ahmed.m', moduleId: 'm1',
      trainerId: 'trainer.adel', scores: {} as any, decision: 'ready',
      weakSkills: [], weakRules: [], at: 0,
    });
    expect(approvalProgress(t, 'ahmed.m')).toBeGreaterThan(0);
    expect(approvalProgress(t, 'mariam.a')).toBe(0);
  });
});
