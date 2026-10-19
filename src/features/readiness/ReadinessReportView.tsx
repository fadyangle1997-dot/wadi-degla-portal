/**
 * ReadinessReportView — the single Operational Readiness Report, read by the
 * trainer, branch manager and department manager to answer one question:
 * «هل المتدرب جاهز تشغيليًا يشتغل في مكتب العضويات؟»
 *
 * Executive, decision-first: the verdict and its reasons come first; the
 * evidence (dimensions, strengths, development areas, risk) follows for anyone
 * who wants to verify. Reads one pure aggregator (operationalReadinessReport) —
 * no calculation lives here, only presentation. Design-System primitives only.
 */
import React from 'react';
import { ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2, Info, Lock } from 'lucide-react';
import { useTraining, trainingStore } from '../../app/training/trainingStore';
import { useIdentity, identityStore, useCan } from '../../app/identity/identityStore';
import { scopeOf, isInScope } from '../../domain/identity/scope';
import { orgStore } from '../../app/organization/orgStore';
import { operationalReadinessReport, type ReadinessVerdict, type RiskLevel } from '../../domain/readiness/report';
import { DECISION_LABEL } from '../../domain/evaluation';
import type { OrgEvent } from '../../domain/analytics/organization';
import { ScreenHeader, Card, Eyebrow, StatusBadge, EmptyState, ArabicContent, Num } from '../../ui/primitives';
import { WIDTH } from '../../ui/designSystem';
import { useLang, t as tr, type Key } from '../../app/i18n';

/* Module level = no translation context, so these tables carry KEYS and the
   component resolves them — the same pattern the journey's STATUS_META uses. */
const VERDICT_META: Record<ReadinessVerdict, { labelKey: Key; tone: 'ready' | 'attn' | 'risk'; lineKey: Key }> = {
  ready: { labelKey: 'rr.readywork', tone: 'ready', lineKey: 'rr.readyline' },
  ready_with_conditions: { labelKey: 'rr.readycond', tone: 'attn', lineKey: 'rr.condline' },
  extend: { labelKey: 'rr.extendlong', tone: 'attn', lineKey: 'rr.extendline' },
  not_ready: { labelKey: 'rr.notready', tone: 'risk', lineKey: 'rr.notreadyline' },
};

const RISK_META: Record<RiskLevel, { labelKey: Key; tone: 'ready' | 'attn' | 'risk' }> = {
  low: { labelKey: 'rr.risklow', tone: 'ready' },
  medium: { labelKey: 'rr.riskmed', tone: 'attn' },
  high: { labelKey: 'rr.riskhigh', tone: 'risk' },
};

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
  const evals = authorized
    ? (trainingStore.events() as readonly OrgEvent[])
        .filter(e => e.type === 'EVALUATION_RECORDED' && e.employeeId === employeeId)
        .map(e => ({ scores: e.scores, decision: e.decision, at: e.at }))
    : [];

  // Fail closed completely: an unauthorized viewer never reaches the report
  // body at all, not even an empty/zeroed version of it. Defense in depth —
  // `evals` being empty above already prevents real data leaking into the
  // verdict calculation, but stopping here means no verdict is computed or
  // shown for a target outside scope, period.
  if (!authorized) {
    return (
      <div className="min-h-screen">
        <ScreenHeader onBack={onExit} leading={<span className="t-title c-g1">{tr('rr.title', lang)}</span>} />
        <main style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-9) var(--sp-5)' }}>
          <EmptyState icon={<Lock size={22} />} title={tr('rr.noaccess', lang)} body={tr("rr.noaccessbody", lang)} />
        </main>
      </div>
    );
  }

  const r = operationalReadinessReport(t, employeeId, evals);
  const v = VERDICT_META[r.verdict];
  const risk = RISK_META[r.risk];

  return (
    <div className="min-h-screen">
      <ScreenHeader
        onBack={onExit}
        leading={<span className="t-title c-g1">{tr('rr.title', lang)}</span>}
      />

      <main className="stack gap-6" style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>

        {/* ── Executive verdict — decision first ── */}
        <Card tone="accent" pad={6}>
          <div className="row items-center gap-3 wrap">
            <Eyebrow icon={<ShieldCheck size={13} />}>{tr('rr.summary', lang)} {name}</Eyebrow>
            <div className="grow" />
            <StatusBadge tone={v.tone}>{tr(v.labelKey, lang)}</StatusBadge>
          </div>
          <h1 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}><Num>{r.overall}%</Num> {tr('rr.operational', lang)}</h1>
          <p className="t-sm measure mb-4">{tr(v.lineKey, lang)}</p>
          <div className="row gap-2 wrap">
            <StatusBadge tone={risk.tone}>{tr(risk.labelKey, lang)}</StatusBadge>
            <StatusBadge tone="neutral">{r.modulesApproved}/{r.modulesTotal} {tr('rr.unitsapp', lang)}</StatusBadge>
            {r.evaluationsCount > 0 && <StatusBadge tone="neutral">{r.evaluationsCount} {tr('rr.assessments', lang)}</StatusBadge>}
          </div>
          {r.reasons.length > 0 && (
            <ul role="list" className="stack gap-2" style={{ listStyle: 'none', margin: 'var(--sp-4) 0 0', padding: 0 }}>
              {r.reasons.map((reason, i) => (
                <li key={i} className="row gap-2 items-start">
                  <Info size={13} className="c-tx3 mt-1 no-shrink" aria-hidden />
                  <span className="t-sm">{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── Critical operational dimensions — highlight failures ── */}
        <section aria-label={tr('rr.dimensions', lang)}>
          <Eyebrow>{tr('rr.dimensions', lang)}</Eyebrow>
          <div className="stack mt-3 gap-2">
            {r.dimensions.map(d => (
              <div key={d.dimension} className="row items-center gap-3">
                <span className="t-sm grow" style={{ minWidth: 0, color: d.belowFloor ? 'var(--risk)' : 'var(--tx1)' }}>
                  {/* `d.label` is assessment content (the dimension's own
                      Arabic name from the readiness engine) — an island, never
                      a translation. The «critical» flag beside it is chrome. */}
                  <ArabicContent as="span">{d.label}</ArabicContent>
                  {d.critical && <span className="t-label c-tx3" style={{ marginInlineStart: 'var(--sp-2)' }}>{tr('rr.critical', lang)}</span>}
                </span>
                <div style={{ width: 140, height: 5, borderRadius: 'var(--r-full)', background: 'var(--line-2)', overflow: 'hidden' }}
                  role="progressbar" aria-valuenow={d.score} aria-valuemin={0} aria-valuemax={100} aria-label={d.label}>
                  <div style={{ width: `${d.score}%`, height: '100%', borderRadius: 'var(--r-full)', background: d.belowFloor ? 'var(--risk)' : d.score >= 85 ? 'var(--ready)' : 'var(--g2)' }} />
                </div>
                <span className="t-num t-label" style={{ minWidth: 34, textAlign: 'end', color: d.belowFloor ? 'var(--risk)' : 'var(--tx2)' }}>{d.score}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Strengths ── */}
        {r.strengths.length > 0 && (
          <section aria-label={tr('rr.strengths', lang)}>
            <Eyebrow icon={<TrendingUp size={13} />}>{tr('rr.strengths', lang)}</Eyebrow>
            <div className="row mt-3 wrap gap-2">
              {r.strengths.map(s => (
                <StatusBadge key={s.dimension} tone="ready" icon={<CheckCircle2 size={13} />}>{s.label} · {s.score}</StatusBadge>
              ))}
            </div>
          </section>
        )}

        {/* ── Development areas — why + evidence + suggestion ── */}
        {r.developmentAreas.length > 0 && (
          <section aria-label={tr('rr.development', lang)}>
            <Eyebrow icon={<AlertTriangle size={13} />}>{tr('rr.development', lang)}</Eyebrow>
            <div className="stack mt-3 gap-3">
              {r.developmentAreas.map(d => (
                <Card key={d.dimension} tone="quiet" pad={4}>
                  <div className="row items-center gap-2">
                    <span className="t-sm grow" style={{ color: d.critical ? 'var(--risk)' : 'var(--tx1)' }}>{d.label}</span>
                    {d.critical && <StatusBadge tone="risk">{tr('rr.critical', lang)}</StatusBadge>}
                  </div>
                  <p className="t-sm mt-2 c-tx2">{d.why}</p>
                  <p className="t-sm mt-1 c-tx3">{tr('rr.suggestion', lang)} {d.suggestion}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Trainer recommendation + manager decision (reused, not duplicated) ── */}
        <section aria-label={tr('rr.decision', lang)}>
          <Eyebrow>{tr('rr.decision', lang)}</Eyebrow>
          <div className="stack mt-3 gap-2">
            <div className="row items-center gap-3">
              <span className="t-sm grow c-tx2">{tr('rr.trainerrec', lang)}</span>
              {r.trainerRecommendation
                ? <StatusBadge tone="neutral">{DECISION_LABEL[r.trainerRecommendation]}</StatusBadge>
                : <span className="t-label c-tx3">{tr('rr.pending', lang)}</span>}
            </div>
            <div className="row items-center gap-3">
              <span className="t-sm grow c-tx2">{tr('rr.managerdec', lang)}</span>
              {r.managerDecision
                ? <StatusBadge tone={r.managerDecision.decision === 'ready' ? 'ready' : r.managerDecision.decision === 'extend' ? 'attn' : 'risk'}>
                    {r.managerDecision.decision === 'ready' ? tr('rr.readywork', lang) : r.managerDecision.decision === 'extend' ? tr('rr.extend', lang) : tr('rr.notready', lang)}
                  </StatusBadge>
                : <span className="t-label c-tx3">{tr('rr.waitprogram', lang)}</span>}
            </div>
            {r.managerDecision?.rationale && (
              <p className="t-sm c-tx3 mt-1">{r.managerDecision.rationale}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
