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
import { Button, Eyebrow, EmptyState, StatusBadge, Card, Toast, ArabicContent, ConfirmDialog, PageHeader, SectionNav, SectionHeader, MetricStrip, Metric, Brief, Meter } from '../../ui/primitives';
import { loadDemoScenario, clearDemoTraining } from '../../app/demo/demoScenario';
import { fade } from '../../ui/motion';
import { AdminView } from './AdminView';
import { OrganizationPanel } from './OrganizationPanel';
import { WIDTH } from '../../ui/designSystem';
import { useOrganization } from '../../app/organization/orgStore';
import { branchNameOf } from '../../domain/organization';
import { useLang, t, tf, iso, type Key } from '../../app/i18n';

type Tab = 'dashboard' | 'inbox' | 'org' | 'audit' | 'users';

export const AdminPlatform: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const lang = useLang();
  const canDo = useCan();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!canDo('operations.view') && !canDo('users.view')) {
    return (
      <div className="row min-h-screen items-center justify-center">
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

  const current = visibleTabs.find(v => v.id === tab) ?? visibleTabs[0]!;
  const header = (
    <PageHeader crumbs={[t('crumb.academy', lang), t('nav.admin', lang)]} title={t('ad.platform', lang)}
      nav={<SectionNav label={t('ad.sections', lang)} items={visibleTabs} active={current.id}
        onChange={(id: string) => setTab(id as Tab)} />} />
  );

  return (
    <div className="min-h-screen">
      <div style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) 0' }}>{header}</div>
      {tab === 'users'
        // The user-management screen, reused as it is.
        ? <AdminView onExit={onExit} embedded />
        : (
          <m.main key={tab} {...fade} style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: '0 var(--sp-5) var(--sp-9)' }}>
            {tab === 'dashboard' && <OperationalDashboard onOpenInbox={() => setTab('inbox')} />}
            {tab === 'inbox' && <OperationalInbox onGoToUsers={() => setTab('users')} />}
            {tab === 'org' && <OrganizationPanel />}
            {tab === 'audit' && <AuditPanel canExport={canDo('audit.export')} />}
          </m.main>
        )}
    </div>
  );
};

/* ---------------- operational dashboard ---------------- */
const OperationalDashboard: React.FC<{ onOpenInbox: () => void }> = ({ onOpenInbox }) => {
  const lang = useLang();
  const { users } = useIdentity();
  useTraining();
  const org = useOrganization();
  const stats = useMemo(() => adminStats(users), [users]);
  const issues = useMemo(() => detectOperationalIssues(users, trainingStore.events()), [users]);
  const sev = summarizeIssues(issues);
  const urgent = sev.critical + sev.warning;

  return (
    <>
      <SectionHeader title={t('ad.dirhealth', lang)} description={t('ad.dirhealthsub', lang)} />
      <MetricStrip label={t('ad.dirhealth', lang)}>
        <Metric label={t('ad.active', lang)} value={stats.active} />
        <Metric label={t('ad.disabled', lang)} value={stats.disabled} tone={stats.disabled ? 'attn' : undefined} />
        <Metric label={t('ad.archivedst', lang)} value={stats.archived} />
        {/* Green means nothing to do, so only a zero count is green; informational
            issues are `info`. */}
        <Metric label={t('ad.opissues', lang)} value={sev.total}
          tone={sev.critical ? 'risk' : sev.warning ? 'attn' : sev.total > 0 ? 'info' : 'ready'}
          context={sev.total > 0 ? `${sev.critical} ${t('ad.sevcritical', lang)} · ${sev.warning} ${t('ad.sevwarning', lang)} · ${sev.info} ${t('ad.sevinfo', lang)}` : undefined} />
      </MetricStrip>

      {/* The next step, when there is one: the inbox holds every issue with its fix. */}
      {urgent > 0 && (
        <div className="mt-6">
          <Brief tone={sev.critical ? 'risk' : 'attn'} title={tf('ad.brief', { n: iso(urgent) }, lang)} body={t('ad.briefbody', lang)}
            action={<Button onClick={onOpenInbox}>{t('ad.openinbox', lang)}</Button>} />
        </div>
      )}

      <div className="panels region">
        <section aria-labelledby="ad-byrole">
          <h3 className="panel-title" id="ad-byrole">{t('ad.byrole', lang)}</h3>
          <dl className="kv">
            <Dist label={t('ad.employees', lang)} n={stats.employees} />
            <Dist label={t('ad.trainers', lang)} n={stats.trainers} />
            <Dist label={t('ad.managers', lang)} n={stats.managers} />
            <Dist label={t('ad.admins', lang)} n={stats.admins} />
          </dl>
        </section>
        <section aria-labelledby="ad-cov">
          <h3 className="panel-title" id="ad-cov">{t('ad.coverage', lang)}</h3>
          <dl className="kv">
            <Coverage label={t('ad.covtrainer', lang)} pct={stats.trainerCoverage} />
            <Coverage label={t('ad.covmanager', lang)} pct={stats.managerCoverage} />
          </dl>
        </section>
        <section aria-labelledby="ad-bybranch">
          <h3 className="panel-title" id="ad-bybranch">{t('ad.bybranch', lang)}</h3>
          {stats.branches.length === 0
            ? <p className="t-sm c-tx3 m-0">{t('ad.nobranches', lang)}</p>
            : <dl className="kv">{stats.branches.map(b => <Dist key={b.branch} label={branchNameOf(b.branch, org.branches)} n={b.count} />)}</dl>}
        </section>
      </div>

      <DemoDataCard />
    </>
  );
};

/** Loads or clears the showcase scenario, so testers can see full screens. */
const DemoDataCard: React.FC = () => {
  const lang = useLang();
  const [confirm, setConfirm] = useState<'load' | 'clear' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const done = (msg: string) => { setConfirm(null); setToast(msg); setTimeout(() => setToast(null), 2600); };

  return (
    <Card tone="quiet" layout={{ marginTop: 'var(--sp-8)' }}>
      <Eyebrow>{t('ad.demo', lang)}</Eyebrow>
      <p className="t-sm measure" style={{ margin: 'var(--sp-2) 0 var(--sp-4)' }}>{t('ad.demosub', lang)}</p>
      <div className="row gap-3 wrap">
        <Button onClick={() => setConfirm('load')}>{t('ad.demoload', lang)}</Button>
        <Button variant="ghost" onClick={() => setConfirm('clear')}>{t('ad.democlear', lang)}</Button>
      </div>
      <ConfirmDialog
        open={confirm === 'load'}
        danger
        title={t('ad.demoloadttl', lang)}
        body={t('ad.demoloadbody', lang)}
        confirmLabel={t('ad.demoload', lang)}
        onConfirm={() => { loadDemoScenario(); done(t('ad.demoloaded', lang)); }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        danger
        title={t('ad.democlearttl', lang)}
        body={t('ad.democlearbody', lang)}
        confirmLabel={t('ad.democlear', lang)}
        onConfirm={() => { clearDemoTraining(); done(t('ad.democleared', lang)); }}
        onCancel={() => setConfirm(null)}
      />
      <Toast message={toast} />
    </Card>
  );
};

const Dist: React.FC<{ label: string; n: number }> = ({ label, n }) => (
  <div>
    <dt className="t-sm c-tx1">{label}</dt>
    <dd className="t-num c-tx0">{n}</dd>
  </div>
);
const Coverage: React.FC<{ label: string; pct: number }> = ({ label, pct }) => {
  const tone = pct >= 90 ? 'ready' : pct >= 60 ? 'attn' : 'risk';
  return (
    <div>
      <dt className="t-sm c-tx1">{label}</dt>
      <dd className="row items-center gap-2"><Meter value={pct} tone={tone} /><span className={`t-num c-${tone}`}>{pct}%</span></dd>
    </div>
  );
};

/* ---------------- operational inbox ---------------- */
const SEV_META: Record<Severity, { icon: React.ReactNode; tone: 'risk' | 'attn' | 'info'; labelKey: Key }> = {
  critical: { icon: <AlertOctagon size={16} />, tone: 'risk', labelKey: 'ad.sevcritical' },
  warning: { icon: <AlertTriangle size={16} />, tone: 'attn', labelKey: 'ad.sevwarning' },
  info: { icon: <Info size={16} />, tone: 'info', labelKey: 'ad.sevinfo' },
};

const OperationalInbox: React.FC<{ onGoToUsers: () => void }> = ({ onGoToUsers }) => {
  const lang = useLang();
  const { users } = useIdentity();
  useTraining();
  const issues = useMemo(() => detectOperationalIssues(users, trainingStore.events()), [users]);
  const sev = summarizeIssues(issues);

  return (
    <>
      <div className="row items-baseline gap-3 wrap mb-2">
        <h2 className="t-h2 m-0">{t('ad.needsyou', lang)}</h2>
        {issues.length > 0 && <span className="t-num t-label c-tx2">{issues.length} {t('ad.issuecount', lang)}</span>}
      </div>
      <p className="t-sm mb-5">{t('ad.autodetect', lang)}</p>

      {issues.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title={t('ad.allclear', lang)}
          body={t('ad.allclearbody', lang)} />
      ) : (
        <>
          <div className="row gap-3 wrap mb-4">
            {sev.critical > 0 && <StatusBadge tone="risk">{sev.critical} {t('ad.sevcritical', lang)}</StatusBadge>}
            {sev.warning > 0 && <StatusBadge tone="attn">{sev.warning} {t('ad.sevwarning', lang)}</StatusBadge>}
            {sev.info > 0 && <StatusBadge tone="info">{sev.info} {t('ad.sevinfo', lang)}</StatusBadge>}
          </div>
          <div className="stack gap-2">
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
    <div className="row-hover row items-center gap-3 wrap" style={{ padding: 'var(--sp-3) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', minHeight: 52 }}>
      <span className="no-shrink" style={{ color: `var(--${meta.tone === 'risk' ? 'risk' : meta.tone === 'attn' ? 'attn' : 'info'})` }}
        title={t(meta.labelKey, lang)} aria-label={t(meta.labelKey, lang)}>{meta.icon}</span>
      {/* The issue text and its action come from the operations engine in
          Arabic — operational content, so an island, not a translation. */}
      <ArabicContent as="span" className="t-sm c-tx1" style={{ flex: '1 1 240px' }}>{issue.message}</ArabicContent>
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
      <h2 className="t-h2 mb-2">{t('ad.audittitle', lang)}</h2>
      <p className="t-sm mb-5">{t('ad.auditsub', lang)}</p>

      <div className="row gap-3 wrap mb-4">
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
        <ol role="list" className="stack m-0 gap-2" style={{ listStyle: 'none', padding: 0 }}>
          {filtered.map((e, i) => (
            <li key={i} className="row gap-3 items-start" style={{ padding: 'var(--sp-3) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
              <span className="mt-2 no-shrink" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--g2)' }} aria-hidden />
              <div className="grow">
                <span className="t-sm c-tx1">{describeAudit(e, nameOf)}</span>
                <span className="t-label block mt-1">{new Date(e.at).toLocaleString('ar-EG')}</span>
              </div>
              <span className="t-label c-tx3">{PERMISSIONS['audit.view'] ? e.type : e.type}</span>
            </li>
          ))}
        </ol>
      )}
      <Toast message={toast} />
    </>
  );
};
