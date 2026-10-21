/**
 * One KPI, assessed by behaviour — a native radio group over the four rubric
 * levels, each with the sentence a trainer can point at (domain/rubric).
 *
 * It starts with NO level picked: «لسه ما اتقيّمش». There is no default and no
 * slider — the old forms opened at 80 (stations at 70) and could be submitted
 * untouched. A fieldset and legend name the KPI; the four options are plain
 * radios, so arrow keys, Space and screen readers behave natively; a missing
 * pick is said under the group and tied to it.
 */
import React from 'react';
import { RUBRIC, RUBRIC_LEVELS, type RubricLevel } from '../../domain/rubric';
import { EVALUATION_DIMENSIONS, type EvaluationDimension } from '../../domain/evaluation';
import { ArabicContent } from '../../ui/primitives';
import { t as tr, type Key, type Lang } from '../../app/i18n';

/** The rubric's level names as the interface says them (Arabic = domain/rubric LEVEL_NAME). */
const LEVEL_KEY: Record<RubricLevel, Key> = { 1: 'rb.level1', 2: 'rb.level2', 3: 'rb.level3', 4: 'rb.level4' };

export const RubricPick: React.FC<{
  idPrefix: string;
  dimension: EvaluationDimension;
  value: RubricLevel | undefined;
  onChange: (level: RubricLevel) => void;
  /** Show the «not assessed» error (after a submit attempt). */
  missing: boolean;
  critical?: boolean;
  lang: Lang;
}> = ({ idPrefix, dimension, value, onChange, missing, critical, lang }) => {
  const errId = `${idPrefix}-${dimension}-err`;
  return (
    <fieldset className="rubric" id={`${idPrefix}-${dimension}`} aria-describedby={missing ? errId : undefined}
      data-missing={missing || undefined}>
      <legend className="rubric-legend">
        <ArabicContent as="span">{EVALUATION_DIMENSIONS[dimension]}</ArabicContent>
        {critical && <span className="rubric-critical">{tr('rr.critical', lang)}</span>}
        <span className="rubric-state">{value ? tr(LEVEL_KEY[value], lang) : tr('pa.notassessed', lang)}</span>
      </legend>
      <div className="rubric-options">
        {RUBRIC_LEVELS.map(level => {
          const id = `${idPrefix}-${dimension}-${level}`;
          return (
            <label key={level} htmlFor={id} className="rubric-option" data-checked={value === level || undefined}>
              <input type="radio" id={id} name={`${idPrefix}-${dimension}`} value={level}
                checked={value === level} onChange={() => onChange(level)} required />
              <span className="rubric-level">
                <span className="t-num">{level}</span> · {tr(LEVEL_KEY[level], lang)}
              </span>
              <ArabicContent as="span" className="rubric-desc">{RUBRIC[dimension][level]}</ArabicContent>
            </label>
          );
        })}
      </div>
      {missing && <p id={errId} className="form-error">{tr('pa.err.level', lang)}</p>}
    </fieldset>
  );
};
