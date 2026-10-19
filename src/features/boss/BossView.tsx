/**
 * BossView — the Boss Battle experience. Deliberately DIFFERENT from lessons
 * (Proposal 4): a darker arena, gold glow, actor-by-actor progression. The
 * employee instantly feels "this is the real test" — a full customer (L2) or a
 * full working day (L3), applied end-to-end. Feedback still teaches.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Swords, Trophy, User } from 'lucide-react';
import type { BossBattle } from '../../domain/types/content';
import { Button, OptionButton, ScreenHeader, ProgressRail, FeedbackBlock } from '../../ui/primitives';
import { shuffleOptions } from '../../content/shuffle';
import { fade } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';
interface Props { battle: BossBattle; onExit: () => void; onFinish: () => void; }

const col: React.CSSProperties = { width: '100%', maxWidth: WIDTH.focus, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5)' };

type Phase = 'brief' | 'steps' | 'done';

export const BossView: React.FC<Props> = ({ battle, onExit, onFinish }) => {
  const [phase, setPhase] = useState<Phase>('brief');
  const [si, setSi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);


  const arena: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: 'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(var(--g2-rgb),.12), transparent), var(--void)',
  };

  if (phase === 'brief') {
    return (
      <div style={{ ...arena, justifyContent: 'center' }}>
        <motion.section {...fade} style={{ ...col, textAlign: 'center' }}>
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 15 }}
            style={{ width: 72, height: 72, margin: '0 auto var(--sp-5)', borderRadius: 'var(--r-md)', background: 'rgba(var(--g2-rgb),.1)', border: '1px solid var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 48px rgba(var(--g2-rgb),.25)' }}>
            <Swords size={32} style={{ color: 'var(--g1)' }} />
          </motion.div>
          <span className="t-eyebrow">تحدّي المستوى {battle.level}</span>
          <h1 className="t-h1" style={{ marginTop: 'var(--sp-3)' }}>{battle.title}</h1>
          <p className="t-body measure" style={{ margin: 'var(--sp-5) auto 0', color: 'var(--tx1)' }}>{battle.brief}</p>
          <p className="t-sm" style={{ marginTop: 'var(--sp-4)' }}>{battle.steps.length} قرارات · كل قرار بيتحسب · الغلط بيعلّم</p>
          <div style={{ marginTop: 'var(--sp-7)' }}>
            <Button onClick={() => setPhase('steps')}>ابدأ التحدّي <Swords size={16} /></Button>
          </div>
        </motion.section>
      </div>
    );
  }

  if (phase === 'done') {
    const perfect = mistakes === 0;
    return (
      <div style={{ ...arena, justifyContent: 'center' }}>
        <motion.section {...fade} style={{ ...col, textAlign: 'center' }}>
          <motion.div initial={{ scale: 0.5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 13 }}
            style={{ width: 80, height: 80, margin: '0 auto var(--sp-5)', borderRadius: '50%', background: 'rgba(var(--g2-rgb),.14)', border: '2px solid var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 64px rgba(var(--g2-rgb),.35)' }}>
            <Trophy size={32} style={{ color: 'var(--g0)' }} />
          </motion.div>
          <h1 className="t-h1">{perfect ? 'من غير غلطة واحدة' : 'عدّيت التحدّي'}</h1>
          <p className="t-body measure" style={{ margin: 'var(--sp-5) auto 0' }}>{battle.passNote}</p>
          {!perfect && <p className="t-sm" style={{ marginTop: 'var(--sp-3)' }}>{mistakes} {mistakes === 1 ? 'غلطة اتعلّمت منها' : 'غلطات اتعلّمت منهم'} — وده الهدف.</p>}
          <div style={{ marginTop: 'var(--sp-7)' }}>
            <Button onClick={onExit}>ارجع للمسار <ArrowRight size={16} className="icon-dir" /></Button>
          </div>
        </motion.section>
      </div>
    );
  }

  const step = battle.steps[si]!;
  const answered = picked !== null;
  const correct = answered && step.options[picked!]?.correct;

  return (
    <div style={arena}>
      <ScreenHeader tone="arena" maxWidth={WIDTH.focus}
        leading={<Swords size={16} style={{ color: 'var(--g2)' }} />}
        rail={<ProgressRail total={battle.steps.length} current={si} emphasis />}
        trailing={<span className="t-num t-label" style={{ color: 'var(--g2)' }}>{si + 1}/{battle.steps.length}</span>} />

      <main style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.section key={si} {...fade} style={col}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-full)', background: 'rgba(var(--g2-rgb),.1)', border: '1px solid rgba(var(--g2-rgb),.3)', marginBottom: 'var(--sp-5)' }}>
              <User size={13} style={{ color: 'var(--g1)' }} />
              <span className="t-sm" style={{ color: 'var(--g1)' }}>{step.actor}</span>
            </div>
            <h2 className="t-h2 measure" style={{ marginBottom: 'var(--sp-6)' }}>{step.prompt}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {shuffleOptions(step.options, step.actor + step.prompt).map((o, i) => (
                <OptionButton key={i} text={o.text} arena
                  state={!answered ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'}
                  onPick={() => { setPicked(i); if (!step.options[i]?.correct) setMistakes(m => m + 1); }} />
              ))}
            </div>
            <AnimatePresence>
              {answered && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 'var(--sp-5)' }}>
                  <FeedbackBlock tone={correct ? 'summary' : 'warning'} title={correct ? 'قرار سليم' : 'قرار غلط — اعرف ليه'}
                    onAction={() => { if (si >= battle.steps.length - 1) { onFinish(); setPhase('done'); } else { setSi(si + 1); setPicked(null); } }}
                    actionLabel={<>{si >= battle.steps.length - 1 ? 'خلّص التحدّي' : 'العميل الجاي'} <ArrowRight size={16} className="icon-dir" /></>}>
                    {step.feedback}
                  </FeedbackBlock>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
};
