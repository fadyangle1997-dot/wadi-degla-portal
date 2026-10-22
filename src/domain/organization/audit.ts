/**
 * Governance events — every organisation change that moves who sees what,
 * recorded as a structured fact: who did it, what they did, to which area or
 * branch, the value before and after, when, and every entity whose visibility
 * the change touches.
 *
 * Never a vague "organisation updated": an auditor reading one row must be
 * able to say what changed without opening anything else, so names are
 * captured as they were at the time (an area renamed later must not rewrite
 * history).
 *
 * The shape is a server row, not a log line: a stable id, a schema version,
 * typed columns, and the touched ids as arrays a server can index. Today the
 * prototype keeps them in localStorage beside the roster (orgStore); a server
 * adapter persists the same objects unchanged.
 */
import type { Area, Branch } from './index';

export type OrgAction =
  | 'org.area_created'
  | 'org.area_deleted'
  | 'org.area_renamed'
  | 'org.area_archived'
  | 'org.area_restored'
  | 'org.area_manager_changed'
  | 'org.branch_moved'
  | 'org.branch_manager_changed'
  | 'org.branch_status_changed';

/** The field a governance event changed, so before/after are typed by it. */
export type OrgField = 'record' | 'name' | 'status' | 'managerId' | 'areaId' | 'branchManagerId';

export interface OrgAuditEvent {
  /** Unique and stable — the server's primary key. */
  readonly id: string;
  /** Bumped when the shape changes, so a server can migrate old rows. */
  readonly schema: 1;
  readonly at: number;
  readonly actorId: string;
  readonly action: OrgAction;
  readonly target: { readonly kind: 'area' | 'branch'; readonly id: string; readonly name: string };
  readonly field: OrgField;
  /** Previous value (an id, a name or a status); null when there was none. */
  readonly before: string | null;
  readonly after: string | null;
  /** Human names of before/after at the time, when they are ids (an area, a person). */
  readonly beforeLabel: string | null;
  readonly afterLabel: string | null;
  /** Every entity whose visibility this change touches. */
  readonly refs: {
    readonly areaIds: readonly string[];
    readonly branchIds: readonly string[];
    readonly userIds: readonly string[];
  };
}

const uniq = (xs: readonly (string | null | undefined)[]): string[] => [...new Set(xs.filter((x): x is string => !!x))];

export interface OrgSnapshot { readonly areas: readonly Area[]; readonly branches: readonly Branch[] }

/** Everything an event needs beyond the change itself. */
export interface EventContext {
  readonly id: string;
  readonly at: number;
  readonly actorId: string;
  readonly nameOf: (userId: string) => string;
}

type Draft = Omit<OrgAuditEvent, 'id' | 'schema' | 'at' | 'actorId'>;
const stamp = (d: Draft, c: EventContext): OrgAuditEvent => ({ id: c.id, schema: 1, at: c.at, actorId: c.actorId, ...d });

/**
 * The event for one change, computed from the roster before and after it.
 * Returns null when nothing changed — a no-op is not a governance event.
 */
export function orgEventFor(prev: OrgSnapshot, next: OrgSnapshot, c: EventContext): OrgAuditEvent | null {
  const areaName = (s: OrgSnapshot, id: string | null) => (id ? s.areas.find(a => a.id === id)?.name ?? id : null);
  const person = (id: string | null) => (id ? c.nameOf(id) : null);
  const branchesIn = (areaId: string) => prev.branches.filter(b => b.areaId === areaId).map(b => b.id);

  for (const a of next.areas) {
    const was = prev.areas.find(x => x.id === a.id);
    const area = { kind: 'area' as const, id: a.id, name: a.name };
    if (!was) {
      return stamp({ action: 'org.area_created', target: area, field: 'record', before: null, after: a.name,
        beforeLabel: null, afterLabel: a.name, refs: { areaIds: [a.id], branchIds: [], userIds: uniq([a.managerId]) } }, c);
    }
    if (was.name !== a.name) {
      return stamp({ action: 'org.area_renamed', target: { ...area, name: was.name }, field: 'name', before: was.name, after: a.name,
        beforeLabel: was.name, afterLabel: a.name, refs: { areaIds: [a.id], branchIds: branchesIn(a.id), userIds: uniq([a.managerId]) } }, c);
    }
    if (was.status !== a.status) {
      return stamp({ action: a.status === 'inactive' ? 'org.area_archived' : 'org.area_restored', target: area, field: 'status',
        before: was.status, after: a.status, beforeLabel: null, afterLabel: null,
        // Archiving takes the area's branches out of its manager's scope; restoring gives them back.
        refs: { areaIds: [a.id], branchIds: branchesIn(a.id), userIds: uniq([a.managerId]) } }, c);
    }
    if (was.managerId !== a.managerId) {
      return stamp({ action: 'org.area_manager_changed', target: area, field: 'managerId', before: was.managerId, after: a.managerId,
        beforeLabel: person(was.managerId), afterLabel: person(a.managerId),
        refs: { areaIds: [a.id], branchIds: branchesIn(a.id), userIds: uniq([was.managerId, a.managerId]) } }, c);
    }
  }

  for (const a of prev.areas) {
    if (next.areas.some(x => x.id === a.id)) continue;
    return stamp({ action: 'org.area_deleted', target: { kind: 'area', id: a.id, name: a.name }, field: 'record', before: a.name, after: null,
      beforeLabel: a.name, afterLabel: null, refs: { areaIds: [a.id], branchIds: branchesIn(a.id), userIds: uniq([a.managerId]) } }, c);
  }

  for (const b of next.branches) {
    const was = prev.branches.find(x => x.id === b.id);
    if (!was) continue;
    const branch = { kind: 'branch' as const, id: b.id, name: b.name };
    if (was.areaId !== b.areaId) {
      const managers = [was.areaId, b.areaId].map(id => prev.areas.find(a => a.id === id)?.managerId);
      return stamp({ action: 'org.branch_moved', target: branch, field: 'areaId', before: was.areaId, after: b.areaId,
        beforeLabel: areaName(prev, was.areaId), afterLabel: areaName(next, b.areaId),
        // The managers of both areas gain or lose this branch, and so does its own manager's chain.
        refs: { areaIds: uniq([was.areaId, b.areaId]), branchIds: [b.id], userIds: uniq([...managers, b.branchManagerId]) } }, c);
    }
    if (was.branchManagerId !== b.branchManagerId) {
      return stamp({ action: 'org.branch_manager_changed', target: branch, field: 'branchManagerId',
        before: was.branchManagerId, after: b.branchManagerId,
        beforeLabel: person(was.branchManagerId), afterLabel: person(b.branchManagerId),
        refs: { areaIds: uniq([b.areaId]), branchIds: [b.id], userIds: uniq([was.branchManagerId, b.branchManagerId]) } }, c);
    }
    if (was.status !== b.status) {
      return stamp({ action: 'org.branch_status_changed', target: branch, field: 'status', before: was.status, after: b.status,
        beforeLabel: null, afterLabel: null,
        refs: { areaIds: uniq([b.areaId]), branchIds: [b.id], userIds: uniq([b.branchManagerId]) } }, c);
    }
  }
  return null;
}

/** The language an audit sentence is written in: the reader's interface language. */
export type AuditLang = 'ar' | 'en';

const BRANCH_STATUS: Record<AuditLang, Record<string, string>> = {
  ar: { active: 'شغّال', inactive: 'متوقّف' },
  en: { active: 'active', inactive: 'inactive' },
};

/**
 * One governance event as a sentence an auditor can read, in their language.
 * A change from or to nobody is said as what happened («عيّن», «شال»), not
 * as «from nobody to X»; a status is said in words, never as its stored value.
 */
export function describeOrgEvent(e: OrgAuditEvent, nameOf: (id: string) => string, lang: AuditLang = 'ar'): string {
  const actor = nameOf(e.actorId);
  const n = e.target.name;
  const b = e.beforeLabel, a = e.afterLabel;
  const ar = lang === 'ar';
  switch (e.action) {
    case 'org.area_created': return ar ? `${actor} عمل منطقة ${n}` : `${actor} created area ${n}`;
    case 'org.area_deleted': return ar ? `${actor} مسح منطقة ${n}` : `${actor} deleted area ${n}`;
    case 'org.area_renamed': return ar ? `${actor} غيّر اسم منطقة «${e.before}» لـ«${e.after}»` : `${actor} renamed area “${e.before}” to “${e.after}”`;
    case 'org.area_archived': return ar ? `${actor} أرشف منطقة ${n}` : `${actor} archived area ${n}`;
    case 'org.area_restored': return ar ? `${actor} رجّع منطقة ${n}` : `${actor} restored area ${n}`;
    case 'org.area_manager_changed':
    case 'org.branch_manager_changed': {
      const place = e.action === 'org.area_manager_changed' ? (ar ? `منطقة ${n}` : `area ${n}`) : (ar ? `فرع ${n}` : `branch ${n}`);
      if (!b && a) return ar ? `${actor} عيّن ${a} مدير ${place}` : `${actor} made ${a} manager of ${place}`;
      if (b && !a) return ar ? `${actor} شال ${b} من إدارة ${place}` : `${actor} removed ${b} as manager of ${place}`;
      return ar ? `${actor} غيّر مدير ${place} من ${b} لـ${a}` : `${actor} changed the manager of ${place} from ${b} to ${a}`;
    }
    case 'org.branch_moved':
      if (!b && a) return ar ? `${actor} ضم فرع ${n} لـ${a}` : `${actor} added branch ${n} to ${a}`;
      if (b && !a) return ar ? `${actor} خرّج فرع ${n} من ${b} — ومبقاش تابع لأي منطقة` : `${actor} took branch ${n} out of ${b} — it belongs to no area`;
      return ar ? `${actor} نقل فرع ${n} من ${b} لـ${a}` : `${actor} moved branch ${n} from ${b} to ${a}`;
    case 'org.branch_status_changed': {
      const s = (v: string | null) => (v && BRANCH_STATUS[lang][v]) ?? v ?? '';
      return ar ? `${actor} غيّر حالة فرع ${n} من ${s(e.before)} لـ${s(e.after)}` : `${actor} changed branch ${n} from ${s(e.before)} to ${s(e.after)}`;
    }
  }
}
