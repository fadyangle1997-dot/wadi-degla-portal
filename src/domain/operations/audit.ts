/**
 * Audit selectors — Phase 6B. One projection over both administrative logs:
 * account changes (wda.identity.audit) and governance changes to the
 * organisation (wda.org.audit). Composable filters + a human label per event +
 * CSV-ready export shape. Performance: filtering is lazy and callers render
 * the latest N first.
 */
import type { AuditEvent as IdentityAuditEvent } from '../../app/identity/identityBackend';
import type { User } from '../identity';
import { describeOrgEvent, type OrgAuditEvent } from '../organization/audit';

export type AuditEvent = IdentityAuditEvent | OrgAuditEvent;

const isOrg = (e: AuditEvent): e is OrgAuditEvent => 'action' in e;
/** The event's action name — `ROLE_CHANGED`, `org.branch_moved`. */
export const actionOf = (e: AuditEvent): string => (isOrg(e) ? e.action : e.type);
/** A key unique per event, for lists. */
export const auditKey = (e: AuditEvent): string =>
  isOrg(e) ? e.id : `${e.at}:${e.type}:${'userId' in e ? e.userId : e.type === 'USER_CREATED' ? e.user.id : ''}`;

export interface AuditFilter {
  readonly actorId?: string;
  readonly targetId?: string;
  readonly action?: string;
  readonly from?: number;
  readonly to?: number;
  readonly text?: string;
}

/** Human, RTL-friendly description of an audit event. */
export function describeAudit(e: AuditEvent, nameOf: (id: string) => string): string {
  if (isOrg(e)) return describeOrgEvent(e, nameOf);
  const actor = nameOf(e.actorId);
  switch (e.type) {
    case 'USER_CREATED': return `${actor} أنشأ المستخدم ${e.user.name}`;
    case 'USER_UPDATED': return `${actor} عدّل بيانات ${nameOf(e.userId)}`;
    case 'ROLE_CHANGED': return `${actor} غيّر دور ${nameOf(e.userId)} إلى ${e.roleId}`;
    case 'USER_DISABLED': return `${actor} عطّل ${nameOf(e.userId)}`;
    case 'USER_ENABLED': return `${actor} فعّل ${nameOf(e.userId)}`;
    case 'USER_ARCHIVED': return `${actor} أرشف ${nameOf(e.userId)}`;
    case 'PASSWORD_RESET_REQUESTED': return `${actor} طلب إعادة تعيين كلمة مرور ${nameOf(e.userId)}`;
    case 'TRAINER_ASSIGNED': return `${actor} ${e.trainerId ? 'أسند مدربًا لـ' : 'أزال مدرب'} ${nameOf(e.userId)}`;
    case 'MANAGER_ASSIGNED': return `${actor} ${e.managerId ? 'أسند مديرًا لـ' : 'أزال مدير'} ${nameOf(e.userId)}`;
  }
}

/** Every id an event is about: its target, and for governance events every entity it touched. */
const targetsOf = (e: AuditEvent): readonly string[] =>
  isOrg(e) ? [e.target.id, ...e.refs.areaIds, ...e.refs.branchIds, ...e.refs.userIds]
    : e.type === 'USER_CREATED' ? [e.user.id] : 'userId' in e ? [e.userId] : [];

export function filterAudit(
  log: readonly AuditEvent[],
  filter: AuditFilter,
  nameOf: (id: string) => string,
): readonly AuditEvent[] {
  return log.filter(e => {
    if (filter.actorId && e.actorId !== filter.actorId) return false;
    if (filter.action && actionOf(e) !== filter.action) return false;
    if (filter.targetId && !targetsOf(e).includes(filter.targetId)) return false;
    if (filter.from && e.at < filter.from) return false;
    if (filter.to && e.at > filter.to) return false;
    if (filter.text) {
      const hay = `${describeAudit(e, nameOf)} ${actionOf(e)}`.toLowerCase();
      if (!hay.includes(filter.text.toLowerCase())) return false;
    }
    return true;
  });
}

/** Newest-first, capped — the view renders the latest N (perf). */
export const latestAudit = (log: readonly AuditEvent[], n = 100): readonly AuditEvent[] =>
  [...log].sort((a, b) => b.at - a.at).slice(0, n);

/** CSV-ready rows (export backend consumes this — no new logic later). */
export interface AuditRow {
  readonly at: number; readonly actor: string; readonly action: string;
  /** What the event changed, and from what to what, as it read at the time. */
  readonly target: string; readonly before: string; readonly after: string;
  readonly detail: string;
}
export function auditExportRows(log: readonly AuditEvent[], nameOf: (id: string) => string): readonly AuditRow[] {
  return [...log].sort((a, b) => b.at - a.at).map(e => ({
    at: e.at, actor: nameOf(e.actorId), action: actionOf(e),
    target: isOrg(e) ? `${e.target.kind}:${e.target.id} (${e.target.name})` : targetsOf(e).map(nameOf).join(' '),
    before: isOrg(e) ? e.beforeLabel ?? e.before ?? '' : '',
    after: isOrg(e) ? e.afterLabel ?? e.after ?? '' : '',
    detail: describeAudit(e, nameOf),
  }));
}

/** Distinct action types present in the log — for the filter dropdown. */
export const auditActions = (log: readonly AuditEvent[]): readonly string[] =>
  [...new Set(log.map(actionOf))];

export type { User };
