/**
 * WelcomeView — the first-launch experience (Phase 2 §1).
 * One screen, everything derived from data. Its only job: replace first-day
 * anxiety with "أنا أقدر أتعلم ده" — where you are, what you'll learn, how
 * long it takes, and when you'll be ready. Primary CTA opens lesson one
 * directly (minimum friction to the first small win).
 */
import React from 'react';
import { m } from 'motion/react';
import { Compass, GraduationCap, Clock3, ShieldCheck, ArrowRight } from 'lucide-react';
import { MODULES, curriculumStats, BOSS_BATTLES } from '../../content/registry';
import { Button, Eyebrow, ArabicContent } from '../../ui/primitives';
import { useLang, t } from '../../app/i18n';
import { fade, stagger } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';
import { PROGRAM } from '../../domain/journey/program';

interface Props {
  onStartFirstLesson: () => void;
}

export const WelcomeView: React.FC<Props> = ({ onStartFirstLesson }) => {
  const lang = useLang();
  const stats = curriculumStats();
  const first = MODULES[0];
  const lastBossLevel = Math.max(...BOSS_BATTLES.map(b => b.level));

  const facts = [
    {
      icon: <Compass size={22} />,
      title: t('wc.where', lang),
      body: t('wc.wherebody', lang),
    },
    {
      icon: <GraduationCap size={22} />,
      title: t('wc.learn', lang),
      // States how the nine units sit inside the six phases, so the welcome
      // screen and the roadmap describe the same programme. Both derived from content.
      body: `${stats.lessons} ${t('wc.learnbody', lang)} ${stats.units} ${t('wc.learnunits', lang)} ${PROGRAM.length} ${t('wc.learnphases', lang)}`,
    },
    {
      icon: <Clock3 size={22} />,
      title: t('wc.time', lang),
      body: t('wc.timebody', lang),
    },
    {
      icon: <ShieldCheck size={22} />,
      title: t('wc.ready', lang),
      body: `${t('wc.readybody1', lang)} ${lastBossLevel} ${t('wc.readybody2', lang)}`,
    },
  ];

  return (
    <div className="stack min-h-screen justify-center">
      <m.main {...fade} aria-label="أهلاً بيك في أكاديمية عمليات العضويات" className="w-full" style={{ maxWidth: WIDTH.focus, margin: '0 auto', padding: 'var(--sp-7) var(--sp-5)' }}>
        <Eyebrow>{t('wel.eyebrow', lang)}</Eyebrow>
        <h1 className="t-display mt-4">{t('wel.title', lang)}</h1>
        <p className="t-lead measure mt-4">
          {t('wc.intro', lang)}
        </p>

        {/* The one action comes first, above the fold; the explanation cards
            follow for whoever scrolls. */}
        <m.div {...stagger(1, 0.15)} className="mt-6">
          <Button onClick={onStartFirstLesson}>
            {t('wc.startfirst', lang)} — <ArabicContent as="span">{first?.lessons[0]?.title ?? ''}</ArabicContent> <ArrowRight size={16} className="icon-dir" />
          </Button>
        </m.div>

        <div className="stack mt-7 gap-3">
          {facts.map((f, i) => (
            <m.div key={f.title} {...stagger(i + 2, 0.15)}
              className="row gap-4 items-start" style={{ padding: 'var(--sp-4)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
              <span className="c-g2 mt-1 no-shrink">{f.icon}</span>
              <span>
                <span className="t-title block c-tx0">{f.title}</span>
                <span className="t-sm block mt-1">{f.body}</span>
              </span>
            </m.div>
          ))}
        </div>

        <m.p {...stagger(facts.length, 0.15)} className="t-sm mt-5 c-tx3">
          {t('wc.storage', lang)}
        </m.p>
        {/* One primary action. The journey is always one tap away in the shell. */}
      </m.main>
    </div>
  );
};
