/**
 * Each unit's latest word, read off one trainee's log: the trainer's
 * assessment, the branch manager's answer on an escalation, or — on a unit
 * nobody had submitted — a pass on the proof path. The reducer
 * (app/training/trainingBackend) decides a unit the same way; the readers of
 * the log ask this rather than each folding the log with its own rule.
 *
 * Pure: the log in, one entry per decided unit out.
 */
interface LogEvent {
  readonly type: string; readonly employeeId?: string; readonly moduleId?: string;
  readonly decision?: string; readonly passed?: boolean; readonly at: number;
}

export interface UnitWord {
  /** 'ready', or what sent it back or where it waits. */
  readonly decision: string;
  readonly at: number;
  /** Proved by its exam on the proof path. */
  readonly credited: boolean;
}

export function unitDecisions(events: readonly LogEvent[], employeeId: string): ReadonlyMap<string, UnitWord> {
  const words = new Map<string, UnitWord>();
  const touched = new Set<string>();
  for (const e of events) {
    if (e.employeeId !== employeeId || !e.moduleId) continue;
    if (e.type === 'EVALUATION_RECORDED' || e.type === 'UNIT_ESCALATION_ANSWERED') {
      words.set(e.moduleId, { decision: e.decision ?? '', at: e.at, credited: false });
    } else if (e.type === 'UNIT_CHALLENGED' && e.passed && !touched.has(e.moduleId)) {
      words.set(e.moduleId, { decision: 'ready', at: e.at, credited: true });
    }
    if (e.type === 'UNIT_SUBMITTED_FOR_REVIEW' || e.type === 'EVALUATION_RECORDED' || e.type === 'UNIT_CHALLENGED') touched.add(e.moduleId);
  }
  return words;
}
