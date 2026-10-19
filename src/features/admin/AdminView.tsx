/**
 * AdminView — enterprise user administration (Design System consumer).
 * Data grid with FIXED columns (identity | role | assignment | actions) so the
 * eye scans vertically across hundreds of users. Every mutation confirms state
 * via Toast; archive (the only destructive action) requires ConfirmDialog.
 * Every action is permission-gated via can(); role ids never touch the UI.
 */
import React, { useMemo, useRef, useState } from 'react';
import { m } from 'motion/react';
import { UserPlus, ShieldCheck, KeyRound, Archive, Power, Pencil, Check } from 'lucide-react';
import { useIdentity, identityStore, useCan } from '../../app/identity/identityStore';
import { can, type User } from '../../domain/identity';
import { usersWhoCan } from '../../domain/identity/scope';
import { Button, Card, Eyebrow, EmptyState, ScreenHeader, ConfirmDialog, Toast, StatusBadge } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';
import { useLang, t, t as tr, roleName as roleDisplayName } from '../../app/i18n';

export const AdminView: React.FC<{ onExit: () => void; embedded?: boolean }> = ({ onExit, embedded }) => {
  const lang = useLang();
  const { users, roles } = useIdentity();
  const canDo = useCan();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const notify = (msg: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  };

  const active = useMemo(() => users.filter(u => u.status !== 'archived'), [users]);
  const archived = useMemo(() => users.filter(u => u.status === 'archived'), [users]);
  // Identified by CAPABILITY, not role name: a new role granted training.review
  // appears here automatically, with no component change.
  const trainers = useMemo(() => usersWhoCan(active, roles, 'training.review'), [active, roles]);
  const managers = useMemo(() => usersWhoCan(active, roles, 'reports.view'), [active, roles]);
  const roleName = (id: string) => roleDisplayName(roles.find(r => r.id === id), lang) ?? id;

  if (!canDo('users.view')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState title={t('ad.noaccess', lang)} body={t('us.noaccess', lang)} action={<Button onClick={onExit}>{t('ad.back', lang)}</Button>} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {!embedded && (
        <ScreenHeader onBack={onExit} tabRoute maxWidth={WIDTH.staff}
          leading={<Eyebrow icon={<ShieldCheck size={13} />}>{t('us.title', lang)}</Eyebrow>}
          trailing={canDo('users.create')
            ? <Button onClick={() => setShowCreate(v => !v)}><UserPlus size={16} /> {t('us.adduser', lang)}</Button>
            : undefined} />
      )}
      {embedded && canDo('users.create') && (
        <div style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-4) var(--sp-5) 0', display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => setShowCreate(v => !v)}><UserPlus size={16} /> {t('us.adduser', lang)}</Button>
        </div>
      )}

      <m.main {...fade} style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        {showCreate && (
          <CreateUserForm onDone={created => { setShowCreate(false); if (created) notify(t('us.added', lang)); }} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginTop: showCreate ? 'var(--sp-5)' : 0 }}>
          {active.map(u => (
            <UserRow key={u.id} u={u} roles={roles} trainers={trainers} managers={managers}
              roleName={roleName} canDo={canDo} notify={notify}
              onAskArchive={() => setConfirmTarget(u)}
              editing={editing === u.id} onToggleEdit={() => setEditing(editing === u.id ? null : u.id)} />
          ))}
        </div>

        {archived.length > 0 && (
          <details style={{ marginTop: 'var(--sp-6)' }}>
            <summary className="t-label" style={{ cursor: 'pointer', padding: 'var(--sp-2) 0' }}>
              {t('us.archiveList', lang)} ({archived.length}) {t('us.archivenote', lang)}
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
              {archived.map(u => (
                <div key={u.id} style={{ padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-sm)', background: 'var(--s-2)', border: '1px dashed var(--line-2)' }}>
                  <span className="t-sm">{u.name} · {roleName(u.roleId)} · {t('us.archived', lang)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </m.main>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={`${t('us.archiveask', lang)} ${confirmTarget?.name ?? ''}`}
        body={t('us.archivebody', lang)}
        confirmLabel={t('us.archive', lang)}
        danger
        onConfirm={() => {
          if (confirmTarget) { identityStore.archiveUser(confirmTarget.id); notify(t('us.archivedone', lang)); }
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
      <Toast message={toastMsg} />
    </div>
  );
};

/* ---------------- create form ---------------- */
const CreateUserForm: React.FC<{ onDone: (created: boolean) => void }> = ({ onDone }) => {
  const lang = useLang();
  const { roles } = useIdentity();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState('');
  const [roleId, setRoleId] = useState('employee');

  return (
    <Card tone="accent">
      <Eyebrow icon={<UserPlus size={13} />}>{t('us.newuser', lang)}</Eyebrow>
      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginTop: 'var(--sp-4)' }}>
        <input aria-label={t('us.name', lang)} placeholder={t('us.name', lang)} value={name} onChange={e => setName(e.target.value)} className="field" style={{ flex: '1 1 180px' }} />
        <input aria-label={t('us.email', lang)} placeholder={t('us.emailopt', lang)} value={email} onChange={e => setEmail(e.target.value)} className="field" style={{ flex: '1 1 180px' }} />
        <input aria-label={t('us.branch', lang)} placeholder={t('us.branchopt', lang)} value={branchId} onChange={e => setBranchId(e.target.value)} className="field" style={{ flex: '1 1 140px' }} />
        <select aria-label={t('us.role', lang)} value={roleId} onChange={e => setRoleId(e.target.value)} className="field" style={{ flex: '1 1 140px' }}>
          {roles.map(r => <option key={r.id} value={r.id}>{roleDisplayName(r, lang)}</option>)}
        </select>
      </div>
      <div style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-3)' }}>
        <Button disabled={!name.trim()}
          onClick={() => {
            identityStore.createUser({ name: name.trim(), email: email.trim() || undefined, branchId: branchId.trim() || undefined, roleId });
            onDone(true);
          }}>
          <Check size={16} /> {t('us.create', lang)}
        </Button>
        <Button variant="ghost" onClick={() => onDone(false)}>{t('us.cancel', lang)}</Button>
      </div>
    </Card>
  );
};

/* ---------------- user row (enterprise data grid) ---------------- */
const UserRow: React.FC<{
  u: User;
  roles: ReturnType<typeof useIdentity>['roles'];
  trainers: readonly User[];
  managers: readonly User[];
  roleName: (id: string) => string;
  canDo: (p: Parameters<ReturnType<typeof useCan>>[0]) => boolean;
  notify: (msg: string) => void;
  onAskArchive: () => void;
  editing: boolean;
  onToggleEdit: () => void;
}> = ({ u, roles, trainers, managers, roleName, canDo, notify, onAskArchive, editing, onToggleEdit }) => {
  const lang = useLang();
  const [name, setName] = useState(u.name);
  const [email, setEmail] = useState(u.email ?? '');
  const [branch, setBranch] = useState(u.branchId ?? '');
  const disabled = u.status === 'disabled';

  return (
    <div className="row-hover" style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', opacity: disabled ? 0.6 : 1 }}>
      <div className="admin-row">
        {/* col 1 — identity */}
        <div>
          <span className="t-title" style={{ color: 'var(--tx0)' }}>{u.name}</span>
          <span className="t-label" style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-1)', alignItems: 'center' }}>
            {roleName(u.roleId)}{u.branchId ? ` · ${u.branchId}` : ''}
            {disabled && <StatusBadge tone="attn">{t('us.disabled', lang)}</StatusBadge>}
          </span>
        </div>

        {/* col 2 — role */}
        {canDo('users.assignRole') ? (
          <select aria-label={`${t('us.roleof', lang)} ${u.name}`} value={u.roleId} className="field t-sm"
            onChange={e => { identityStore.changeRole(u.id, e.target.value); notify(t('us.rolechanged', lang)); }}>
            {roles.map(r => <option key={r.id} value={r.id}>{roleDisplayName(r, lang)}</option>)}
          </select>
        ) : <span aria-hidden />}

        {/* col 3 — assignment */}
        {can(u, roles, 'academy.learn') && canDo('assignments.trainer') ? (
          <select aria-label={`${t('us.trainerfor', lang)} ${u.name}`} value={u.trainerId ?? ''} className="field t-sm"
            onChange={e => { identityStore.assignTrainer(u.id, e.target.value || null); notify(t('us.trainerset', lang)); }}>
            <option value="">{t('us.notrainer', lang)}</option>
            {trainers.map(t => <option key={t.id} value={t.id}>{tr('us.trainerof', lang)} {t.name}</option>)}
          </select>
        ) : can(u, roles, 'training.review') && canDo('assignments.manager') ? (
          <select aria-label={`${t('us.managerfor', lang)} ${u.name}`} value={u.managerId ?? ''} className="field t-sm"
            onChange={e => { identityStore.assignManager(u.id, e.target.value || null); notify(t('us.managerset', lang)); }}>
            <option value="">{t('us.nomanager', lang)}</option>
            {managers.map(m => <option key={m.id} value={m.id}>{t('us.managerof', lang)} {m.name}</option>)}
          </select>
        ) : <span aria-hidden />}

        {/* col 4 — actions */}
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canDo('users.edit') && (
            <button className="icon-btn" onClick={onToggleEdit} aria-expanded={editing}><Pencil size={13} /> {t('us.edit', lang)}</button>
          )}
          {canDo('users.resetPassword') && (
            <button className="icon-btn" title={t('us.resetnote', lang)}
              onClick={() => { identityStore.requestPasswordReset(u.id); notify(t('us.resetdone', lang)); }}>
              <KeyRound size={13} /> {t('us.resetpw', lang)}
            </button>
          )}
          {canDo('users.activate') && (
            <button className="icon-btn" style={{ color: disabled ? 'var(--ready)' : 'var(--attn)' }}
              onClick={() => { identityStore.setActive(u.id, disabled); notify(disabled ? t('us.enabled_ok', lang) : t('us.disabled_ok', lang)); }}>
              <Power size={13} /> {disabled ? t('us.enable', lang) : t('us.disable', lang)}
            </button>
          )}
          {canDo('users.archive') && u.id !== 'u-admin' && (
            <button className="icon-btn" style={{ color: 'var(--risk)' }} onClick={onAskArchive}>
              <Archive size={13} /> {t('us.archive', lang)}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-4)', borderTop: '1px dashed var(--line-2)', display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input aria-label={t('us.newname', lang)} value={name} onChange={e => setName(e.target.value)} className="field" style={{ flex: '1 1 160px' }} />
          <input aria-label={t('us.newemail', lang)} placeholder={t('us.email', lang)} value={email} onChange={e => setEmail(e.target.value)} className="field" style={{ flex: '1 1 160px' }} />
          <input aria-label={t('us.newbranch', lang)} placeholder={t('us.branch', lang)} value={branch} onChange={e => setBranch(e.target.value)} className="field" style={{ flex: '1 1 120px' }} />
          <Button onClick={() => {
            identityStore.updateUser(u.id, { name: name.trim() || u.name, email: email.trim() || undefined, branchId: branch.trim() || undefined });
            notify(t('us.saved', lang));
            onToggleEdit();
          }}>{t('us.save', lang)}</Button>
        </div>
      )}
    </div>
  );
};
