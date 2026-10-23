/**
 * Analytics store — memoized derivation for the manager dashboard.
 * The training log feeds pure domain selectors; results are cached on the
 * event-array references so 100k events are traversed once, not per render
 * (Phase 5 performance requirement). Recompute only when a log actually grows.
 */
import { useMemo } from 'react';
import { useTraining, trainingStore } from '../training/trainingStore';
import { useIdentity, useCan, identityStore } from '../identity/identityStore';
import { scopeOf, visibleLearners } from '../../domain/identity/scope';
import type { OrgEvent } from '../../domain/analytics/organization';
import { orgSummary, capabilityGaps } from '../../domain/analytics/organization';
import { practicalPerformance, performanceFromOwnEvents, groupByEmployee } from '../../domain/performance';
import { orgStore } from '../organization/orgStore';

export interface DashboardModel {
  readonly summary: ReturnType<typeof orgSummary>;
  /** Where people in scope are weak (docs/product-model.md, D9). */
  readonly capability: ReturnType<typeof capabilityGaps>;
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
    return {
      summary: orgSummary(events_, employeeIds),
      capability: capabilityGaps(events_, employeeIds),
      employeeIds,
    };
  }, [events, employeeIds]);
};

export { practicalPerformance, performanceFromOwnEvents, groupByEmployee };
