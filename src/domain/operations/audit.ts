/**
 * Audit selectors — Phase 6B (projection over wda.identity.audit.v1, no new
 * storage). Composable filters + a human label per event + CSV-ready export
 * shape. Performance: filtering is lazy and callers render the latest N first.
 */
import type { AuditEvent } from '../../app/identity/identityBackend';
import type { User } from '../identity';

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

const targetOf = (e: AuditEvent): string | undefined =>
  e.type === 'USER_CREATED' ? e.user.id : 'userId' in e ? e.userId : undefined;

export function filterAudit(
  log: readonly AuditEvent[],
  filter: AuditFilter,
  nameOf: (id: string) => string,
): readonly AuditEvent[] {
  return log.filter(e => {
    if (filter.actorId && e.actorId !== filter.actorId) return false;
    if (filter.action && e.type !== filter.action) return false;
    if (filter.targetId && targetOf(e) !== filter.targetId) return false;
    if (filter.from && e.at < filter.from) return false;
    if (filter.to && e.at > filter.to) return false;
    if (filter.text) {
      const hay = `${describeAudit(e, nameOf)} ${e.type}`.toLowerCase();
      if (!hay.includes(filter.text.toLowerCase())) return false;
    }
    return true;
  });
}

/** Newest-first, capped — the view renders the latest N (perf). */
export const latestAudit = (log: readonly AuditEvent[], n = 100): readonly AuditEvent[] =>
  [...log].sort((a, b) => b.at - a.at).slice(0, n);

/** CSV-ready rows (export backend consumes this — no new logic later). */
export interface AuditRow { readonly at: number; readonly actor: string; readonly action: string; readonly detail: string; }
export function auditExportRows(log: readonly AuditEvent[], nameOf: (id: string) => string): readonly AuditRow[] {
  return [...log].sort((a, b) => b.at - a.at).map(e => ({
    at: e.at, actor: nameOf(e.actorId), action: e.type, detail: describeAudit(e, nameOf),
  }));
}

/** Distinct action types present in the log — for the filter dropdown. */
export const auditActions = (log: readonly AuditEvent[]): readonly string[] =>
  [...new Set(log.map(e => e.type))];

export type { User };
