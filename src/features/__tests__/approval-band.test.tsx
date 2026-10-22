// @vitest-environment jsdom
/**
 * The unit-approval band says only what is true, where it can be acted on.
 *
 * It opens the mission paper above a step the trainee can take, and taking the
 * step is the acknowledgement. Above a rework request it would contradict the
 * paper; above a wait it could never be acknowledged and would stay for good.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MissionBrief } from '../journey/MissionBrief';
import type { MissionKind } from '../../domain/journey/mission';
import { MODULES } from '../../content/registry';
import { latestApproval } from '../journey/approval';

afterEach(cleanup);

const unit = MODULES[1]!;
const approval = { title: MODULES[0]!.title, at: 1 };
const handlers = { onOpenLesson: () => {}, onOpenExam: () => {}, onOpenReview: () => {}, onOpenReadiness: () => {} };
const brief = (kind: MissionKind, onApprovalSeen = () => {}) => render(
  <MissionBrief mission={{ primary: { kind, module: unit, lessonId: unit.lessons[0]!.id }, also: [] }}
    trainerName="Adel" approval={approval} onApprovalSeen={onApprovalSeen} {...handlers} />,
);

describe('the approval band', () => {
  it('opens a step the trainee can take, and taking it is the acknowledgement', () => {
    let seen = false;
    brief('resume_lesson', () => { seen = true; });
    expect(screen.getByText(/اتعتمدت/)).toBeTruthy();
    expect(screen.queryByText(/اتفتحت/)).toBeNull();
    fireEvent.click(screen.getAllByRole('button')[0]!);
    expect(seen).toBe(true);
  });

  for (const kind of ['rejected_review', 'waiting_review', 'needs_submission', 'all_done'] as const) {
    it(`stays off a ${kind} mission`, () => {
      brief(kind);
      expect(screen.queryByText(/اتعتمدت/)).toBeNull();
    });
  }
});

describe('which approval is fresh', () => {
  const ev = (moduleId: string, decision: string, at: number) => ({ type: 'EVALUATION_RECORDED', employeeId: 't1', moduleId, decision, at });
  it('reads each unit by its latest evaluation', () => {
    expect(latestApproval([ev('m1', 'ready', 1), ev('m1', 'extend', 2)], 't1', 0)).toBeNull();
    expect(latestApproval([ev('m1', 'ready', 1), ev('m2', 'ready', 3)], 't1', 0)).toEqual({ moduleId: 'm2', at: 3 });
    expect(latestApproval([ev('m1', 'ready', 1), ev('m2', 'not_ready', 3)], 't1', 0)).toEqual({ moduleId: 'm1', at: 1 });
  });
  it('is gone once acted on, and is never another trainee’s', () => {
    expect(latestApproval([ev('m1', 'ready', 5)], 't1', 5)).toBeNull();
    expect(latestApproval([ev('m1', 'ready', 5)], 't2', 0)).toBeNull();
  });
});
