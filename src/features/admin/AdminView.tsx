/**
 * AdminView — user administration.
 *
 * One ledger of every active account (search, filters, sort) and, per row,
 * one management panel that holds everything about that account in three
 * sections: its details, its role and assignment, and the account actions.
 * The row is the only way in and the panel's × (or Escape) the way back, so a
 * list of a hundred people never carries a hundred sets of controls.
 *
 * Every change is permission-gated via can(); every consequential one is said
 * back before it is recorded; the signed-in admin cannot lock themself out.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserPlus, Check, KeyRound, Power, Archive } from 'lucide-react';
import { useIdentity, identityStore, useCan } from '../../app/identity/identityStore';
import { useOrganization } from '../../app/organization/orgStore';
import { can, type User } from '../../domain/identity';
import { usersWhoCan } from '../../domain/identity/scope';
import { branchNameOf } from '../../domain/organization';
import {
  Button, EmptyState, ConfirmDialog, Toast, SectionHeader, DataTable, Status, Initials, CloseButton, FormField,
  useModal, useExitFlow, type Column,
} from '../../ui/primitives';
import { WIDTH } from '../../ui/designSystem';
import { useOverlayParam } from '../../app/overlayHistory';
import { useLang, t, tf, roleName as roleDisplayName, type Key, type Lang } from '../../app/i18n';

type Roles = ReturnType<typeof useIdentity>['roles'];
type Branches = ReturnType<typeof useOrganization>['branches'];
type Notify = (msg: string, tone?: 'ok' | 'error') => void;

/** A deliberately plain check: it catches the typo, not every RFC case. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Row {
  u: User;
  role: string;
  branch: string;
  assigned: string;
  disabled: boolean;
  learner: boolean;
  staff: boolean;
}

export const AdminView: React.FC<{ onExit: () => void; openUserId?: string | null }> = ({ onExit, openUserId }) => {
  const lang = useLang();
  const { users, roles } = useIdentity();
  const { branches } = useOrganization();
  const canDo = useCan();
  // Both panels live in the URL (#/admin?user=… / ?create=user): Back closes
  // the panel before it leaves the page, and a link can open an account.
  const [createParam, openCreate, closeCreate] = useOverlayParam('create');
  const creating = createParam === 'user';
  const [openId, openUser, closeUser] = useOverlayParam('user');
  // An inbox fix that names a person arrives with that person's id.
  useEffect(() => { if (openUserId) openUser(openUserId); }, [openUserId, openUser]);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const notify: Notify = (msg, tone = 'ok') => {
    clearTimeout(timer.current);
    setToast({ msg, tone });
    timer.current = setTimeout(() => setToast(null), 2800);
  };

  const active = useMemo(() => users.filter(u => u.status !== 'archived'), [users]);
  const archived = useMemo(() => users.filter(u => u.status === 'archived'), [users]);

  const rows: Row[] = useMemo(() => {
    const nameOf = (id?: string) => (id ? users.find(u => u.id === id)?.name : undefined);
    return active.map(u => ({
      u,
      role: roleDisplayName(roles.find(r => r.id === u.roleId), lang) ?? u.roleId,
      branch: u.branchId ? branchNameOf(u.branchId, branches) : t('us.nobranch', lang),
      assigned: nameOf(u.trainerId) ?? nameOf(u.managerId) ?? t('us.assignnone', lang),
      disabled: u.status === 'disabled',
      learner: can(u, roles, 'academy.learn'),
      staff: can(u, roles, 'training.review') || can(u, roles, 'reports.view') || can(u, roles, 'operations.view'),
    }));
  }, [active, users, roles, branches, lang]);

  if (!canDo('users.view')) {
    return (
      <div className="row min-h-screen items-center justify-center">
        <EmptyState title={t('ad.noaccess', lang)} body={t('us.noaccess', lang)} action={<Button onClick={onExit}>{t('ad.back', lang)}</Button>} />
      </div>
    );
  }

  const columns: Column<Row>[] = [
    {
      id: 'name', header: t('us.col.user', lang), sortValue: r => r.u.name,
      cell: r => (
        <span className="row items-center gap-3">
          <Initials name={r.u.name} />
          <span className="stack">
            <span className="c-tx0">{r.u.name}</span>
            {r.u.email && <span className="t-label">{r.u.email}</span>}
          </span>
        </span>
      ),
    },
    { id: 'role', header: t('us.role', lang), sortValue: r => r.role, cell: r => <span className="c-tx1">{r.role}</span> },
    { id: 'branch', header: t('us.branch', lang), sortValue: r => r.branch, cell: r => <span className="c-tx1">{r.branch}</span> },
    { id: 'assigned', header: t('us.col.assigned', lang), sortValue: r => r.assigned, cell: r => <span className="c-tx1">{r.assigned}</span> },
    {
      id: 'status', header: t('us.col.status', lang), sortValue: r => (r.disabled ? 1 : 0),
      cell: r => <Status tone={r.disabled ? 'attn' : 'ready'}>{r.disabled ? t('us.disabled', lang) : t('us.active', lang)}</Status>,
    },
  ];

  const open = openId ? active.find(u => u.id === openId) : undefined;

  return (
    <main style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: '0 var(--sp-5) var(--sp-9)' }}>
      <section aria-labelledby="us-list">
        <SectionHeader id="us-list" title={t('us.list', lang)} count={active.length} description={t('us.listsub', lang)}
          action={canDo('users.create')
            ? <Button onClick={() => openCreate('user')}><UserPlus size={16} aria-hidden /> {t('us.adduser', lang)}</Button>
            : undefined} />
        <div className="mt-4">
          <DataTable caption={t('us.list', lang)} columns={columns} rows={rows} rowKey={r => r.u.id}
            onOpen={r => openUser(r.u.id)}
            rowTone={r => (r.disabled ? 'attn' : undefined)}
            initialSort={{ id: 'name', dir: 'asc' }}
            search={{ placeholder: t('us.search', lang), match: (r, q) => `${r.u.name} ${r.u.email ?? ''} ${r.branch}`.toLowerCase().includes(q) }}
            filters={[
              { id: 'learners', label: t('us.f.learners', lang), test: r => r.learner },
              { id: 'staff', label: t('us.f.staff', lang), test: r => r.staff },
              { id: 'disabled', label: t('us.f.disabled', lang), test: r => r.disabled },
            ]} />
        </div>
      </section>

      {archived.length > 0 && (
        <details className="region">
          <summary className="t-label">{t('us.archivedlist', lang)} ({archived.length}) {t('us.archivenote', lang)}</summary>
          <ul className="ruled-list mt-3">
            {archived.map(u => <li key={u.id}>{u.name} · {roleDisplayName(roles.find(r => r.id === u.roleId), lang)}</li>)}
          </ul>
        </details>
      )}

      {creating && (
        <CreateUserDialog roles={roles} branches={branches}
          onClose={closeCreate}
          onCreated={name => { closeCreate(); notify(tf('us.created', { name }, lang)); }}
          onFailed={() => notify(t('err.save', lang), 'error')} />
      )}
      {open && (
        <UserPanel u={open} roles={roles} active={active} branches={branches} canDo={canDo} notify={notify}
          onClose={closeUser} />
      )}
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </main>
  );
};

/* ---------------- details form, shared by «new user» and the panel ---------------- */
interface Draft { name: string; email: string; branchId: string }
type Errors = Partial<Record<keyof Draft, string>>;

const validate = (d: Draft, lang: Lang): Errors => {
  const e: Errors = {};
  if (!d.name.trim()) e.name = t('us.err.name', lang);
  if (d.email.trim() && !EMAIL.test(d.email.trim())) e.email = t('us.err.email', lang);
  return e;
};

/** Focus the first field that failed, so the error is where the eye lands. */
const focusFirstError = (prefix: string, errors: Errors) => {
  const first = (['name', 'email'] as const).find(k => errors[k]);
  if (first) document.getElementById(`${prefix}-${first}`)?.focus();
};

const DetailsFields: React.FC<{
  idPrefix: string; draft: Draft; errors: Errors; branches: Branches; onChange: (d: Draft) => void;
}> = ({ idPrefix, draft, errors, branches, onChange }) => {
  const lang = useLang();
  return (
    <div className="form-grid">
      <FormField id={`${idPrefix}-name`} label={t('us.name', lang)} required error={errors.name}>
        {p => <input {...p} className="field" autoComplete="off" value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} />}
      </FormField>
      <FormField id={`${idPrefix}-email`} label={t('us.email', lang)} error={errors.email}>
        {p => <input {...p} type="email" dir="auto" className="field" autoComplete="off" value={draft.email} onChange={e => onChange({ ...draft, email: e.target.value })} />}
      </FormField>
      <FormField id={`${idPrefix}-branch`} label={t('us.branch', lang)}>
        {p => (
          <select {...p} className="field" value={draft.branchId} onChange={e => onChange({ ...draft, branchId: e.target.value })}>
            <option value="">{t('us.nobranch', lang)}</option>
            {branches.filter(b => b.status === 'active' || b.id === draft.branchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            {/* An id the branch book no longer knows is kept, not silently dropped. */}
            {draft.branchId && !branches.some(b => b.id === draft.branchId) && <option value={draft.branchId}>{draft.branchId}</option>}
          </select>
        )}
      </FormField>
    </div>
  );
};

/* ---------------- new user ---------------- */
const CreateUserDialog: React.FC<{
  roles: Roles; branches: Branches;
  onClose: () => void; onCreated: (name: string) => void; onFailed: () => void;
}> = ({ roles, branches, onClose, onCreated, onFailed }) => {
  const lang = useLang();
  const [draft, setDraft] = useState<Draft>({ name: '', email: '', branchId: '' });
  const [roleId, setRoleId] = useState('employee');
  const [errors, setErrors] = useState<Errors>({});
  const dirty = !!(draft.name.trim() || draft.email.trim() || draft.branchId);
  // Every way out asks while something is typed: ×, Escape, the scrim,
  // Cancel, and the browser's or phone's Back (through leaveGuard).
  const { leave, dialog } = useExitFlow(dirty, {
    title: t('us.leaveask', lang), body: t('us.leavebody', lang), leaveLabel: t('us.discard', lang), stayLabel: t('us.keepediting', lang),
  });
  const close = () => leave(onClose);
  const ref = useModal<HTMLDivElement>(close, () => document.getElementById('nu-name'), true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(draft, lang);
    setErrors(found);
    if (Object.keys(found).length) { focusFirstError('nu', found); return; }
    try {
      identityStore.createUser({
        name: draft.name.trim(), email: draft.email.trim() || undefined, branchId: draft.branchId || undefined, roleId,
      });
    } catch { onFailed(); return; }
    onCreated(draft.name.trim());
  };

  return (
    <div className="dialog-scrim" onClick={close}>
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-labelledby="nu-title" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="row items-center gap-3">
          <h2 id="nu-title" className="t-h3 m-0 grow">{t('us.newuser', lang)}</h2>
          <CloseButton onClick={close} />
        </div>
        <form noValidate onSubmit={submit} className="stack gap-5 mt-5">
          <DetailsFields idPrefix="nu" draft={draft} errors={errors} branches={branches} onChange={setDraft} />
          <FormField id="nu-role" label={t('us.role', lang)} required>
            {p => (
              <select {...p} className="field" value={roleId} onChange={e => setRoleId(e.target.value)}>
                {roles.map(r => <option key={r.id} value={r.id}>{roleDisplayName(r, lang)}</option>)}
              </select>
            )}
          </FormField>
          {/* How the person will get in — said before the account exists, so
              nobody waits for a password the platform never sends. */}
          <p className="t-sm c-tx2 m-0" role="note">{t('us.signinnote', lang)}</p>
          <div className="form-actions">
            <Button type="submit"><Check size={16} aria-hidden /> {t('us.create', lang)}</Button>
            <Button type="button" variant="ghost" onClick={close}>{t('us.cancel', lang)}</Button>
          </div>
        </form>
      </div>
      {dialog}
    </div>
  );
};

/* ---------------- one account ---------------- */
type Ask = { kind: 'disable' | 'reset' | 'role' | 'archive'; role?: string };

const UserPanel: React.FC<{
  u: User; roles: Roles; active: readonly User[]; branches: Branches;
  canDo: ReturnType<typeof useCan>; notify: Notify; onClose: () => void;
}> = ({ u, roles, active, branches, canDo, notify, onClose }) => {
  const lang = useLang();
  const initial: Draft = { name: u.name, email: u.email ?? '', branchId: u.branchId ?? '' };
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [ask, setAsk] = useState<Ask | null>(null);
  const dirty = draft.name !== initial.name || draft.email !== initial.email || draft.branchId !== initial.branchId;
  const { leave, dialog } = useExitFlow(dirty, {
    title: t('us.leaveask', lang), body: t('us.leavebody', lang), leaveLabel: t('us.discard', lang), stayLabel: t('us.keepediting', lang),
  });
  const close = () => leave(onClose);
  const ref = useModal<HTMLDivElement>(close, undefined, true);
  const id = `up-${u.id}`;

  // The signed-in admin cannot disable, demote or archive themself here: the
  // next screen would be a locked door with nobody left to open it.
  const isSelf = identityStore.currentUser()?.id === u.id;
  const disabled = u.status === 'disabled';
  const trainers = usersWhoCan(active, roles, 'training.review');
  const managers = usersWhoCan(active, roles, 'reports.view');
  const roleLabel = (rid?: string) => roleDisplayName(roles.find(r => r.id === rid), lang) ?? rid ?? '';

  const guard = (fn: () => void, ok: string) => {
    try { fn(); notify(ok); } catch { notify(t('err.save', lang), 'error'); }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(draft, lang);
    setErrors(found);
    if (Object.keys(found).length) { focusFirstError(id, found); return; }
    guard(() => identityStore.updateUser(u.id, {
      name: draft.name.trim(), email: draft.email.trim() || undefined, branchId: draft.branchId || undefined,
    }), t('us.saved', lang));
  };

  const confirmAsk = () => {
    if (!ask) return;
    const a = ask;
    setAsk(null);
    if (a.kind === 'disable') guard(() => identityStore.setActive(u.id, false), t('us.disabled_ok', lang));
    if (a.kind === 'reset') guard(() => identityStore.requestPasswordReset(u.id), t('us.resetdone', lang));
    if (a.kind === 'role' && a.role) { const role = a.role; guard(() => identityStore.changeRole(u.id, role), t('us.rolechanged', lang)); }
    if (a.kind === 'archive') { guard(() => identityStore.archiveUser(u.id), t('us.archivedone', lang)); onClose(); }
  };

  const askCopy = (a: Ask) => {
    const vars = { name: u.name, role: roleLabel(a.role) };
    if (a.kind === 'archive') return { title: `${t('us.archiveask', lang)} ${u.name}`, body: t('us.archivebody', lang), label: t('us.archive', lang) };
    return {
      title: tf(`us.ask.${a.kind}` as Key, vars, lang),
      body: tf(`us.ask.${a.kind}body` as Key, vars, lang),
      label: a.kind === 'disable' ? t('us.disable', lang) : a.kind === 'reset' ? t('us.resetpw', lang) : t('us.changerole', lang),
    };
  };
  const copy = ask ? askCopy(ask) : null;

  return (
    <div className="dialog-scrim" onClick={close}>
      <div ref={ref} tabIndex={-1} className="dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}
        style={{ maxWidth: 600, outline: 'none' }} onClick={e => e.stopPropagation()}>
        <div className="row items-center gap-3">
          <Initials name={u.name} />
          <div className="stack grow" style={{ minWidth: 0 }}>
            <h2 id={`${id}-title`} className="t-h3 m-0">{u.name}</h2>
            <span className="row items-center gap-3 wrap">
              <span className="t-sm">{roleLabel(u.roleId)}</span>
              <Status tone={disabled ? 'attn' : 'ready'}>{disabled ? t('us.disabled', lang) : t('us.active', lang)}</Status>
            </span>
          </div>
          <CloseButton onClick={close} />
        </div>
        {isSelf && <p className="t-sm mt-3 mb-0">{t('us.selfnote', lang)}</p>}

        {canDo('users.edit') && (
          <section className="panel-section" aria-labelledby={`${id}-details`}>
            <h3 id={`${id}-details`} className="panel-title">{t('us.sec.details', lang)}</h3>
            <form noValidate onSubmit={save} className="stack gap-4 mt-3">
              <DetailsFields idPrefix={id} draft={draft} errors={errors} branches={branches} onChange={setDraft} />
              <div className="form-actions">
                <Button type="submit" disabled={!dirty}>{t('us.save', lang)}</Button>
                {dirty && <Button type="button" variant="ghost" onClick={() => { setDraft(initial); setErrors({}); }}>{t('us.reset', lang)}</Button>}
              </div>
            </form>
          </section>
        )}

        <section className="panel-section" aria-labelledby={`${id}-access`}>
          <h3 id={`${id}-access`} className="panel-title">{t('us.sec.access', lang)}</h3>
          <div className="form-grid mt-3">
            {canDo('users.assignRole') && (
              <FormField id={`${id}-role`} label={t('us.role', lang)} required hint={isSelf ? t('us.selfguard', lang) : undefined}>
                {p => (
                  <select {...p} className="field" value={u.roleId} disabled={isSelf}
                    onChange={e => setAsk({ kind: 'role', role: e.target.value })}>
                    {roles.map(r => <option key={r.id} value={r.id}>{roleDisplayName(r, lang)}</option>)}
                  </select>
                )}
              </FormField>
            )}
            {can(u, roles, 'academy.learn') && canDo('assignments.trainer') && (
              <FormField id={`${id}-trainer`} label={t('us.trainerfor', lang)}>
                {p => (
                  <select {...p} className="field" value={u.trainerId ?? ''}
                    onChange={e => guard(() => identityStore.assignTrainer(u.id, e.target.value || null), t('us.trainerset', lang))}>
                    <option value="">{t('us.notrainer', lang)}</option>
                    {trainers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                )}
              </FormField>
            )}
            {can(u, roles, 'training.review') && canDo('assignments.manager') && (
              <FormField id={`${id}-manager`} label={t('us.managerfor', lang)}>
                {p => (
                  <select {...p} className="field" value={u.managerId ?? ''}
                    onChange={e => guard(() => identityStore.assignManager(u.id, e.target.value || null), t('us.managerset', lang))}>
                    <option value="">{t('us.nomanager', lang)}</option>
                    {managers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                )}
              </FormField>
            )}
          </div>
        </section>

        <section className="panel-section" aria-labelledby={`${id}-account`}>
          <h3 id={`${id}-account`} className="panel-title">{t('us.sec.account', lang)}</h3>
          <div className="form-actions mt-3">
            {canDo('users.resetPassword') && (
              <Button variant="ghost" title={t('us.resetnote', lang)} onClick={() => setAsk({ kind: 'reset' })}>
                <KeyRound size={16} aria-hidden /> {t('us.resetpw', lang)}
              </Button>
            )}
            {canDo('users.activate') && !isSelf && (
              <Button variant="ghost" onClick={() => (disabled
                ? guard(() => identityStore.setActive(u.id, true), t('us.enabled_ok', lang))
                : setAsk({ kind: 'disable' }))}>
                <Power size={16} aria-hidden /> {disabled ? t('us.enable', lang) : t('us.disable', lang)}
              </Button>
            )}
            {canDo('users.archive') && !isSelf && u.id !== 'u-admin' && (
              <Button variant="ghost" className="btn-danger" onClick={() => setAsk({ kind: 'archive' })}>
                <Archive size={16} aria-hidden /> {t('us.archive', lang)}
              </Button>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog open={copy !== null} danger={ask?.kind === 'disable' || ask?.kind === 'archive'}
        title={copy?.title ?? ''} body={copy?.body ?? ''} confirmLabel={copy?.label ?? ''}
        onConfirm={confirmAsk} onCancel={() => setAsk(null)} />
      {dialog}
    </div>
  );
};
