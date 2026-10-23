/**
 * The proof path — «اثبت اللي تعرفه، واتدرّب على اللي ما تعرفوش».
 *
 * An experienced employee does not need sixty days of lessons for what they
 * already do well. The branch manager puts them on the proof path, with a
 * reason (docs/product-model.md D7). On it, each unit can be proved ONCE by
 * its own exam, before any of its lessons:
 *
 *   pass  the unit is credited — approved, without lessons or a unit assessment
 *   miss  the unit becomes an ordinary unit: lessons, exam, the trainer
 *
 * Same units, same exam, same pass mark; one attempt, so it cannot be
 * retried into a pass. What a test-out cannot prove — doing it at the desk —
 * is proved where it always was: the six readiness stations, the conduct
 * check and the manager's decision, unchanged for everyone.
 *
 * Pure: the log, the progress and the training state in; answers out.
 */
import type { Progress } from '../../app/backend';
import type { TrainingState } from '../../app/training/trainingBackend';
import { moduleById } from '../../content/registry';
import { isModuleUnlocked, isLessonDone, examPassed } from '../progress/selectors';
import { reviewOf } from '../training/selectors';

interface LogEvent { readonly type: string; readonly employeeId?: string; readonly at: number }
interface TrackEvent extends LogEvent { readonly type: 'TRACK_ASSIGNED'; readonly track: 'proof' | 'standard'; readonly managerId: string; readonly reason: string }
interface ChallengeEvent extends LogEvent { readonly type: 'UNIT_CHALLENGED'; readonly moduleId: string; readonly score: number; readonly passed: boolean }

export interface TrackAssignment { readonly track: 'proof' | 'standard'; readonly managerId: string; readonly reason: string; readonly at: number }

/** The latest track the branch manager set; null when nobody did (the standard path). */
export function trackOf(events: readonly LogEvent[], employeeId: string): TrackAssignment | null {
  let latest: TrackEvent | null = null;
  for (const e of events) if (e.type === 'TRACK_ASSIGNED' && e.employeeId === employeeId && (!latest || e.at >= latest.at)) latest = e as TrackEvent;
  return latest ? { track: latest.track, managerId: latest.managerId, reason: latest.reason, at: latest.at } : null;
}

export const onProofTrack = (events: readonly LogEvent[], employeeId: string): boolean =>
  trackOf(events, employeeId)?.track === 'proof';

/** The recorded result of the one attempt at this unit, if it finished. */
export function challengeResultOf(events: readonly LogEvent[], employeeId: string, moduleId: string): { score: number; passed: boolean; at: number } | null {
  for (const e of events) {
    if (e.type === 'UNIT_CHALLENGED' && e.employeeId === employeeId && (e as ChallengeEvent).moduleId === moduleId) {
      const c = e as ChallengeEvent;
      return { score: c.score, passed: c.passed, at: c.at };
    }
  }
  return null;
}

/** Whether the one attempt at this unit was started (its first answer given). */
export const challengeStarted = (events: readonly LogEvent[], employeeId: string, moduleId: string): boolean =>
  events.some(e => e.type === 'UNIT_CHALLENGE_STARTED' && e.employeeId === employeeId && (e as { moduleId?: string }).moduleId === moduleId);

/**
 * The one attempt at proving this unit: its result, or — started and never
 * finished (left, reloaded, the tab closed) — a miss. null when untried.
 */
export function challengeOf(events: readonly LogEvent[], employeeId: string, moduleId: string): { score: number; passed: boolean; at: number; finished: boolean } | null {
  const result = challengeResultOf(events, employeeId, moduleId);
  if (result) return { ...result, finished: true };
  const started = events.find(e => e.type === 'UNIT_CHALLENGE_STARTED' && e.employeeId === employeeId && (e as { moduleId?: string }).moduleId === moduleId);
  return started ? { score: 0, passed: false, at: started.at, finished: false } : null;
}

/**
 * May this unit be proved now? On the proof path, the unit open, untouched
 * (no lesson done, no exam passed, nothing submitted) and not proved before.
 */
export function canChallenge(p: Progress, t: TrainingState, events: readonly LogEvent[], employeeId: string, moduleId: string): boolean {
  const m = moduleById(moduleId);
  if (!m || !onProofTrack(events, employeeId)) return false;
  if (!isModuleUnlocked(p, moduleId, t, employeeId)) return false;
  if (reviewOf(t, employeeId, moduleId).status !== 'none') return false;
  if (m.lessons.some(l => isLessonDone(p, l.id)) || examPassed(p, moduleId)) return false;
  return challengeOf(events, employeeId, moduleId) === null;
}
