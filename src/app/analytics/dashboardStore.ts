/**
 * Analytics store — memoized derivation for the manager dashboard.
 * All three event logs feed pure domain selectors; results are cached on the
 * event-array references so 100k events are traversed once, not per render
 * (Phase 5 performance requirement). Recompute only when a log actually grows.
 */
import { useMemo } from 'react';
import { useTraining, trainingStore } from '../training/trainingStore';
import { useIdentity, useCan, identityStore } from '../identity/identityStore';
import { scopeOf, visibleLearners } from '../../domain/identity/scope';
import type { OrgEvent } from '../../domain/analytics/organization';
import {
  orgSummary, trainerAnalytics, mostDifficultModules, mostDifficultRules,
  mostReopenedLessons, mostFrequentWeakSkills, mostCommonExtensionReasons,
  trainingEffectiveness, certificationTrend,
} from '../../domain/analytics/organization';
import { employeeReadiness, readinessFromOwnEvents, groupByEmployee } from '../../domain/analytics/employee';
import { orgStore } from '../organization/orgStore';

export interface DashboardModel {
  readonly summary: ReturnType<typeof orgSummary>;
  readonly effectiveness: number;
  readonly trainers: ReturnType<typeof trainerAnalytics>;
  readonly difficultModules: ReturnType<typeof mostDifficultModules>;
  readonly difficultRules: ReturnType<typeof mostDifficultRules>;
  readonly reopenedLessons: ReturnType<typeof mostReopenedLessons>;
  readonly weakSkills: ReturnType<typeof mostFrequentWeakSkills>;
  readonly extensionReasons: ReturnType<typeof mostCommonExtensionReasons>;
  readonly trend: ReturnType<typeof certificationTrend>;
  readonly employeeIds: readonly string[];
}

/**
 * The dashboard reads employees from the identity log (real roster) so the
 * denominator is correct even before every trainee has an event.
 */
export const useDashboard = (): DashboardModel => {
  useTraining();            // subscribe: re-render when a training event lands
  const { users, roles } = useIdentity();
  const canDo = useCan();
  const events = trainingStore.events() as readonly OrgEvent[];

  // Row-level authorization. A branch manager's dashboard is computed over
  // THEIR branch only; a department manager's over the organisation. The scope
  // comes from the domain — this store never inspects a role name, and every
  // screen that reads the dashboard inherits the same boundary.
  const employeeIds = useMemo(() => {
    const scope = scopeOf(identityStore.currentUser(), canDo, orgStore.get());
    return visibleLearners(users, roles, scope)
      .filter(u => u.status !== 'archived')
      .map(u => u.id);
  }, [users, roles, canDo]);

  // Memoized on the event array reference (new array only when the log grows).
  return useMemo(() => {
    // Analytics are derived ONLY from in-scope employees' events. Out-of-scope
    // records never enter the computation, so they cannot leak through a total.
    const inScope = new Set(employeeIds);
    const events_ = events.filter(e => !e.employeeId || inScope.has(e.employeeId));
    const summary = orgSummary(events_, employeeIds);
    return {
      summary,
      effectiveness: trainingEffectiveness(summary, events_),
      trainers: trainerAnalytics(events_),
      difficultModules: mostDifficultModules(events_),
      difficultRules: mostDifficultRules(events_),
      reopenedLessons: mostReopenedLessons(events_),
      weakSkills: mostFrequentWeakSkills(events_),
      extensionReasons: mostCommonExtensionReasons(events_),
      trend: certificationTrend(events_),
      employeeIds,
    };
  }, [events, employeeIds]);
};

export { employeeReadiness, readinessFromOwnEvents, groupByEmployee };
