/**
 * ReadinessReportView — the readiness report a trainer, branch manager and
 * department manager read about one trainee: «هل المتدرب جاهز يشتغل في مكتب
 * العضويات لوحده؟».
 *
 * Answer first, then evidence, then context — and each under its own name:
 *   الإجابة            the readiness assessment (stations, conduct, manager)
 *   الأدلة             practical performance — the trainer's unit evaluations
 *   التقدم في البرنامج  units approved
 * It reads one pure composition (domain/readiness/report). The old page led
 * with «87% جاهزية تشغيلية» from the unit evaluations and a verdict derived
 * from them; that number is now labelled as what it is, under the answer.
 */
import React from 'react';
import { ShieldCheck, AlertTriangle, Lock, Info } from 'lucide-react';
import { useTraining, trainingStore } from '../../app/training/trainingStore';
import { useIdentity, identityStore, useCan } from '../../app/identity/identityStore';
import { managementLabel } from '../../domain/identity/access';
import { scopeOf, isInScope } from '../../domain/identity/scope';
import { orgStore } from '../../app/organization/orgStore';
import { readinessReport } from '../../domain/readiness/report';
import { ScreenHeader, Card, Eyebrow, StatusBadge, EmptyState, ArabicContent } from '../../ui/primitives';
import { WIDTH } from '../../ui/designSystem';
import { tone, ENGINE_DECISION, GAP } from '../../ui/statusSemantics';
import { formalLabel, FormalStatus, PerformanceLine, PerformanceProfile } from './labels';
import { useLang, t as tr, tf, type Key } from '../../app/i18n';

export const ReadinessReportView: React.FC<{ employeeId: string; onExit: () => void }> = ({ employeeId, onExit }) => {
  const lang = useLang();
  const t = useTraining();
  const { users } = useIdentity();
  const canDo = useCan();

  // This is a URL route (#/readiness-report/:id), so it authorises the id
  // itself with the same scopeOf + isInScope used everywhere else.
  const target = users.find(u => u.id === employeeId);
  const scope = scopeOf(identityStore.currentUser(), canDo, orgStore.get());
  const authorized = !!target && isInScope(target, scope);

  const name = target?.name ?? employeeId;

  // Fail closed completely: an unauthorized viewer never reaches the report
  // body at all, not even an empty/zeroed version of it. Defense in depth —
  // `evals` being empty above already prevents real data leaking into the
  // verdict calculation, but stopping here means no verdict is computed or
  // shown for a target outside scope, period.
  if (!authorized) {
    return (
      <div className="min-h-screen">
        <ScreenHeader onBack={onExit} backLabel={tr(managementLabel(canDo).back as Key, lang)} leading={<span className="t-title c-tx0">{tr('rr.title', lang)}</span>} />
        <main style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-9) var(--sp-5)' }}>
          <EmptyState icon={<Lock size={22} />} title={tr('rr.noaccess', lang)} body={tr("rr.noaccessbody", lang)} />
        </main>
      </div>
    );
  }

  const r = readinessReport(t, trainingStore.events(), employeeId);
  const f = r.formal;
  const perf = r.performance;
  const decisionKey = f.managerDecision
    ? ({ ready: 'mg.decready', extend: 'mg.extendlong', reject: 'mg.decreject' } as const)[f.managerDecision.decision]
    : null;

  return (
    <div className="min-h-screen">
      <ScreenHeader
        onBack={onExit}
        backLabel={tr(managementLabel(canDo).back as Key, lang)}
        leading={<span className="t-title c-tx0">{tr('rr.title', lang)}</span>}
      />

      <main className="stack gap-6" style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>

        {/* ── The answer: the readiness assessment, and nothing else ── */}
        <Card tone="accent" pad={6}>
          <Eyebrow icon={<ShieldCheck size={13} />}>{tr('fr.title', lang)} — {name}</Eyebrow>
          <h1 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>{formalLabel(f, lang)}</h1>
          <p className="t-sm measure mb-4">
            {f.status === 'not_open'
              ? tf('fr.not_open.body', { a: r.programme.approved, b: r.programme.total }, lang)
              : f.status === 'in_progress' || f.status === 'awaiting_decision' || f.status === 'certified'
                ? tr(`fr.${f.status}.body` as Key, lang)
                : f.managerDecision?.rationale ?? ''}
          </p>
          <dl className="report-facts">
            {f.open && (
              <>
                <dt className="t-sm c-tx2">{tr('fr.engine', lang)}</dt>
                <dd className="row items-center gap-2 wrap m-0">
                  {/* The engine is fail-closed: with a station missing it says
                      «not ready», which is right for certification and false as
                      a verdict — nothing was judged yet. The trainee's page and
                      the employee file say so; the report says the same. */}
                  {f.status === 'in_progress'
                    ? <StatusBadge tone="pending">{tr('rd.noverdict', lang)}</StatusBadge>
                    : <StatusBadge tone={tone(ENGINE_DECISION[f.engine.decision])}>{tr(`rd.dec.${f.engine.decision}` as Key, lang)}</StatusBadge>}
                  <span className="t-sm t-num c-tx2">{tf('rd.progress', { n: f.stationsDone, total: f.stationsTotal }, lang)}</span>
                </dd>
              </>
            )}
            <dt className="t-sm c-tx2">{tr('rr.lastdecision', lang)}</dt>
            <dd className="m-0">
              {decisionKey
                ? <FormalStatus f={f} lang={lang} />
                : <span className="t-sm c-tx3">{tr('rr.nodecision', lang)}</span>}
            </dd>
          </dl>
          {f.open && f.engine.reasons.length > 0 && (
            <ul role="list" className="stack gap-2" style={{ listStyle: 'none', margin: 'var(--sp-4) 0 0', padding: 0 }}>
              {f.engine.reasons.map(reason => (
                <li key={reason} className="row gap-2 items-start">
                  <Info size={13} className="c-tx3 mt-1 no-shrink" aria-hidden />
                  <ArabicContent as="span" className="t-sm">{reason}</ArabicContent>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── The evidence: practical performance, named as an indicator ── */}
        <section aria-labelledby="rr-perf" className="stack gap-3">
          <h2 id="rr-perf" className="t-h3 m-0">{tr('rr.evidence', lang)}: {tr('perf.title', lang)}</h2>
          <p className="t-sm c-tx2 m-0">
            <PerformanceLine p={perf} lang={lang} />. {tr('perf.note', lang)}
          </p>
          {perf.evaluations > 0 && <PerformanceProfile p={perf} lang={lang} caption={tr('perf.dims', lang)} />}
          {r.developmentAreas.length > 0 && (
            <div>
              <Eyebrow icon={<AlertTriangle size={13} />}>{tr('rr.development', lang)}</Eyebrow>
              <div className="stack mt-3 gap-3">
                {r.developmentAreas.map(d => (
                  <Card key={d.dimension} tone="quiet" pad={4}>
                    <div className="row items-center gap-2">
                      <span className="t-sm grow">{d.label}</span>
                      <StatusBadge tone={tone(GAP[d.critical ? 'critical' : 'developmental'])}>{tr(d.critical ? 'gap.critical' : 'gap.developmental', lang)}</StatusBadge>
                    </div>
                    <p className="t-sm mt-2 c-tx2">{d.why}</p>
                    <p className="t-sm mt-1 c-tx3">{tr('rr.suggestion', lang)} {d.suggestion}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── The context: programme progress ── */}
        <section aria-labelledby="rr-prog">
          <h2 id="rr-prog" className="t-h3 m-0">{tr('rr.programme', lang)}</h2>
          <p className="t-sm c-tx2 mt-2">{tf('rr.unitsof', { a: r.programme.approved, b: r.programme.total }, lang)}</p>
        </section>
      </main>
    </div>
  );
};
