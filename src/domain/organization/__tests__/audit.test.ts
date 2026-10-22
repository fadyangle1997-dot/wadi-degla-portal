// @vitest-environment jsdom
/**
 * Governance events: every organisation change that moves who sees what is a
 * structured, attributable record — never «organisation updated». These pin
 * the shape (server-ready), the before/after, the names as they were, the ids
 * a change touches, and that the store refuses an unattributed change.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { orgEventFor, describeOrgEvent, type OrgSnapshot } from '../audit';
import { AREA_SEED, BRANCH_SEED } from '../../../app/organization/orgSeed';
import { orgStore } from '../../../app/organization/orgStore';
import { identityStore } from '../../../app/identity/identityStore';
import { filterAudit, auditExportRows, auditActions, describeAudit } from '../../operations/audit';

const seed: OrgSnapshot = { areas: AREA_SEED, branches: BRANCH_SEED };
const ctx = { id: 'ev-1', at: 1_000, actorId: 'admin', nameOf: (id: string) => ({ 'area.hoda': 'Hoda Area', 'manager.nabil': 'Nabil Sherif' } as Record<string, string>)[id] ?? id };
const moveMaadi = (to: string | null): OrgSnapshot => ({ ...seed, branches: seed.branches.map(b => b.id === 'maadi' ? { ...b, areaId: to } : b) });

describe('orgEventFor — one structured event per change', () => {
  it('a branch moved between areas: before, after, names, and both managers touched', () => {
    const e = orgEventFor(seed, moveMaadi('cairo-2'), ctx)!;
    expect(e).toMatchObject({
      id: 'ev-1', schema: 1, at: 1_000, actorId: 'admin', action: 'org.branch_moved',
      target: { kind: 'branch', id: 'maadi', name: 'Maadi' }, field: 'areaId',
      before: 'cairo-1', after: 'cairo-2', beforeLabel: 'Cairo Area 1', afterLabel: 'Cairo Area 2',
    });
    expect(e.refs.areaIds).toEqual(['cairo-1', 'cairo-2']);
    expect(e.refs.branchIds).toEqual(['maadi']);
    // Hoda manages Cairo Area 1 and loses the branch; Nabil manages the branch.
    expect(e.refs.userIds).toEqual(expect.arrayContaining(['area.hoda', 'manager.nabil']));
    expect(describeOrgEvent(e, ctx.nameOf)).toBe('admin نقل فرع Maadi من Cairo Area 1 لـCairo Area 2');
    // The reader's language: the same fact in English.
    expect(describeOrgEvent(e, ctx.nameOf, 'en')).toBe('admin moved branch Maadi from Cairo Area 1 to Cairo Area 2');
  });

  it('a branch left with no area says so', () => {
    const e = orgEventFor(seed, moveMaadi(null), ctx)!;
    expect(e.after).toBeNull();
    expect(describeOrgEvent(e, ctx.nameOf)).toBe('admin خرّج فرع Maadi من Cairo Area 1 — ومبقاش تابع لأي منطقة');
  });

  it('an area manager changed: the people before and after, by name as they were', () => {
    const next = { ...seed, areas: seed.areas.map(a => a.id === 'cairo-1' ? { ...a, managerId: null } : a) };
    const e = orgEventFor(seed, next, ctx)!;
    expect(e).toMatchObject({ action: 'org.area_manager_changed', field: 'managerId', before: 'area.hoda', after: null, beforeLabel: 'Hoda Area' });
    expect(e.refs.branchIds).toEqual(['maadi', 'nakhil', 'sheraton']);
    expect(e.refs.userIds).toEqual(['area.hoda']);
  });

  it('archive and restore are two actions, each listing the branches whose visibility moved', () => {
    const archived = { ...seed, areas: seed.areas.map(a => a.id === 'cairo-2' ? { ...a, status: 'inactive' as const } : a) };
    const a = orgEventFor(seed, archived, ctx)!;
    expect(a.action).toBe('org.area_archived');
    expect(a.refs.branchIds).toEqual(['lotus', 'october-1', 'october-2']);
    expect(orgEventFor(archived, seed, ctx)!.action).toBe('org.area_restored');
  });

  it('a rename keeps the old name as the target, so history reads as it happened', () => {
    const next = { ...seed, areas: seed.areas.map(a => a.id === 'delta' ? { ...a, name: 'Nile Delta Area' } : a) };
    const e = orgEventFor(seed, next, ctx)!;
    expect(e).toMatchObject({ action: 'org.area_renamed', target: { name: 'Delta Area' }, before: 'Delta Area', after: 'Nile Delta Area' });
  });

  it('a created and a deleted area are recorded with their names', () => {
    const created = { ...seed, areas: [...seed.areas, { id: 'giza', name: 'Giza Area', status: 'active' as const, managerId: null }] };
    expect(orgEventFor(seed, created, ctx)).toMatchObject({ action: 'org.area_created', after: 'Giza Area' });
    expect(orgEventFor(created, seed, ctx)).toMatchObject({ action: 'org.area_deleted', before: 'Giza Area' });
  });

  it('no change is no event — and nothing vague ever exists to log', () => {
    expect(orgEventFor(seed, seed, ctx)).toBeNull();
    const actions = [
      orgEventFor(seed, moveMaadi('cairo-2'), ctx)!.action,
      orgEventFor(seed, { ...seed, areas: seed.areas.map(a => a.id === 'cairo-1' ? { ...a, managerId: null } : a) }, ctx)!.action,
    ];
    for (const a of actions) expect(a).toMatch(/^org\.(area|branch)_[a-z_]+$/);
  });
});

describe('orgStore — attributed, persisted, readable in the audit log', () => {
  beforeEach(() => { localStorage.clear(); orgStore.reset(); identityStore.signOut(); });

  it('refuses a change nobody is signed in to make, and changes nothing', () => {
    expect(() => orgStore.transferBranch('maadi', 'cairo-2')).toThrow(/attributable/);
    expect(orgStore.get().branches.find(b => b.id === 'maadi')!.areaId).toBe('cairo-1');
    expect(orgStore.auditLog()).toEqual([]);
  });

  it('records one event per change, by the signed-in admin, and persists it', () => {
    identityStore.signIn('admin');
    orgStore.transferBranch('maadi', 'cairo-2');
    orgStore.assignAreaManager('cairo-2', 'area.hoda');
    orgStore.transferBranch('maadi', 'cairo-2');   // no-op: no event
    const log = orgStore.auditLog();
    expect(log.map(e => e.action)).toEqual(['org.branch_moved', 'org.area_manager_changed']);
    expect(log.every(e => e.actorId === 'admin' && e.schema === 1)).toBe(true);
    expect(new Set(log.map(e => e.id)).size).toBe(2);
    expect(JSON.parse(localStorage.getItem('wda.org.audit.v1')!)).toHaveLength(2);
  });

  it('deleting an area records each consequence, not one vague event', () => {
    identityStore.signIn('admin');
    orgStore.deleteArea('delta');
    expect(orgStore.auditLog().map(e => e.action)).toEqual(['org.branch_moved', 'org.branch_moved', 'org.area_deleted']);
  });

  it('the audit selectors read governance events beside account events', () => {
    identityStore.signIn('admin');
    orgStore.transferBranch('maadi', 'cairo-2');
    const log = [...identityStore.auditLog(), ...orgStore.auditLog()];
    const nameOf = (id: string) => identityStore.userById(id)?.name ?? id;
    expect(auditActions(log)).toContain('org.branch_moved');
    expect(filterAudit(log, { action: 'org.branch_moved' }, nameOf)).toHaveLength(1);
    // Filtering by an affected entity finds the event: the branch, either area, a manager.
    for (const id of ['maadi', 'cairo-1', 'cairo-2', 'area.hoda']) expect(filterAudit(log, { targetId: id }, nameOf), id).toHaveLength(1);
    const row = auditExportRows(log, nameOf).find(r => r.action === 'org.branch_moved')!;
    expect(row).toMatchObject({ target: 'branch:maadi (Maadi)', before: 'Cairo Area 1', after: 'Cairo Area 2' });
    expect(describeAudit(log.find(e => 'action' in e)!, nameOf)).toContain('نقل فرع Maadi من Cairo Area 1 لـCairo Area 2');
  });
});
