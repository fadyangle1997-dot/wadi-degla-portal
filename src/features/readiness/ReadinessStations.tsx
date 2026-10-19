/**
 * Readiness assessment, shared by the trainer (stations 1–5 and conduct) and
 * the manager (station 6, the readiness interview). Each station is one
 * observed encounter scored only on the KPIs it measures, with the observation
 * that justifies the score. The result comes from the readiness engine
 * (assessReadiness) over everything recorded so far.
 */
import React, { useMemo, useState } from 'react';
import { ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useTrainingEvents, trainingStore } from '../../app/training/trainingStore';
import { assessReadiness, STATIONS, type Station } from '../../domain/readiness';
import {
  readinessInputOf, latestStationAssessments, latestConduct, stationAssessmentProblem, stationsFor,
} from '../../domain/readiness/evidence';
import {
  EVALUATION_DIMENSIONS, CONDUCT_CHECKS, ALL_CONDUCT_CHECKS,
  type EvaluationDimension, type EvaluationDecision, type ConductObservations,
} from '../../domain/evaluation';
import { Button, StatusBadge, ArabicContent, Eyebrow } from '../../ui/primitives';
import { useLang, t as tr, tf, type Key } from '../../app/i18n';

const DECISION_TONE: Record<EvaluationDecision, 'ready' | 'attn' | 'risk' | 'info'> = {
  ready: 'ready', extend: 'attn', not_ready: 'risk', escalate: 'info',
};

/** The engine's verdict for one trainee, with the reasons behind it. */
export const ReadinessOutcomeSummary: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const lang = useLang();
  const events = useTrainingEvents();
  const outcome = useMemo(() => assessReadiness(readinessInputOf(events, employeeId)), [events, employeeId]);
  const done = STATIONS.length - outcome.stationsMissing.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <span className="t-label">{tr('rd.outcome', lang)}</span>
        <StatusBadge tone={DECISION_TONE[outcome.decision]}>{tr(`rd.dec.${outcome.decision}` as Key, lang)}</StatusBadge>
        <span className="t-sm t-num" style={{ color: 'var(--tx2)' }}>{tf('rd.progress', { n: done, total: STATIONS.length }, lang)}</span>
      </div>
      {outcome.reasons.map(r => (
        <ArabicContent key={r} as="div" className="t-sm" style={{ color: 'var(--tx2)' }}>{r}</ArabicContent>
      ))}
    </div>
  );
};

/** The stations one assessor owns, plus conduct for the trainer. */
export const StationAssessment: React.FC<{
  employeeId: string;
  assessor: Station['assessor'];
  onSaved: (message: string) => void;
}> = ({ employeeId, assessor, onSaved }) => {
  const lang = useLang();
  const events = useTrainingEvents();
  const latest = latestStationAssessments(events, employeeId);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {stationsFor(assessor).map(st => {
        const prev = latest.get(st.id);
        const isOpen = open === st.id;
        return (
          <div key={st.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--s-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)', flexWrap: 'wrap' }}>
              <span className="t-num t-label" style={{ color: 'var(--g1)' }}>{st.order}</span>
              <ArabicContent as="span" className="t-sm" style={{ flex: '1 1 200px', color: 'var(--tx0)' }}>{st.title}</ArabicContent>
              <StatusBadge tone={prev ? 'ready' : 'neutral'}>
                {prev ? <span className="t-num">{average(prev.scores, st.measures)}%</span> : tr('rd.notyet', lang)}
              </StatusBadge>
              <Button variant="ghost" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : st.id)}>
                {prev ? tr('rd.update', lang) : tr('rd.assess', lang)}
              </Button>
            </div>
            {isOpen && (
              <StationForm
                station={st}
                initial={prev?.scores}
                initialObservation={prev?.observation ?? ''}
                onSave={(scores, observation) => {
                  trainingStore.assessStation({ employeeId, stationId: st.id, scores, observation });
                  setOpen(null);
                  onSaved(tr('rd.saved', lang));
                }}
              />
            )}
          </div>
        );
      })}
      {assessor === 'trainer' && (
        <ConductForm
          key={employeeId}
          initial={latestConduct(events, employeeId)}
          onSave={conduct => { trainingStore.observeConduct(employeeId, conduct); onSaved(tr('rd.conductsaved', lang)); }}
        />
      )}
    </div>
  );
};

const average = (scores: Readonly<Partial<Record<EvaluationDimension, number>>>, dims: readonly EvaluationDimension[]) =>
  Math.round(dims.reduce((n, d) => n + (scores[d] ?? 0), 0) / Math.max(1, dims.length));

const StationForm: React.FC<{
  station: Station;
  initial?: Readonly<Partial<Record<EvaluationDimension, number>>>;
  initialObservation: string;
  onSave: (scores: Partial<Record<EvaluationDimension, number>>, observation: string) => void;
}> = ({ station, initial, initialObservation, onSave }) => {
  const lang = useLang();
  const [scores, setScores] = useState<Partial<Record<EvaluationDimension, number>>>(
    () => Object.fromEntries(station.measures.map(d => [d, initial?.[d] ?? 70])));
  const [observation, setObservation] = useState(initialObservation);
  const problem = stationAssessmentProblem(station, scores, observation);
  const obsId = `obs-${station.id}`;

  return (
    <div style={{ padding: '0 var(--sp-4) var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      <ArabicContent as="div" className="t-sm measure" style={{ color: 'var(--tx2)' }}>{station.situation}</ArabicContent>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sp-3)' }}>
        {station.measures.map(d => (
          <label key={d} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
            <ArabicContent as="span" className="t-sm">{EVALUATION_DIMENSIONS[d]}</ArabicContent>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <input type="range" min={0} max={100} value={scores[d] ?? 70} aria-label={EVALUATION_DIMENSIONS[d]}
                onChange={e => setScores(s => ({ ...s, [d]: Number(e.target.value) }))}
                style={{ flex: 1, accentColor: 'var(--g2)', minHeight: 44 }} />
              <span className="t-num t-sm" style={{ width: 'var(--sp-5)', textAlign: 'end' }}>{scores[d]}</span>
            </span>
          </label>
        ))}
      </div>
      <label htmlFor={obsId} className="t-label">{tr('rd.observation', lang)}</label>
      <textarea id={obsId} className="field" rows={2} dir="auto" value={observation} onChange={e => setObservation(e.target.value)}
        style={{ width: '100%', resize: 'vertical' }} />
      <div>
        <Button disabled={problem !== null} onClick={() => onSave(scores, observation)}>
          <ClipboardCheck size={16} /> {tr('rd.save', lang)}
        </Button>
      </div>
    </div>
  );
};

const ConductForm: React.FC<{ initial: ConductObservations; onSave: (c: ConductObservations) => void }> = ({ initial, onSave }) => {
  const lang = useLang();
  const [conduct, setConduct] = useState<ConductObservations>(initial);
  return (
    <div style={{ padding: 'var(--sp-4)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
      <div className="t-label" style={{ marginBottom: 'var(--sp-3)' }}>{tr('rd.conduct', lang)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {ALL_CONDUCT_CHECKS.map(c => (
          <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', cursor: 'pointer', minHeight: 34 }}>
            <input type="checkbox" checked={conduct[c] === true} style={{ width: 17, height: 17, accentColor: 'var(--g2)' }}
              onChange={e => setConduct(p => ({ ...p, [c]: e.target.checked }))} />
            <ArabicContent as="span" className="t-sm">{CONDUCT_CHECKS[c]}</ArabicContent>
          </label>
        ))}
      </div>
      <div style={{ marginTop: 'var(--sp-3)' }}>
        <Button variant="ghost" onClick={() => onSave(conduct)}>{tr('rd.conductsave', lang)}</Button>
      </div>
    </div>
  );
};

/** A collapsible readiness block for one trainee: the verdict, then the stations. */
export const TraineeReadinessBlock: React.FC<{
  employeeId: string; name: string; assessor: Station['assessor']; onSaved: (m: string) => void;
}> = ({ employeeId, name, assessor, onSaved }) => {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  return (
    <section aria-label={`${tr('rd.title', lang)} — ${name}`}
      style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <Eyebrow>{name}</Eyebrow>
        <div style={{ flex: 1 }} />
        <Button variant="ghost" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {open ? tr('rd.close', lang) : tr('rd.open', lang)}
        </Button>
      </div>
      <ReadinessOutcomeSummary employeeId={employeeId} />
      {open && <StationAssessment employeeId={employeeId} assessor={assessor} onSaved={onSaved} />}
    </section>
  );
};
