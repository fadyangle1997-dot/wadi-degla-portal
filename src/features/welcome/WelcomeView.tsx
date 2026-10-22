/**
 * WelcomeView — the first-launch experience (Phase 2 §1).
 * One screen, everything derived from data. Its only job: replace first-day
 * anxiety with "أنا أقدر أتعلم ده" — where you are, what you'll learn, how
 * long it takes, and when you'll be ready. Primary CTA opens lesson one
 * directly (minimum friction to the first small win).
 */
import React from 'react';
import { m } from 'motion/react';
import { Compass, GraduationCap, Clock3, ShieldCheck, ArrowRight, LogOut } from 'lucide-react';
import { Icon } from '../../ui/Icon';
import { identityStore } from '../../app/identity/identityStore';
import { MODULES, curriculumStats, BOSS_BATTLES } from '../../content/registry';
import { Button, Eyebrow, ArabicContent } from '../../ui/primitives';
import { useLang, t, tf } from '../../app/i18n';
import { lessonCount, unitCount, phaseCount } from '../../app/plural';
import { fade } from '../../ui/motion';
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
      icon: Compass,
      title: t('wc.where', lang),
      body: t('wc.wherebody', lang),
    },
    {
      icon: GraduationCap,
      title: t('wc.learn', lang),
      // States how the nine units sit inside the six phases, so the welcome
      // screen and the roadmap describe the same programme. Both derived from content.
      body: tf('wc.learnbody', { lessons: lessonCount(stats.lessons, lang), units: unitCount(stats.units, lang), phases: phaseCount(PROGRAM.length, lang) }, lang),
    },
    {
      icon: Clock3,
      title: t('wc.time', lang),
      body: t('wc.timebody', lang),
    },
    {
      icon: ShieldCheck,
      title: t('wc.ready', lang),
      body: tf('wc.readybody', { n: lastBossLevel }, lang),
    },
  ];

  return (
    /* The first screen after the door, on the same room as the door: one
       action above the fold, the programme in four facts for whoever reads on.
       It arrives once, as a whole — nothing here is staged in. */
    <div className="stack min-h-screen justify-center">
      <m.main {...fade} aria-labelledby="wel-title" className="welcome-room">
        <Eyebrow>{t('wel.eyebrow', lang)}</Eyebrow>
        <h1 id="wel-title" className="t-display mt-4">{t('wel.title', lang)}</h1>
        <p className="t-lead measure mt-4">
          {t('wc.intro', lang)}
        </p>

        {/* The one action comes first, above the fold; the explanation cards
            follow for whoever scrolls. */}
        <div className="mt-6">
          <Button onClick={onStartFirstLesson}>
            {t('wc.startfirst', lang)} — <ArabicContent as="span">{first?.lessons[0]?.title ?? ''}</ArabicContent> <Icon as={ArrowRight} dir />
          </Button>
        </div>

        <ul role="list" className="list-plain welcome-facts">
          {facts.map(f => (
            <li key={f.title} className="welcome-fact">
              <span className="mt-1 no-shrink"><Icon as={f.icon} size="lg" /></span>
              <span>
                <span className="t-title block">{f.title}</span>
                <span className="t-sm block mt-1">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="t-sm mt-5">
          {t('wc.storage', lang)}
        </p>
        {/* The one tertiary way out of a screen that otherwise has a single
            action: someone who signed in on the wrong account must not be
            stuck in a stranger's first day. */}
        <div className="mt-6">
          <button type="button" className="icon-btn" onClick={() => identityStore.signOut()}>
            <Icon as={LogOut} /> {t('menu.signout', lang)}
          </button>
        </div>
        {/* One primary action. The journey is always one tap away in the shell. */}
      </m.main>
    </div>
  );
};
