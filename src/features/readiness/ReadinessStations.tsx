/**
 * Readiness assessment, shared by the trainer (stations 1–5 and conduct) and
 * the manager (station 6, the readiness interview). Each station is one
 * observed encounter scored only on the KPIs it measures, with the observation
 * that justifies the score. The result comes from the readiness engine
 * (assessReadiness) over everything recorded so far.
 */
import React, { useMemo, useState } from 'react';
import { ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useTrainingEvents, useTraining, trainingStore } from '../../app/training/trainingStore';
import { STATIONS, type Station } from '../../domain/readiness';
import { latestConduct, stationAssessmentProblem } from '../../domain/readiness/evidence';
import { readinessStanding } from '../../domain/readiness/track';
import {
  EVALUATION_DIMENSIONS, CONDUCT_CHECKS, ALL_CONDUCT_CHECKS,
  type EvaluationDimension, type EvaluationDecision, type ConductObservations,
} from '../../domain/evaluation';
import { Button, ArabicContent, Status, useExitFlow } from '../../ui/primitives';
import { ReadinessTrack } from './ReadinessTrack';
import { useLang, t as tr, tf, type Key } from '../../app/i18n';

const DECISION_TONE: Record<EvaluationDecision, 'ready' | 'attn' | 'risk' | 'info'> = {
  ready: 'ready', extend: 'attn', not_ready: 'risk', escalate: 'info',
};

/** Staff only see readiness for trainees who finished the programme. */
const useStanding = (employeeId: string) => {
  const events = useTrainingEvents();
  const training = useTraining();
  return useMemo(() => readinessStanding(training, events, employeeId, true), [training, events, employeeId]);
};

/** The engine's verdict for one trainee, with the reasons behind it. */
export const ReadinessOutcomeSummary: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const lang = useLang();
  const { outcome } = useStanding(employeeId);
  const done = STATIONS.length - outcome.stationsMissing.length;
  return (
    <div className="stack gap-2">
      <div className="row items-center gap-4 wrap">
        <span className="t-label">{tr('rd.outcome', lang)}</span>
        <Status tone={DECISION_TONE[outcome.decision]}>{tr(`rd.dec.${outcome.decision}` as Key, lang)}</Status>
        <span className="t-sm t-num c-tx2">{tf('rd.progress', { n: done, total: STATIONS.length }, lang)}</span>
      </div>
      {outcome.reasons.map(r => (
        <ArabicContent key={r} as="div" className="t-sm c-tx2">{r}</ArabicContent>
      ))}
    </div>
  );
};

/** The stations one assessor owns, on the track, plus conduct for the trainer. */
export const StationAssessment: React.FC<{
  employeeId: string;
  assessor: Station['assessor'];
  onSaved: (message: string) => void;
  /** The caller knows the outline: station titles sit one level below it. */
  headingLevel?: 3 | 4;
}> = ({ employeeId, assessor, onSaved, headingLevel = 4 }) => {
  const lang = useLang();
  const events = useTrainingEvents();
  const { track } = useStanding(employeeId);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="stack gap-6">
      <ReadinessTrack label={tr('tr.stations', lang)} headingLevel={headingLevel}
        standings={track.filter(s => s.station.assessor === assessor)}
        action={s => {
          const isOpen = open === s.station.id;
          return (
            <Button variant="ghost" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.station.id)}>
              {s.assessment ? tr('rd.update', lang) : tr('rd.assess', lang)}
            </Button>
          );
        }}
        extra={s => open === s.station.id ? (
          <StationForm
            station={s.station}
            initial={s.assessment?.scores}
            initialObservation={s.assessment?.observation ?? ''}
            onSave={(scores, observation) => {
              trainingStore.assessStation({ employeeId, stationId: s.station.id, scores, observation });
              setOpen(null);
              onSaved(tr('rd.saved', lang));
            }}
          />
        ) : null} />
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
  // Scores moved or an observation typed is evidence: leaving it — the file's
  // ×, Escape, Back, another screen — asks first and says what goes.
  const dirty = observation.trim() !== initialObservation.trim()
    || station.measures.some(d => (scores[d] ?? 70) !== (initial?.[d] ?? 70));
  const { dialog } = useExitFlow(dirty, {
    title: tf('rd.leaveask', { station: station.title }, lang),
    body: tr('rd.leavebody', lang),
    leaveLabel: tr('rd.leavego', lang),
    stayLabel: tr('rd.leavestay', lang),
  });
  const problem = stationAssessmentProblem(station, scores, observation);
  const obsId = `obs-${station.id}`;
  const [tried, setTried] = useState(false);
  const showObs = tried && problem === 'missing_observation';

  return (
    <div className="station-form stack gap-3">
      <ArabicContent as="div" className="t-sm measure c-tx2">{station.situation}</ArabicContent>
      <div className="gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
        {station.measures.map(d => (
          <label key={d} className="stack gap-1">
            <ArabicContent as="span" className="t-sm">{EVALUATION_DIMENSIONS[d]}</ArabicContent>
            <span className="row items-center gap-3">
              <input type="range" min={0} max={100} value={scores[d] ?? 70} aria-label={EVALUATION_DIMENSIONS[d]}
                onChange={e => setScores(s => ({ ...s, [d]: Number(e.target.value) }))}
                className="grow" style={{ accentColor: 'var(--g2)', minHeight: 44 }} />
              <span className="t-num t-sm" style={{ width: 'var(--sp-5)', textAlign: 'end' }}>{scores[d]}</span>
            </span>
          </label>
        ))}
      </div>
      <label htmlFor={obsId} className="form-label">{tr('rd.observation', lang)}</label>
      <textarea id={obsId} className="field w-full" rows={2} dir="auto" value={observation} onChange={e => setObservation(e.target.value)}
        aria-invalid={showObs || undefined} aria-describedby={showObs ? `${obsId}-err` : undefined} aria-required
        style={{ resize: 'vertical' }} />
      {showObs && <p id={`${obsId}-err`} className="form-error">{tr('rd.err.obs', lang)}</p>}
      <div>
        <Button onClick={() => {
          if (problem !== null) { setTried(true); document.getElementById(obsId)?.focus(); return; }
          onSave(scores, observation);
        }}>
          <ClipboardCheck size={16} /> {tr('rd.save', lang)}
        </Button>
      </div>
      {dialog}
    </div>
  );
};

const ConductForm: React.FC<{ initial: ConductObservations; onSave: (c: ConductObservations) => void }> = ({ initial, onSave }) => {
  const lang = useLang();
  const [conduct, setConduct] = useState<ConductObservations>(initial);
  return (
    <fieldset className="conduct">
      <legend className="panel-title">{tr('rd.conduct', lang)}</legend>
      <div className="stack">
        {ALL_CONDUCT_CHECKS.map(c => (
          <label key={c} className="conduct-row">
            <input type="checkbox" checked={conduct[c] === true}
              onChange={e => setConduct(p => ({ ...p, [c]: e.target.checked }))} />
            <ArabicContent as="span" className="t-sm c-tx1">{CONDUCT_CHECKS[c]}</ArabicContent>
          </label>
        ))}
      </div>
      <div className="mt-3">
        <Button variant="ghost" onClick={() => onSave(conduct)}>{tr('rd.conductsave', lang)}</Button>
      </div>
    </fieldset>
  );
};

/** One trainee's readiness in the trainer's list: the verdict, then their stations. */
export const TraineeReadinessBlock: React.FC<{
  employeeId: string; name: string; assessor: Station['assessor']; onSaved: (m: string) => void;
}> = ({ employeeId, name, assessor, onSaved }) => {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  return (
    <section aria-label={`${tr('rd.title', lang)} — ${name}`} className="readiness-block stack gap-3">
      <div className="row items-center gap-3 wrap">
        <h3 className="track-title grow">{name}</h3>
        <Button variant="ghost" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {open ? tr('rd.close', lang) : tr('rd.open', lang)}
        </Button>
      </div>
      <ReadinessOutcomeSummary employeeId={employeeId} />
      {open && <div className="mt-3"><StationAssessment employeeId={employeeId} assessor={assessor} onSaved={onSaved} /></div>}
    </section>
  );
};
