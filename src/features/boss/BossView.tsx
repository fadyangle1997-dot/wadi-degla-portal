/**
 * BossView — the challenge: a full customer (L2) or a full working day (L3),
 * applied end-to-end. It opens as a case file — the screen's one paper: the
 * situation and how it is judged — then runs decision by decision in the
 * focus room, the same room as the unit exam. On a wide room the situation
 * stays beside each decision, so nobody has to remember the case to answer it.
 * Feedback still teaches after every decision.
 */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ArrowRight, User } from 'lucide-react';
import type { BossBattle } from '../../domain/types/content';
import { FlowRoom, FlowSplit, PaperSheet, Achievement, Button, OptionButton, FeedbackBlock, Status, Num, Content } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { shuffleOptions } from '../../content/shuffle';
import { fade, paperIn, achieve } from '../../ui/motion';
import { tone, EXAM } from '../../ui/statusSemantics';
import { useLang, t, tf } from '../../app/i18n';

interface Props { battle: BossBattle; onExit: () => void; onFinish: () => void; exitLabel?: string; }

type Phase = 'brief' | 'steps' | 'done';

export const BossView: React.FC<Props> = ({ battle, onExit, onFinish, exitLabel }) => {
  const lang = useLang();
  const [phase, setPhase] = useState<Phase>('brief');
  const [si, setSi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  // The bar is interface: every word of it in the interface language.
  const mode = `${t('as.boss', lang)} · ${tf('as.bosslevel', { n: battle.level }, lang)}`;
  const total = battle.steps.length;
  // One room for the whole challenge: brief, decisions and result share its bar.
  // Focus follows the step: a new phase, or a decision replaced, puts focus on
  // the room, so a keyboard user starts on what is now on screen.
  const mainRef = useRef<HTMLElement>(null);
  const focusRoom = () => mainRef.current?.focus({ preventScroll: true });
  const room = { mode, title: <Content>{battle.title}</Content>, onExit, exitTo: exitLabel, mainRef };
  // A battle always has a decision (content.test); the brief still renders if
  // one arrives without, instead of throwing before the trainee sees anything.
  const step = battle.steps[Math.min(si, total - 1)];
  // The options as shown, and the verdict read from the SAME list the trainee
  // pressed — reading the original order called a right answer wrong.
  const shown = useMemo(() => (step ? shuffleOptions(step.options, step.actor + step.prompt) : []), [step]);
  useEffect(() => { if (phase !== 'brief') focusRoom(); }, [phase]);

  if (phase === 'brief') {
    return (
      <FlowRoom {...room}>
        <div className="flow-center">
          <m.div {...paperIn}>
            <PaperSheet labelledBy="boss-title">
              <p className="t-eyebrow m-0">تحدّي المستوى {battle.level}</p>
              <h1 id="boss-title" className="t-h1 mt-3 mb-0">{battle.title}</h1>
              <h2 className="case-label">الموقف</h2>
              <p className="case-text">{battle.brief}</p>
              <dl className="paper-facts">
                <div><dt>{t('as.decisions', lang)}</dt><dd><Num>{total}</Num></dd></div>
                <div><dt>إزاي بيتحسب</dt><dd>كل قرار بيتحسب · الغلط بيعلّم</dd></div>
              </dl>
              {total > 0 && (
                <div className="paper-actions">
                  <Button onClick={() => setPhase('steps')}>ابدأ التحدّي <Icon as={ArrowRight} dir /></Button>
                </div>
              )}
            </PaperSheet>
          </m.div>
        </div>
      </FlowRoom>
    );
  }

  if (phase === 'done') {
    const perfect = mistakes === 0;
    return (
      <FlowRoom {...room}>
        <div className="flow-center">
          <m.div {...achieve}>
            <PaperSheet labelledBy="boss-done">
              <p className="t-eyebrow m-0">{t('as.result', lang)}</p>
              <div className="result-head mt-4">
                <Achievement tier="pass" />
                <div className="result-verdict">
                  <Status tone={tone(EXAM.passed)}>{t('as.passed', lang)}</Status>
                  <h1 id="boss-done" className="t-h2 m-0">{perfect ? 'من غير غلطة واحدة' : 'عدّيت التحدّي'}</h1>
                </div>
              </div>
              <p className="t-body measure mt-4 mb-0">{battle.passNote}</p>
              {!perfect && <p className="t-sm mt-3 mb-0">كل غلطة هنا اتعلّمت منها من غير ما عميل حقيقي يدفع تمنها — وده الهدف.</p>}
              <dl className="paper-facts">
                <div><dt>{t('as.decisions', lang)}</dt><dd><Num>{total}</Num></dd></div>
                <div><dt>{t('as.mistakes', lang)}</dt><dd><Num>{mistakes}</Num></dd></div>
              </dl>
              <div className="paper-actions">
                <Button onClick={onExit}>{t('flow.done', lang)} <Icon as={ArrowRight} dir /></Button>
              </div>
            </PaperSheet>
          </m.div>
        </div>
      </FlowRoom>
    );
  }

  if (!step) return null; // unreachable: the brief offers no start without a decision
  // Where the room is wide enough to keep it beside the decision, the situation
  // starts open; on a phone it stays one tap away. Read per decision, like the
  // roster reads the screen; the trainee's own open/close then holds.
  const wideRoom = typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 64rem)').matches;
  const answered = picked !== null;
  const correct = answered && shown[picked]?.correct;

  return (
    <FlowRoom {...room}
      progress={{ total, current: si }}
      leaveWarning={{ title: t('as.bossleave', lang), body: t('as.bossleavebody', lang) }}>
      <AnimatePresence mode="wait" onExitComplete={focusRoom}>
        <m.div key={si} {...fade} className="flow-stage">
          <FlowSplit prompt={<>
            <p className="t-eyebrow m-0">{tf('as.decision', { n: si + 1, total }, lang)}</p>
            <p className="flow-actor mt-3"><Icon as={User} size="sm" />{step.actor}</p>
            <h1 className="t-h2 flow-question mt-3">{step.prompt}</h1>
            {/* The case, kept in view: the decision is about this person. */}
            <details className="case-recall mt-5" open={wideRoom}>
              <summary>الموقف</summary>
              <p className="flow-note mt-2">{battle.brief}</p>
            </details>
          </>}>
            <div className="stack gap-3">
              {shown.map((o, i) => (
                <OptionButton key={i} text={o.text}
                  state={!answered ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'}
                  onPick={() => { setPicked(i); if (!o.correct) setMistakes(n => n + 1); }} />
              ))}
            </div>
            <AnimatePresence>
              {answered && (
                <m.div {...fade} className="mt-5">
                  <FeedbackBlock tone={correct ? 'summary' : 'warning'} title={correct ? 'قرار سليم' : 'قرار غلط — اعرف ليه'}
                    onAction={() => { if (si >= total - 1) { onFinish(); setPhase('done'); } else { setSi(si + 1); setPicked(null); } }}
                    actionLabel={<>{si >= total - 1 ? 'خلّص التحدّي' : 'القرار الجاي'} <Icon as={ArrowRight} dir /></>}>
                    {step.feedback}
                  </FeedbackBlock>
                </m.div>
              )}
            </AnimatePresence>
          </FlowSplit>
        </m.div>
      </AnimatePresence>
    </FlowRoom>
  );
};
