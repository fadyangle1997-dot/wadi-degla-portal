/**
 * Organization panel — the Admin's answer to "how is the org actually wired?"
 *
 * DESIGN: a tree, not a form. An administrator's first need is to SEE the
 * hierarchy (Area → Branches → the people in each); editing is secondary and
 * lives inline where the thing being edited already sits. That is why there is
 * no separate "create/edit" page: every action happens next to its subject, so
 * the admin never loses their place in the structure.
 *
 * REUSE ONLY: every number and relationship here is derived from existing
 * sources — `orgStore` for Area/Branch records, `identityStore` for people,
 * and the pure selectors in `domain/organization`. No new data, no new events,
 * no duplicated state.
 */
import React, { useMemo, useState } from 'react';
import { Building2, MapPin, Users2, Plus, Archive, ArchiveRestore, Pencil, Check, X } from 'lucide-react';
import { useOrganization, orgStore } from '../../app/organization/orgStore';
import { useIdentity } from '../../app/identity/identityStore';
import { branchesOfArea, usersOfBranch } from '../../domain/organization';
import { Card, Eyebrow, StatusBadge, Button, EmptyState, ConfirmDialog } from '../../ui/primitives';
import { useLang, t } from '../../app/i18n';

export const OrganizationPanel: React.FC = () => {
  const lang = useLang();
  const { areas, branches } = useOrganization();
  const { users } = useIdentity();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);

  // Managers eligible to run an area. Derived from the live roster — never a
  // hardcoded list, so a newly-created area manager is immediately assignable.
  const areaManagers = useMemo(() => users.filter(u => u.roleId === 'area_manager'), [users]);
  const unassigned = useMemo(() => branches.filter(b => !b.areaId), [branches]);

  const nameOf = (id: string | null) => (id ? users.find(u => u.id === id)?.name ?? id : null);

  return (
    <section aria-label={t('og.title', lang)}>
      <div className="row items-center gap-3 mb-2">
        <h2 className="t-h2 m-0">{t('og.title', lang)}</h2>
        <div className="grow" />
        {creating ? (
          <span className="row gap-2 items-center">
            <input className="t-body c-tx0" autoFocus value={draft} onChange={e => setDraft(e.target.value)}
              placeholder={t('og.areaname', lang)} aria-label={t('og.newareaname', lang)}
              style={{ padding: 'var(--sp-2) var(--sp-3)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }} />
            <button className="pill" aria-label={t('og.confirm', lang)}
              onClick={() => { if (draft.trim()) orgStore.createArea(draft.trim()); setDraft(''); setCreating(false); }}>
              <Check size={13} />
            </button>
            <button className="pill" aria-label={t('og.cancel', lang)} onClick={() => { setDraft(''); setCreating(false); }}>
              <X size={13} />
            </button>
          </span>
        ) : (
          <Button variant="ghost" onClick={() => setCreating(true)}><Plus size={16} /> {t('og.newarea', lang)}</Button>
        )}
      </div>
      <p className="t-sm measure mb-6">
        {t('og.intro', lang)}
      </p>

      <div className="stack gap-4">
        {areas.map(area => {
          const kids = branchesOfArea(area.id, branches);
          const people = kids.reduce((n, b) => n + usersOfBranch(b.id, 'employee', users).length, 0);
          const archived = area.status === 'inactive';

          return (
            <Card key={area.id} tone={archived ? undefined : 'raised'} pad={5}>
              <div className="row items-center gap-3 wrap">
                <Eyebrow icon={<MapPin size={13} />}>{t('og.area', lang)}</Eyebrow>
                {renaming === area.id ? (
                  <>
                    <input className="t-body c-tx0" autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                      aria-label={`${t('og.newnamefor', lang)} ${area.name}`}
                      style={{ padding: 'var(--sp-1) var(--sp-3)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }} />
                    <button className="pill" aria-label={t('og.savename', lang)}
                      onClick={() => { if (draft.trim()) orgStore.renameArea(area.id, draft.trim()); setRenaming(null); }}>
                      <Check size={13} />
                    </button>
                    <button className="pill" aria-label={t('og.cancel', lang)} onClick={() => setRenaming(null)}><X size={13} /></button>
                  </>
                ) : (
                  <>
                    <span className="t-title" style={{ color: archived ? 'var(--tx3)' : 'var(--tx0)' }}>{area.name}</span>
                    <button className="pill" aria-label={`${t('og.renameaera', lang)} ${area.name}`}
                      onClick={() => { setDraft(area.name); setRenaming(area.id); }}><Pencil size={13} /></button>
                  </>
                )}
                <div className="grow" />
                {archived && <StatusBadge tone="risk">{t('og.archived', lang)}</StatusBadge>}
                <button className="pill" onClick={() => (archived ? orgStore.setAreaStatus(area.id, 'active') : setArchiving(area.id))}>
                  {archived ? <><ArchiveRestore size={13} /> {t('og.restore', lang)}</> : <><Archive size={13} /> {t('og.archive', lang)}</>}
                </button>
              </div>

              {/* Area manager — the one assignment that changes who sees what */}
              <div className="row items-center gap-3 mt-4 wrap">
                <span className="t-label c-tx3">{t('og.areamanager', lang)}</span>
                <select className="t-sm c-tx0" value={area.managerId ?? ''}
                  aria-label={`${t('og.mgrofarea', lang)} ${area.name}`}
                  onChange={e => orgStore.assignAreaManager(area.id, e.target.value || null)}
                  style={{ padding: 'var(--sp-1) var(--sp-3)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                  <option value="">{t('og.unassigned', lang)}</option>
                  {areaManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {archived && area.managerId && (
                  <span className="t-sm c-risk">{t('og.archivednote', lang)}</span>
                )}
              </div>

              {/* Branches inside this area */}
              <div className="stack mt-4 gap-2">
                <span className="t-label c-tx3">
                  {kids.length} {t('og.branches', lang)} · {people} {t('og.staff', lang)}
                </span>
                {kids.map(b => {
                  const trainers = usersOfBranch(b.id, 'trainer', users);
                  const staff = usersOfBranch(b.id, 'employee', users);
                  return (
                    <div key={b.id} className="row items-center gap-3 wrap" style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                      <Building2 size={13} className="c-tx3 no-shrink" />
                      <span className="t-body c-tx0">{b.name}</span>
                      <span className="t-label c-tx3">
                        {nameOf(b.branchManagerId) ?? t('og.nomanager', lang)} · {trainers.length} {t('og.trainers', lang)} · {staff.length} {t('og.staff', lang)}
                      </span>
                      <div className="grow" />
                      <select className="t-sm c-tx1" value={b.areaId ?? ''}
                        aria-label={`${t('og.areaofbranch', lang)} ${b.name}`}
                        onChange={e => orgStore.transferBranch(b.id, e.target.value || null)}
                        style={{ padding: 'var(--sp-1) var(--sp-2)', background: 'var(--s-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                        <option value="">{t('og.noarea', lang)}</option>
                        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  );
                })}
                {kids.length === 0 && (
                  <span className="t-sm c-tx3">{t('og.nobranches', lang)}</span>
                )}
              </div>
            </Card>
          );
        })}

        {/* Unassigned branches — surfaced, never hidden: a branch with no area
            is invisible to every area manager, which is an operational gap the
            admin should see immediately rather than discover later. */}
        {unassigned.length > 0 && (
          <Card pad={5}>
            <Eyebrow icon={<Users2 size={13} />}>{t('og.orphans', lang)}</Eyebrow>
            <p className="t-sm c-tx2" style={{ margin: 'var(--sp-2) 0 var(--sp-3)' }}>
              {t('og.orphanshint', lang)}
            </p>
            <div className="stack gap-2">
              {unassigned.map(b => (
                <div key={b.id} className="row items-center gap-3" style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--s-1)', border: '1px solid var(--attn-line)', borderRadius: 'var(--r-sm)' }}>
                  <Building2 size={13} className="c-attn no-shrink" />
                  <span className="t-body">{b.name}</span>
                  <div className="grow" />
                  <select className="t-sm c-tx1" value="" aria-label={`${t('og.assignarea', lang)} ${b.name}`}
                    onChange={e => e.target.value && orgStore.transferBranch(b.id, e.target.value)}
                    style={{ padding: 'var(--sp-1) var(--sp-2)', background: 'var(--s-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                    <option value="">{t('og.pickarea', lang)}</option>
                    {areas.filter(a => a.status === 'active').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Card>
        )}

        {areas.length === 0 && (
          <EmptyState title={t('og.noareas', lang)} body={t('og.noareasbody', lang)} />
        )}
      </div>
      <ConfirmDialog open={archiving !== null} danger
        title={t('og.ask.archive', lang)} body={t('og.ask.archivebody', lang)} confirmLabel={t('og.archive', lang)}
        onConfirm={() => { if (archiving) orgStore.setAreaStatus(archiving, 'inactive'); setArchiving(null); }}
        onCancel={() => setArchiving(null)} />
    </section>
  );
};
