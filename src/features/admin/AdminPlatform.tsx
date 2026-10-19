/**
 * AdminPlatform — Phase 6C, the Enterprise Administration Platform.
 * Operating the organization, NOT training it. Three tabs, each answering an
 * operational decision:
 *   • لوحة   → is the identity book healthy? (counts, coverage, integrity)
 *   • الوارد → what requires my attention TODAY? (Operational Inbox)
 *   • السجل  → who did what, when? (audit projection — no new storage)
 * All derived; Design-System primitives only; gated on operations.view.
 */
import React, { useMemo, useState } from 'react';
import { m } from 'motion/react';
import { LayoutDashboard, Inbox, ScrollText, ShieldCheck, AlertOctagon, AlertTriangle, Info, Users2, Building2 } from 'lucide-react';
import { useIdentity, useCan, identityStore } from '../../app/identity/identityStore';
import { useTraining, trainingStore } from '../../app/training/trainingStore';
import { detectOperationalIssues, summarizeIssues, type OperationalIssue, type Severity } from '../../domain/operations/health';
import { adminStats } from '../../domain/operations/adminStats';
import { filterAudit, latestAudit, describeAudit, auditActions, type AuditFilter } from '../../domain/operations/audit';
import { PERMISSIONS } from '../../domain/identity';
import { Button, Eyebrow, EmptyState, ScreenHeader, StatusBadge, Card, Toast, ArabicContent } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { AdminView } from './AdminView';
import { OrganizationPanel } from './OrganizationPanel';
import { WIDTH } from '../../ui/designSystem';
import { useOrganization } from '../../app/organization/orgStore';
import { branchNameOf } from '../../domain/organization';
import { useLang, t, t as tr, type Key } from '../../app/i18n';

type Tab = 'dashboard' | 'inbox' | 'org' | 'audit' | 'users';

export const AdminPlatform: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const lang = useLang();
  const canDo = useCan();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!canDo('operations.view') && !canDo('users.view')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState title={t('ad.noaccess', lang)} body={t('ad.noaccessops', lang)} action={<Button onClick={onExit}>{t('ad.back', lang)}</Button>} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'dashboard', label: t('ad.tabops', lang), icon: <LayoutDashboard size={13} />, show: canDo('operations.view') },
    { id: 'inbox', label: t('ad.tabinbox', lang), icon: <Inbox size={13} />, show: canDo('operations.view') },
    { id: 'org', label: t('ad.taborg', lang), icon: <Building2 size={13} />, show: canDo('users.view') },
    { id: 'users', label: t('ad.tabusers', lang), icon: <Users2 size={13} />, show: canDo('users.view') },
    { id: 'audit', label: t('ad.tabaudit', lang), icon: <ScrollText size={13} />, show: canDo('audit.view') },
  ];
  const visibleTabs = tabs.filter(t => t.show);

  if (tab === 'users') {
    // Reuse the existing user-management screen verbatim (no duplication),
    // with the platform tab bar on top.
    return (
      <div>
        <TabBar tabs={visibleTabs} active={tab} onChange={setTab} onExit={onExit} />
        <AdminView onExit={onExit} embedded />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <TabBar tabs={visibleTabs} active={tab} onChange={setTab} onExit={onExit} />
      <m.main key={tab} {...fade} style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        {tab === 'dashboard' && <OperationalDashboard />}
        {tab === 'inbox' && <OperationalInbox onGoToUsers={() => setTab('users')} />}
        {tab === 'org' && <OrganizationPanel />}
        {tab === 'audit' && <AuditPanel canExport={canDo('audit.export')} />}
      </m.main>
    </div>
  );
};

/* ---------------- tab bar ---------------- */
const TabBar: React.FC<{ tabs: { id: Tab; label: string; icon: React.ReactNode }[]; active: Tab; onChange: (t: Tab) => void; onExit: () => void }> =
  ({ tabs, active, onChange, onExit }) => {
  /* `t` is taken here by the tab being mapped, so the translator comes in
     aliased — an alias, not a rename of the map variable. */
  const lang = useLang();
  return (
    <ScreenHeader onBack={onExit} tabRoute maxWidth={WIDTH.staff}
      leading={<Eyebrow icon={<ShieldCheck size={13} />}>{tr('ad.platform', lang)}</Eyebrow>}
      trailing={
        <nav style={{ display: 'flex', gap: 'var(--sp-1)', flexWrap: 'wrap' }} aria-label={tr('ad.sections', lang)}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => onChange(t.id)} aria-current={active === t.id}
              className="pill" style={active === t.id ? { borderColor: 'var(--g2)', color: 'var(--g1)' } : undefined}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
      } />
  );
};

/* ---------------- operational dashboard ---------------- */
const OperationalDashboard: React.FC = () => {
  const lang = useLang();
  const { users } = useIdentity();
  useTraining();
  const org = useOrganization();
  const stats = useMemo(() => adminStats(users), [users]);
  const issues = useMemo(() => detectOperationalIssues(users, trainingStore.events()), [users]);
  const sev = summarizeIssues(issues);

  return (
    <>
      <h1 className="t-h2" style={{ marginBottom: 'var(--sp-2)' }}>{t('ad.dirhealth', lang)}</h1>
      <p className="t-sm" style={{ marginBottom: 'var(--sp-5)' }}>{t('ad.dirhealthsub', lang)}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--sp-3)' }}>
        <Stat label={t('ad.active', lang)} value={stats.active} />
        <Stat label={t('ad.disabled', lang)} value={stats.disabled} tone={stats.disabled ? 'attn' : undefined} />
        <Stat label={t('ad.archivedst', lang)} value={stats.archived} />
        {/* 🔴 A NON-ZERO PROBLEM COUNT IS NEVER GREEN. The tone fell through to
            `ready` whenever nothing was critical or warning — so «11 مشاكل
            تشغيلية» rendered in the same green the system uses for «approved»
            and «all clear». Green is the product's word for "nothing to do
            here"; eleven things to do is not that. Zero is the only count that
            earns it, and eleven informational issues are `info`. */}
        <Stat label={t('ad.opissues', lang)} value={sev.total}
          tone={sev.critical ? 'risk' : sev.warning ? 'attn' : sev.total > 0 ? 'info' : 'ready'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
        <Card>
          <Eyebrow>{t('ad.byrole', lang)}</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
            <Dist label={t('ad.employees', lang)} n={stats.employees} />
            <Dist label={t('ad.trainers', lang)} n={stats.trainers} />
            <Dist label={t('ad.managers', lang)} n={stats.managers} />
            <Dist label={t('ad.admins', lang)} n={stats.admins} />
          </div>
        </Card>
        <Card>
          <Eyebrow>{t('ad.coverage', lang)}</Eyebrow>
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <Coverage label={t('ad.covtrainer', lang)} pct={stats.trainerCoverage} />
            <Coverage label={t('ad.covmanager', lang)} pct={stats.managerCoverage} />
          </div>
        </Card>
        <Card>
          <Eyebrow>{t('ad.bybranch', lang)}</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
            {stats.branches.length === 0
              ? <p className="t-sm" style={{ color: 'var(--tx3)', margin: 0 }}>{t('ad.nobranches', lang)}</p>
              : stats.branches.map(b => <Dist key={b.branch} label={branchNameOf(b.branch, org.branches)} n={b.count} />)}
          </div>
        </Card>
      </div>
    </>
  );
};

const Stat: React.FC<{ label: string; value: number; tone?: 'ready' | 'attn' | 'risk' | 'info' }> = ({ label, value, tone }) => {
  const color = tone === 'risk' ? 'var(--risk)' : tone === 'attn' ? 'var(--attn)'
    : tone === 'ready' ? 'var(--ready)' : tone === 'info' ? 'var(--info)' : 'var(--tx0)';
  return (
    <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
      <span className="t-label">{label}</span>
      <div className="t-num t-h2" style={{ color, marginTop: 'var(--sp-1)' }}>{value}</div>
    </div>
  );
};
const Dist: React.FC<{ label: string; n: number }> = ({ label, n }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span className="t-sm">{label}</span>
    <span className="t-num" style={{ color: 'var(--tx0)' }}>{n}</span>
  </div>
);
const Coverage: React.FC<{ label: string; pct: number }> = ({ label, pct }) => (
  <div style={{ marginBottom: 'var(--sp-3)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-1)' }}>
      <span className="t-sm">{label}</span>
      <span className="t-num t-label" style={{ color: pct >= 90 ? 'var(--ready)' : pct >= 60 ? 'var(--attn)' : 'var(--risk)' }}>{pct}%</span>
    </div>
    <div style={{ height: 6, borderRadius: 'var(--r-full)', background: 'var(--line-2)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? 'var(--ready)' : pct >= 60 ? 'var(--attn)' : 'var(--risk)' }} />
    </div>
  </div>
);

/* ---------------- operational inbox ---------------- */
const SEV_META: Record<Severity, { icon: React.ReactNode; tone: 'risk' | 'attn' | 'info'; labelKey: Key }> = {
  critical: { icon: <AlertOctagon size={16} />, tone: 'risk', labelKey: 'ad.sevcritical' as Key },
  warning: { icon: <AlertTriangle size={16} />, tone: 'attn', labelKey: 'ad.sevwarning' as Key },
  info: { icon: <Info size={16} />, tone: 'info', labelKey: 'ad.sevinfo' as Key },
};

const OperationalInbox: React.FC<{ onGoToUsers: () => void }> = ({ onGoToUsers }) => {
  const lang = useLang();
  const { users } = useIdentity();
  useTraining();
  const issues = useMemo(() => detectOperationalIssues(users, trainingStore.events()), [users]);
  const sev = summarizeIssues(issues);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-2)' }}>
        <h1 className="t-h2" style={{ margin: 0 }}>{t('ad.needsyou', lang)}</h1>
        {issues.length > 0 && <span className="t-num t-label" style={{ color: 'var(--tx2)' }}>{issues.length} {t('ad.issuecount', lang)}</span>}
      </div>
      <p className="t-sm" style={{ marginBottom: 'var(--sp-5)' }}>{t('ad.autodetect', lang)}</p>

      {issues.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title={t('ad.allclear', lang)}
          body={t('ad.allclearbody', lang)} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-4)' }}>
            {sev.critical > 0 && <StatusBadge tone="risk">{sev.critical} {t('ad.sevcritical', lang)}</StatusBadge>}
            {sev.warning > 0 && <StatusBadge tone="attn">{sev.warning} {t('ad.sevwarning', lang)}</StatusBadge>}
            {sev.info > 0 && <StatusBadge tone="info">{sev.info} {t('ad.sevinfo', lang)}</StatusBadge>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {issues.map(issue => <InboxRow key={issue.id} issue={issue} onAction={onGoToUsers} />)}
          </div>
        </>
      )}
    </>
  );
};

const InboxRow: React.FC<{ issue: OperationalIssue; onAction: () => void }> = ({ issue, onAction }) => {
  const lang = useLang();
  const meta = SEV_META[issue.severity];
  return (
    <div className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap', padding: 'var(--sp-3) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', minHeight: 52 }}>
      <span style={{ color: `var(--${meta.tone === 'risk' ? 'risk' : meta.tone === 'attn' ? 'attn' : 'info'})`, flexShrink: 0 }}
        title={t(meta.labelKey, lang)} aria-label={t(meta.labelKey, lang)}>{meta.icon}</span>
      {/* The issue text and its action come from the operations engine in
          Arabic — operational content, so an island, not a translation. */}
      <ArabicContent as="span" className="t-sm" style={{ flex: '1 1 240px', color: 'var(--tx1)' }}>{issue.message}</ArabicContent>
      <Button variant="ghost" onClick={onAction}><ArabicContent as="span">{issue.action}</ArabicContent></Button>
    </div>
  );
};

/* ---------------- audit panel ---------------- */
const AuditPanel: React.FC<{ canExport: boolean }> = ({ canExport }) => {
  const lang = useLang();
  const { users } = useIdentity();
  const log = identityStore.auditLog();
  const [filter, setFilter] = useState<AuditFilter>({});
  const nameOf = useMemo(() => {
    const map = new Map(users.map(u => [u.id, u.name]));
    return (id: string) => map.get(id) ?? id;
  }, [users]);

  const actions = useMemo(() => auditActions(log), [log]);
  const filtered = useMemo(() => latestAudit(filterAudit(log, filter, nameOf), 200), [log, filter, nameOf]);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <h1 className="t-h2" style={{ marginBottom: 'var(--sp-2)' }}>{t('ad.audittitle', lang)}</h1>
      <p className="t-sm" style={{ marginBottom: 'var(--sp-5)' }}>{t('ad.auditsub', lang)} {''}، مش تخزين جديد.</p>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-4)' }}>
        <input className="field" style={{ flex: '1 1 220px' }} placeholder={t('ad.searchlog', lang)} aria-label={t('ad.searcharia', lang)}
          value={filter.text ?? ''} onChange={e => setFilter(f => ({ ...f, text: e.target.value || undefined }))} />
        <select className="field" aria-label={t('ad.actiontype', lang)} value={filter.action ?? ''}
          onChange={e => setFilter(f => ({ ...f, action: e.target.value || undefined }))}>
          <option value="">{t('ad.allactions', lang)}</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {canExport && (
          <Button variant="ghost" onClick={() => setToast(t('ad.exportsoon', lang))}>{t('ad.export', lang)}</Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t('ad.noevents', lang)} body={t('ad.noeventsbody', lang)} />
      ) : (
        <ol role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {filtered.map((e, i) => (
            <li key={i} style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', padding: 'var(--sp-3) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--g2)', marginTop: 'var(--sp-2)', flexShrink: 0 }} aria-hidden />
              <div style={{ flex: 1 }}>
                <span className="t-sm" style={{ color: 'var(--tx1)' }}>{describeAudit(e, nameOf)}</span>
                <span className="t-label" style={{ display: 'block', marginTop: 'var(--sp-1)' }}>{new Date(e.at).toLocaleString('ar-EG')}</span>
              </div>
              <span className="t-label" style={{ color: 'var(--tx3)' }}>{PERMISSIONS['audit.view'] ? e.type : e.type}</span>
            </li>
          ))}
        </ol>
      )}
      <Toast message={toast} />
    </>
  );
};
