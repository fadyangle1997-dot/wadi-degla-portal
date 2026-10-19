/**
 * SkillsView — professional skill tracking (Phase 2 §3).
 * Renders the pure derivation from app/skills.ts: segmented bars, no points,
 * no streaks, no gamification — competency, stated plainly.
 */
import React from 'react';
import { m } from 'motion/react';
import { useProgress } from '../../app/progress';
import { skillProgress, skillState, SKILL_STATE_LABEL } from '../../app/skills';
import { SkillBar, EmptyState, Button, Crumbs } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { useLang, t } from '../../app/i18n';
import { WIDTH } from '../../ui/designSystem';

export const SkillsView: React.FC<{ onStartFirst: () => void }> = ({ onStartFirst }) => {
  const p = useProgress();
  const lang = useLang();
  const skills = skillProgress(p);
  const started = skills.some(s => s.earned > 0);

  return (
    <div className="min-h-screen">
      <m.main {...fade} aria-label={t('sk.aria', lang)} style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        <Crumbs items={[t('crumb.academy', lang), t('nav.skills', lang)]} />
        <h1 className="t-h1 mt-3">{t('sk.headline', lang)}</h1>
        <p className="t-sm measure mt-2 mb-7">
          {t('sk.sub', lang)}
        </p>

        {!started ? (
          <EmptyState
            title={t('sk.notstarted', lang)}
            body="أول درس هتخلّصه هيحرّك أول مهارة هنا — وهتشوف تقدّمك بيتبني قدامك درس ورا درس."
            action={<Button onClick={onStartFirst}>{t('sk.gotofirst', lang)}</Button>}
          />
        ) : (
          <div className="stack gap-4">
            {skills.map(s => {
              const st = skillState(s);
              return (
                <div key={s.id}
                  style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--s-1)', border: `1px solid ${st === 'mastered' ? 'rgba(var(--g2-rgb),.35)' : 'var(--line)'}`, borderRadius: 'var(--r-md)' }}>
                  <div className="row items-baseline justify-between gap-3 mb-2">
                    <span className="t-title c-tx0">{s.name}</span>
                    <span className="t-label" style={{ color: st === 'mastered' ? 'var(--g1)' : st === 'working' ? 'var(--tx2)' : 'var(--tx3)' }}>
                      {SKILL_STATE_LABEL[st]}
                    </span>
                  </div>
                  <SkillBar pct={s.pct} />
                  <p className="t-sm mt-2">{s.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </m.main>
    </div>
  );
};
