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
      // 🔴 THE PROGRAMME HAD TWO DIFFERENT TOTALS. This screen said «9 وحدات»
      // on day one and the roadmap said «المرحلة 1 من 6» on the same day, with
      // nothing anywhere explaining that the nine sit inside the six. A trainee
      // who cannot tell how big the thing is cannot tell how far along they
      // are. The relationship is stated once, here, where the programme is
      // first described — and both numbers stay derived from the content.
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <m.main {...fade} aria-label="أهلاً بيك في أكاديمية عمليات العضويات" style={{ width: '100%', maxWidth: WIDTH.focus, margin: '0 auto', padding: 'var(--sp-7) var(--sp-5)' }}>
        <Eyebrow>{t('wel.eyebrow', lang)}</Eyebrow>
        <h1 className="t-display" style={{ marginTop: 'var(--sp-4)' }}>{t('wel.title', lang)}</h1>
        <p className="t-lead measure" style={{ marginTop: 'var(--sp-4)' }}>
          {t('wc.intro', lang)}
        </p>

        {/* 🔴 THE ONLY ACTION WAS BELOW THE FOLD. On a 1440×900 desktop this
            screen ran to 1078px, so a new employee's first screen ended in four
            explanation cards and the one button they needed was off-screen —
            the product asking to be read before it can be used. The act comes
            first; the four cards stay, as what they always were: the answer to
            «إيه ده؟» for whoever scrolls. */}
        <m.div {...stagger(1, 0.15)} style={{ marginTop: 'var(--sp-6)' }}>
          <Button onClick={onStartFirstLesson}>
            {t('wc.startfirst', lang)} — <ArabicContent as="span">{first?.lessons[0]?.title ?? ''}</ArabicContent> <ArrowRight size={16} className="icon-dir" />
          </Button>
        </m.div>

        <div style={{ marginTop: 'var(--sp-7)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {facts.map((f, i) => (
            <m.div key={f.title} {...stagger(i + 2, 0.15)}
              style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start', padding: 'var(--sp-4)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
              <span style={{ color: 'var(--g2)', marginTop: 'var(--sp-1)', flexShrink: 0 }}>{f.icon}</span>
              <span>
                <span className="t-title" style={{ display: 'block', color: 'var(--tx0)' }}>{f.title}</span>
                <span className="t-sm" style={{ display: 'block', marginTop: 'var(--sp-1)' }}>{f.body}</span>
              </span>
            </m.div>
          ))}
        </div>

        <m.p {...stagger(facts.length, 0.15)} className="t-sm" style={{ marginTop: 'var(--sp-5)', color: 'var(--tx3)' }}>
          {t('wc.storage', lang)}
        </m.p>
        {/* 🔴 P1 (Sprint 5.0) — ONE primary action. This used to offer «ابدأ
            أول درس» beside a ghost «شوف المسار كله الأول», making the very
            first decision of the employee's professional life a CHOICE rather
            than an ACT. Exploration is not lost: «الرحلة» sits permanently in
            the header the moment they land, so the path is one tap away
            without competing with the only action that matters right now. */}
      </m.main>
    </div>
  );
};
