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
import { filterAudit, latestAudit, describeAudit, auditActions, auditExportRows, actionOf, auditKey, type AuditFilter } from '../../domain/operations/audit';
import { Button, Eyebrow, EmptyState, Card, Toast, ConfirmDialog, PageHeader, SectionNav, SectionHeader, MetricStrip, Metric, Brief, Meter, DataTable, Status, Num, FormField, type Column } from '../../ui/primitives';
import { loadDemoScenario, clearDemoTraining } from '../../app/demo/demoScenario';
import { fade } from '../../ui/motion';
import { AdminView } from './AdminView';
import { OrganizationPanel } from './OrganizationPanel';
import { WIDTH } from '../../ui/designSystem';
import { useOrganization, orgStore } from '../../app/organization/orgStore';
import { issueText } from './issueText';
import { branchNameOf } from '../../domain/organization';
import { tone, SEVERITY, type SemanticTone } from '../../ui/statusSemantics';
import { useLang, t, tf, roleName as roleDisplayName, type Key, dateLocale } from '../../app/i18n';
import { overlayParams } from '../../app/overlayHistory';
import { leaveGuard } from '../../app/leaveGuard';
import { eventCount, issuesNeedAction } from '../../app/plural';

type Tab = 'dashboard' | 'inbox' | 'org' | 'audit' | 'users';

export const AdminPlatform: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const lang = useLang();
  const canDo = useCan();
  // A link to an account (#/admin?user=…) opens on the users tab.
  const [tab, setTab] = useState<Tab>(() => (overlayParams().has('user') || overlayParams().has('create') ? 'users' : 'dashboard'));
  // An inbox fix that names a person opens that person's account, not the top
  // of a list of everyone.
  const [focusUser, setFocusUser] = useState<string | null>(null);

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
        onChange={(id: string) => leaveGuard.ask(() => { setFocusUser(null); setTab(id as Tab); })} />} />
  );

  return (
    <div className="min-h-screen">
      <div style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) 0' }}>{header}</div>
      {tab === 'users'
        ? <AdminView key={focusUser ?? 'list'} onExit={onExit} openUserId={focusUser} />
        : (
          <m.main key={tab} {...fade} style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: '0 var(--sp-5) var(--sp-9)' }}>
            {tab === 'dashboard' && <OperationalDashboard onOpenInbox={() => setTab('inbox')} />}
            {tab === 'inbox' && <OperationalInbox onGoToUser={id => { setFocusUser(id ?? null); setTab('users'); }} />}
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
        {/* Green means nothing to do, so only a zero count is green; issues that
            are only information stay neutral: there is no blue for a status. */}
        <Metric label={t('ad.opissues', lang)} value={sev.total}
          tone={sev.critical ? 'risk' : sev.warning ? 'attn' : sev.total > 0 ? undefined : 'ready'}
          context={sev.total > 0 ? `${sev.critical} ${t('ad.sevcritical', lang)} · ${sev.warning} ${t('ad.sevwarning', lang)} · ${sev.info} ${t('ad.sevinfo', lang)}` : undefined} />
      </MetricStrip>

      {/* The next step, when there is one: the inbox holds every issue with its fix. */}
      {urgent > 0 && (
        <div className="mt-6">
          <Brief tone={sev.critical ? 'risk' : 'attn'} title={issuesNeedAction(urgent, lang)} body={t('ad.briefbody', lang)}
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
// Colours come from the one semantic table (ui/statusSemantics): information
// is neutral, never blue.
const SEV_META: Record<Severity, { icon: React.ReactNode; tone: SemanticTone; labelKey: Key }> = {
  critical: { icon: <AlertOctagon size={16} />, tone: tone(SEVERITY.critical), labelKey: 'ad.sevcritical' },
  warning: { icon: <AlertTriangle size={16} />, tone: tone(SEVERITY.warning), labelKey: 'ad.sevwarning' },
  info: { icon: <Info size={16} />, tone: tone(SEVERITY.info), labelKey: 'ad.sevinfo' },
};

const OperationalInbox: React.FC<{ onGoToUser: (userId: string | undefined) => void }> = ({ onGoToUser }) => {
  const lang = useLang();
  const { users } = useIdentity();
  const { branches } = useOrganization();
  useTraining();
  const issues = useMemo(() => detectOperationalIssues(users, trainingStore.events()), [users]);
  const sev = summarizeIssues(issues);
  const rank: Record<Severity, number> = { critical: 2, warning: 1, info: 0 };
  const columns: Column<OperationalIssue>[] = [
    {
      id: 'issue', header: t('ad.col.issue', lang),
      cell: i => <span className="c-tx1">{issueText(i, users, branches, lang).message}</span>,
    },
    {
      id: 'sev', header: t('ad.col.sev', lang), sortValue: i => rank[i.severity],
      cell: i => <Status tone={SEV_META[i.severity].tone}>{t(SEV_META[i.severity].labelKey, lang)}</Status>,
    },
    {
      id: 'act', header: t('dt.action', lang), align: 'end',
      cell: i => (
        <button type="button" className="icon-btn" onClick={() => onGoToUser(i.targetUserId)}>
          {issueText(i, users, branches, lang).action}
        </button>
      ),
    },
  ];

  return (
    <section aria-labelledby="ad-inbox">
      <SectionHeader id="ad-inbox" title={t('ad.needsyou', lang)} count={issues.length} description={t('ad.autodetect', lang)} />
      {issues.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title={t('ad.allclear', lang)} body={t('ad.allclearbody', lang)} />
      ) : (
        <>
          <MetricStrip label={t('ad.col.sev', lang)}>
            <Metric label={t('ad.sevcritical', lang)} value={<Num>{sev.critical}</Num>} tone={sev.critical ? 'risk' : undefined} />
            <Metric label={t('ad.sevwarning', lang)} value={<Num>{sev.warning}</Num>} tone={sev.warning ? 'attn' : undefined} />
            <Metric label={t('ad.sevinfo', lang)} value={<Num>{sev.info}</Num>} />
          </MetricStrip>
          <div className="mt-5">
            <DataTable caption={t('ad.needsyou', lang)} columns={columns} rows={issues} rowKey={i => i.id}
              rowTone={i => (i.severity === 'critical' ? 'risk' : i.severity === 'warning' ? 'attn' : undefined)}
              initialSort={{ id: 'sev', dir: 'desc' }} />
          </div>
        </>
      )}
    </section>
  );
};

/* ---------------- audit panel ---------------- */
const AuditPanel: React.FC<{ canExport: boolean }> = ({ canExport }) => {
  const lang = useLang();
  const { users } = useIdentity();
  // Account changes and governance changes to the organisation, in one log.
  // Both logs are replaced, never mutated, when an event is appended.
  useOrganization();
  const accountLog = identityStore.auditLog();
  const orgLog = orgStore.auditLog();
  const log = useMemo(() => [...accountLog, ...orgLog], [accountLog, orgLog]);
  const [filter, setFilter] = useState<AuditFilter>({});
  const nameOf = useMemo(() => {
    const map = new Map(users.map(u => [u.id, u.name]));
    return (id: string) => map.get(id) ?? id;
  }, [users]);
  const roles = identityStore.get().roles;
  const roleNameOf = useMemo(() => (id: string) => {
    const role = roles.find(r => r.id === id);
    return role ? roleDisplayName(role, lang) : id;
  }, [roles, lang]);
  const CAP = 200;
  const actions = useMemo(() => auditActions(log), [log]);
  const matching = useMemo(() => filterAudit(log, filter, nameOf, roleNameOf), [log, filter, nameOf, roleNameOf]);
  const shown = useMemo(() => latestAudit(matching, CAP), [matching]);
  const [toast, setToast] = useState<string | null>(null);
  const when = (at: number) => new Date(at).toLocaleString(dateLocale(lang), { dateStyle: 'medium', timeStyle: 'short' });

  // The export is real: every matching event, not just the visible page,
  // as a CSV that opens in Excel with its Arabic intact (UTF-8 BOM).
  const exportCsv = () => {
    const rows = auditExportRows(matching, nameOf, lang, roleNameOf);
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = ['\uFEFF' + ['at', 'actor', 'action', 'target', 'before', 'after', 'detail'].join(','),
      ...rows.map(r => [new Date(r.at).toISOString(), r.actor, r.action, r.target, r.before, r.after, r.detail].map(cell).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoked after the click has been handed to the browser: revoking at
    // once cancels the download in Chromium.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast(t('ad.exported', lang));
    window.setTimeout(() => setToast(null), 2600);
  };

  type Ev = (typeof shown)[number];
  const columns: Column<Ev>[] = [
    { id: 'what', header: t('ad.col.what', lang), cell: e => <span className="c-tx1">{describeAudit(e, nameOf, lang, roleNameOf)}</span> },
    { id: 'when', header: t('ad.col.when', lang), sortValue: e => e.at, cell: e => <span className="t-sm"><Num>{when(e.at)}</Num></span> },
    { id: 'type', header: t('ad.col.type', lang), cell: e => <span className="t-label" lang="en" dir="ltr">{actionOf(e)}</span> },
  ];

  return (
    <section aria-labelledby="ad-audit">
      <SectionHeader id="ad-audit" title={t('ad.audittitle', lang)} count={matching.length} description={t('ad.auditsub', lang)}
        action={canExport && matching.length > 0 ? <Button variant="ghost" onClick={exportCsv}>{t('ad.exportcsv', lang)}</Button> : undefined} />
      <div className="form-grid mt-4">
        <FormField id="audit-q" label={t('ad.searcharia', lang)}>
          {p => <input {...p} type="search" className="field" value={filter.text ?? ''}
            onChange={e => setFilter(f => ({ ...f, text: e.target.value || undefined }))} />}
        </FormField>
        <FormField id="audit-type" label={t('ad.actiontype', lang)}>
          {p => (
            <select {...p} className="field" value={filter.action ?? ''}
              onChange={e => setFilter(f => ({ ...f, action: e.target.value || undefined }))}>
              <option value="">{t('ad.allactions', lang)}</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </FormField>
      </div>
      {(filter.text || filter.action) && (
        <div className="mt-3"><button type="button" className="icon-btn" onClick={() => setFilter({})}>{t('dt.reset', lang)}</button></div>
      )}
      <div className="mt-4">
        {shown.length === 0 ? (
          <EmptyState title={t('ad.noevents', lang)} body={t('ad.noeventsbody', lang)} />
        ) : (
          <DataTable caption={t('ad.audittitle', lang)} columns={columns} rows={shown}
            rowKey={auditKey} initialSort={{ id: 'when', dir: 'desc' }} />
        )}
        {matching.length > CAP && <p className="t-sm mt-3 mb-0">{tf('ad.showing', { events: eventCount(CAP, lang) }, lang)}</p>}
      </div>
      <Toast message={toast} />
    </section>
  );
};
