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
  CONDUCT_CHECKS, ALL_CONDUCT_CHECKS,
  type EvaluationDimension, type ConductObservations,
} from '../../domain/evaluation';
import { Button, ArabicContent, Status, useExitFlow } from '../../ui/primitives';
import { ReadinessTrack } from './ReadinessTrack';
import { RubricPick } from '../trainer/RubricPick';
import { levelOf, scoresFromLevels, type LevelPicks } from '../../domain/rubric';
import { CRITICAL_DIMENSIONS } from '../../domain/readiness';
import { FormalStatus } from './labels';
import { tone, ENGINE_DECISION } from '../../ui/statusSemantics';
import { useLang, t as tr, tf, type Key } from '../../app/i18n';


/** Staff only see readiness for trainees who finished the programme. */
const useStanding = (employeeId: string) => {
  const events = useTrainingEvents();
  const training = useTraining();
  return useMemo(() => readinessStanding(training, events, employeeId, true), [training, events, employeeId]);
};

/**
 * Where one trainee's readiness assessment stands, with the reasons behind it.
 * While stations are missing it says so (the formal status); the engine's
 * verdict is named only once there is evidence for it to be a verdict on.
 */
export const ReadinessOutcomeSummary: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const lang = useLang();
  const { outcome, formal } = useStanding(employeeId);
  const done = STATIONS.length - outcome.stationsMissing.length;
  return (
    <div className="stack gap-2">
      <div className="row items-center gap-4 wrap">
        <span className="t-label">{tr('fr.title', lang)}</span>
        <FormalStatus f={formal} lang={lang} />
        {done === STATIONS.length && (
          <>
            <span className="t-label">{tr('rd.outcome', lang)}</span>
            <Status tone={tone(ENGINE_DECISION[outcome.decision])}>{tr(`rd.dec.${outcome.decision}` as Key, lang)}</Status>
          </>
        )}
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

/**
 * One station, assessed by behaviour on the KPIs it measures. Every KPI starts
 * «لسه ما اتقيّمش» — the old sliders opened at 70, exactly the critical floor,
 * and could be saved untouched. A re-assessment starts from the levels the
 * last observation's scores correspond to (levelOf), so updating is not
 * re-typing. Nothing saves until every KPI has a level and the observation
 * that justifies it is written.
 */
const StationForm: React.FC<{
  station: Station;
  initial?: Readonly<Partial<Record<EvaluationDimension, number>>>;
  initialObservation: string;
  onSave: (scores: Partial<Record<EvaluationDimension, number>>, observation: string) => void;
}> = ({ station, initial, initialObservation, onSave }) => {
  const lang = useLang();
  const startPicks = useMemo<LevelPicks>(
    () => Object.fromEntries(station.measures.flatMap(d => typeof initial?.[d] === 'number' ? [[d, levelOf(initial[d])]] : [])),
    [station, initial]);
  const [picks, setPicks] = useState<LevelPicks>(startPicks);
  const [observation, setObservation] = useState(initialObservation);
  // Levels moved or an observation typed is evidence: leaving it — the file's
  // ×, Escape, Back, another screen — asks first and says what goes.
  const dirty = observation.trim() !== initialObservation.trim()
    || station.measures.some(d => picks[d] !== startPicks[d]);
  const { dialog } = useExitFlow(dirty, {
    title: tf('rd.leaveask', { station: station.title }, lang),
    body: tr('rd.leavebody', lang),
    leaveLabel: tr('rd.leavego', lang),
    stayLabel: tr('rd.leavestay', lang),
  });
  const scores = scoresFromLevels(picks, station.measures) ?? {};
  const problem = stationAssessmentProblem(station, scores, observation);
  const obsId = `obs-${station.id}`;
  const [tried, setTried] = useState(false);
  const showObs = tried && problem === 'missing_observation';

  return (
    <div className="station-form stack gap-3">
      <ArabicContent as="div" className="t-sm measure c-tx2">{station.situation}</ArabicContent>
      {station.measures.map(d => (
        <RubricPick key={d} idPrefix={`st-${station.id}`} dimension={d} value={picks[d]} lang={lang}
          critical={CRITICAL_DIMENSIONS.includes(d)} missing={tried && picks[d] === undefined}
          onChange={level => setPicks(p => ({ ...p, [d]: level }))} />
      ))}
      <label htmlFor={obsId} className="form-label">{tr('rd.observation', lang)}</label>
      <textarea id={obsId} className="field w-full" rows={2} dir="auto" value={observation} onChange={e => setObservation(e.target.value)}
        aria-invalid={showObs || undefined} aria-describedby={showObs ? `${obsId}-err` : undefined} aria-required
        style={{ resize: 'vertical' }} />
      {showObs && <p id={`${obsId}-err`} className="form-error">{tr('rd.err.obs', lang)}</p>}
      <div>
        <Button onClick={() => {
          if (problem !== null) {
            setTried(true);
            const first = station.measures.find(d => picks[d] === undefined);
            if (first) document.getElementById(`st-${station.id}-${first}`)?.querySelector<HTMLInputElement>('input')?.focus();
            else document.getElementById(obsId)?.focus();
            return;
          }
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
