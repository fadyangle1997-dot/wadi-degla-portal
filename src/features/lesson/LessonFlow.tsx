/**
 * LessonFlow — the signature interaction. Staged rhythm (progressive disclosure):
 *   ask → predict → learn (+ live rule examples) → practice? → quiz? → done
 * Stage list is computed per lesson from data (practice/quiz optional), so an
 * empty quiz can never mount the quiz stage — the render-phase bug class is
 * structurally impossible now. All persistence is event-driven via onComplete.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { Check, HelpCircle, Lightbulb, Sparkles, ArrowRight, ClipboardCheck } from 'lucide-react';
import { archetypeById, STATE_LABEL, type MemberState } from '../../domain/simulation';
import type { Production, Lesson, QuizQuestion, Practice } from '../../domain/types/content';
import { Button, Eyebrow, Callout, OptionButton, ScreenHeader, ProgressRail, FeedbackBlock, Card, Capsule, SpineWell } from '../../ui/primitives';
import { lessonSkillTouches, LEVEL_LABEL } from '../../app/skills';
import { RuleExamples } from './ruleRenderers';
import { FileJourneyMap } from './FileJourneyMap';
import { DeclarationMatrix } from './DeclarationMatrix';
import { AgeEligibilityTimeline } from './AgeEligibilityTimeline';
import { RenewalPenaltyTiers } from './RenewalPenaltyTiers';
import { CheckBeforeActFlow } from './CheckBeforeActFlow';
import { shuffleOptions } from '../../content/shuffle';
import { fade } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';

type Stage = 'challenge' | 'ask' | 'predict' | 'learn' | 'reflect' | 'office' | 'coach' | 'mistakes' | 'dialogue' | 'comms' | 'produce' | 'practice' | 'quiz' | 'commit' | 'done';

interface Props {
  lesson: Lesson;
  unitCode: string;
  moduleId: string;
  /** Where this lesson sits in its unit — orientation, not decoration: a
   *  trainee mid-flow could see «M1» and a bar of unnamed segments and still
   *  not know which lesson they were in or how much of the unit was left. */
  lessonIndex: number;
  lessonCount: number;
  /** Persist the one thing they commit to doing at the desk tomorrow. The
   *  shell owns the write, so the flow stays a pure sequence of screens. */
  onCommit?: (text: string) => void;
  /** FIRST attempt only, per question — the measurement that seeds spaced
   *  retrieval. The correction round that follows a miss is learning, not a
   *  second performance, and never reaches this. */
  onQuizAttempt?: (questionId: string, correct: boolean) => void;
  /** Derived by the shell from data: the next lesson or the unit exam. */
  nextStep: { label: string; go: () => void } | null;
  onComplete: () => void;
  /** Completion AND return to the path — the two were fused, so «ارجع للمسار»
   *  silently did nothing whenever a next lesson existed. */
  onFinish?: () => void;
  onExit: () => void;
}

const col: React.CSSProperties = { width: '100%', maxWidth: WIDTH.focus, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5)' };

export const LessonFlow: React.FC<Props> = ({ lesson, unitCode, moduleId, lessonIndex, lessonCount, nextStep, onCommit, onQuizAttempt, onComplete, onFinish, onExit }) => {
  // Stage list derived from data — optional stages appear only when content exists.
  const stages = useMemo<Stage[]>(() => {
    const p = lesson.pro;
    // The opening: a real situation REPLACES the abstract question when the pro
    // layer has one. Two "here's a question" screens back to back would repeat
    // the same emotion — the situation always wins, so only one of them mounts.
    const s: Stage[] = [p?.openingChallenge ? 'challenge' : 'ask', 'predict', 'learn'];
    // A pause that asks and answers nothing — the silence is the point.
    if (p?.reflectiveQuestion) s.push('reflect');
    // The same moment from two sides: what happened, and what the member felt.
    if (p?.officeScenario) s.push('office');
    // The coaching beat — the emotional peak, closed by the golden rule.
    if (p?.professionalThinking) s.push('coach');
    // Mistakes land AFTER the right model, never before it: contrast, not confusion.
    if (p?.commonMistakes?.length) s.push('mistakes');
    // Layer 2: the delivery risk lands immediately after the rule — the two are
    // never separated, so the trainee cannot learn one without the other.
    // Layer 3: the same situation delivered wrong, then right — placed after
    // the principle so the trainee sees the principle in a live exchange.
    if (lesson.dialogue) s.push('dialogue');
    if (lesson.comms) s.push('comms');
    // Production: the trainee says it themselves. Placed after the dialogue —
    // they have seen it done, now they do it.
    if (lesson.production) s.push('produce');
    if (lesson.practice) s.push('practice');
    if (lesson.quickQuiz.length > 0) s.push('quiz');
    // One decision for tomorrow, taken before the lesson closes.
    if (p?.commitmentOptions?.length) s.push('commit');
    s.push('done');
    return s;
  }, [lesson]);

  const [idx, setIdx] = useState(0);
  // The trainee's one focus for tomorrow. Local to the lesson: it is echoed on
  // the closing screen so the choice is not swallowed. Carrying it across
  // sessions would need a store change, so it is deliberately not persisted.
  const [commitment, setCommitment] = useState<string | null>(null);
  const stage = stages[idx] ?? 'done';
  const next = () => setIdx(i => Math.min(i + 1, stages.length - 1));
  const ruleRefs = useMemo(() => lesson.points.flatMap(p => (p.rule ? [p.rule] : [])), [lesson]);
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus management: move focus to the stage container so screen-reader and
    // keyboard users land at the new content, not on the old button (Phase 2 §6).
    headingRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 🔴 ORIENTATION. The header carried a unit code and a bar of unnamed
          segments: a trainee three screens deep could not answer «which lesson
          am I in?» or «how much of this unit is left?» without leaving. Both
          questions are self-regulation, not decoration — a learner who cannot
          locate themselves spends attention on the interface instead of the
          material. The lesson's own name and its place in the unit now sit in
          the chrome, and the bar keeps meaning progress WITHIN this lesson. */}
      <ScreenHeader onBack={onExit} maxWidth={WIDTH.focus}
        rail={<ProgressRail total={stages.length - 1} current={idx} />}
        leading={
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span className="t-label">{unitCode} · درس {lessonIndex + 1} من {lessonCount}</span>
            <span className="t-sm" style={{ color: 'var(--tx1)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '42vw' }}>
              {lesson.title}
            </span>
          </span>
        } />

      <main ref={headingRef} tabIndex={-1} style={{ flex: 1, display: 'flex', flexDirection: 'column', outline: 'none' }}>
        <AnimatePresence mode="wait">
          {/* ── CHALLENGE ─────────────────────────────────────────────────
              A real situation, alone, before a single word of explanation.
              The trainee must want the answer before being given one. */}
          {stage === 'challenge' && lesson.pro?.openingChallenge && (
            <m.section key="challenge" {...fade} style={{ ...col, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Eyebrow icon={<HelpCircle size={13} />}>موقف في المكتب</Eyebrow>
              <h1 className="t-h1 measure" style={{ marginTop: 'var(--sp-4)' }}>{lesson.pro.openingChallenge}</h1>
              {/* The trainee's own question, under the situation that provokes
                  it — one beat, one screen. Splitting them would open the
                  lesson twice with the same emotion. */}
              <p className="t-lead measure" style={{ marginTop: 'var(--sp-4)', color: 'var(--tx2)' }}>{lesson.employeeQuestion}</p>
              <div style={{ marginTop: 'var(--sp-5)' }}>
                <Callout tone="objective">{lesson.objective}</Callout>
              </div>
              <div style={{ marginTop: 'var(--sp-7)' }}>
                <Button onClick={next}>تفتكر تعمل إيه؟ <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {stage === 'ask' && (
            <m.section key="ask" {...fade} style={{ ...col, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Eyebrow icon={<HelpCircle size={13} />}>سؤال بيقابلك في الشغل</Eyebrow>
              <h1 className="t-h1 measure" style={{ marginTop: 'var(--sp-4)' }}>{lesson.employeeQuestion}</h1>
              <div style={{ marginTop: 'var(--sp-6)' }}>
                <Callout tone="objective">{lesson.objective}</Callout>
              </div>
              <div style={{ marginTop: 'var(--sp-7)' }}>
                <Button onClick={next}>يلا نجاوب عليه <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {stage === 'predict' && <PredictStage key="predict" lesson={lesson} onNext={next} />}

          {/* ── LEARN ─────────────────────────────────────────────────────
              EYE PATH, written before the markup — and the markup obeys it:
                ① eyebrow  · a quiet line: where you are
                ② intro    · one lead sentence, larger than body
                ③ 🔴 RULES · the focal point. Everything above leads here.
                ④ example  · supports the rule, never competes with it
                ⑤ button   · the exit

              🔴 WHAT WAS WRONG: rules and ordinary points rendered IDENTICALLY —
              same tick, same size, differing only by --g1 vs --g2: two golds
              nobody can tell apart. Remove the rules and the screen does not
              change, which by definition means there was no hero. There was a
              list.

              And «مثال من الشغل» sat in a gradient card with a border — the
              visually STRONGEST object on screen. The example was the hero and
              the rule was filler: exactly backwards. The example is disposable;
              the rule is the job. */}
          {stage === 'learn' && (
            <m.section key="learn" {...fade} style={col}>
              <Eyebrow>{lesson.title}</Eyebrow>

              <p className="t-lead measure" style={{ marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-6)' }}>
                {lesson.intro}
              </p>

              {/* Framing, not a screen of its own: three lines do not earn a
                  Continue tap. It sits above the rules because it is why they
                  matter — the rule stays the hero. */}
              {lesson.pro?.whyMatters && (
                <div style={{ marginBottom: 'var(--sp-6)' }}>
                  <Callout tone="objective">{lesson.pro.whyMatters}</Callout>
                </div>
              )}

              {/* ③ THE HERO */}
              <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {lesson.points.map((pt, i) => (
                  <m.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 + i * 0.06 }}>
                    {pt.rule ? <RuleObject text={pt.text} /> : <SupportingPoint text={pt.text} />}
                  </m.li>
                ))}
              </ul>

              {/* ④ Prose, not a card. It must not out-weigh the rule. */}
              <m.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + lesson.points.length * 0.06 }}
                style={{ marginTop: 'var(--sp-6)' }}
              >
                <Eyebrow icon={<Lightbulb size={13} />}>مثال من الشغل</Eyebrow>
                <p className="t-body measure" style={{ marginTop: 'var(--sp-3)', color: 'var(--tx2)' }}>
                  {lesson.example}
                </p>

                <RuleExamples rules={ruleRefs} />

                <div style={{ marginTop: 'var(--sp-6)' }}>
                  <Button onClick={next}>
                    {lesson.practice ? 'جرّب بنفسك' : 'فهمت — اختبرني'} <ArrowRight size={16} className="icon-dir" />
                  </Button>
                </div>
              </m.div>
            </m.section>
          )}

          {/* ── REFLECT ───────────────────────────────────────────────────
              The bravest screen here: it gives nothing. One question, no
              answer, no options. The button says «فكّرت» — a small contract
              with yourself, not a navigation label. */}
          {stage === 'reflect' && lesson.pro?.reflectiveQuestion && (
            <m.section key="reflect" {...fade} style={{ ...col, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Eyebrow icon={<Lightbulb size={13} />}>خد ثانية وفكّر</Eyebrow>
              <h2 className="t-h2 measure" style={{ marginTop: 'var(--sp-4)' }}>{lesson.pro.reflectiveQuestion}</h2>
              <div style={{ marginTop: 'var(--sp-7)' }}>
                <Button variant="ghost" onClick={next}>فكّرت <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {/* ── OFFICE ────────────────────────────────────────────────────
              One moment from two sides — what happened, and what the member
              felt while it happened. Splitting them would break the scene. */}
          {stage === 'office' && lesson.pro?.officeScenario && (
            <m.section key="office" {...fade} style={col}>
              <Eyebrow icon={<ClipboardCheck size={13} />}>في المكتب</Eyebrow>
              <p className="t-lead measure" style={{ marginTop: 'var(--sp-3)' }}>{lesson.pro.officeScenario}</p>
              {/* The journey-overview lesson compresses all eleven stages into
                  one arrow-separated sentence — the hardest possible shape to
                  remember. The map below shows the SAME approved sequence and
                  ownership as a visual system, so the structure is learned
                  before the sentence is parsed. Scoped to this one lesson: it
                  is the only place where the whole journey is the subject. */}
              {lesson.id === 'l3-journey-overview' && <FileJourneyMap />}
              {/* The pre-issuance checklist already teaches the PRINCIPLE
                  («الإقرار المطلوب للحالة ناقص ← ما تصدرش الرقم») and assesses
                  it. What it could not teach was WHICH declaration a given case
                  needs — that required the official source, which now exists.
                  The matrix lives here rather than in a new module because
                  declarations ARE part of this pre-issuance check. */}
              {lesson.id === 'l5-checklist' && <DeclarationMatrix />}
              {/* Scoped to the one lesson whose stated objective IS this rule
                  («تحدّد مستند أي ابن حسب سنه باستخدام حدود 16/21/25»). The
                  trainee arrives with one number and needs one document — a
                  lookup reads faster as bands than as prose. */}
              {lesson.id === 'l3-children' && <AgeEligibilityTimeline />}
              {/* Scoped to the renewal lesson, whose objective is «تشرح غرامة
                  التأخير بمرحلتيها». Its own quiz records the misconception
                  this visual targets: reaching for the 50% tiers while the
                  member is still inside the year. */}
              {lesson.id === 'l-renewal' && <RenewalPenaltyTiers />}
              {/* Scoped to «ناقص ولا مكسور» — the lesson whose whole point is
                  the ORDER of questions before touching a document. */}
              {lesson.id === 'l2-missing-vs-broken' && <CheckBeforeActFlow />}
              {lesson.pro.customerPerspective && (
                <div style={{ marginTop: 'var(--sp-6)' }}>
                  <SpineWell>
                    <span className="t-label" style={{ color: 'var(--tx3)' }}>العضو حاسس بإيه</span>
                    <p className="t-body measure" style={{ margin: 'var(--sp-2) 0 0' }}>{lesson.pro.customerPerspective}</p>
                  </SpineWell>
                </div>
              )}
              <div style={{ marginTop: 'var(--sp-7)' }}>
                <Button onClick={next}>طيب أتصرّف إزاي؟ <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {/* ── COACH ─────────────────────────────────────────────────────
              The emotional peak: the trainer talking in your ear. It closes on
              the golden rule — the one line meant to survive years. */}
          {stage === 'coach' && lesson.pro?.professionalThinking && (
            <m.section key="coach" {...fade} style={col}>
              <Eyebrow icon={<Sparkles size={13} />}>إزاي المحترف بيفكّر</Eyebrow>
              <p className="t-lead measure" style={{ marginTop: 'var(--sp-3)' }}>{lesson.pro.professionalThinking}</p>
              {lesson.pro.ownershipMindset && (
                <p className="t-body measure" style={{ marginTop: 'var(--sp-5)', color: 'var(--tx1)' }}>{lesson.pro.ownershipMindset}</p>
              )}
              {lesson.pro.goldenRule && (
                <div style={{ marginTop: 'var(--sp-6)' }}>
                  <Callout tone="objective">{lesson.pro.goldenRule}</Callout>
                </div>
              )}
              <div style={{ marginTop: 'var(--sp-7)' }}>
                <Button onClick={next}>كمّل <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {/* ── MISTAKES ──────────────────────────────────────────────────
              Contrast, and only after the right model exists to contrast with. */}
          {stage === 'mistakes' && lesson.pro?.commonMistakes?.length && (
            <m.section key="mistakes" {...fade} style={col}>
              <Eyebrow>أخطاء بتحصل كتير</Eyebrow>
              <ul role="list" style={{ listStyle: 'none', margin: 'var(--sp-4) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {lesson.pro.commonMistakes.map((m, i) => (
                  <li key={i} className="t-body measure" style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
                    <span aria-hidden style={{ color: 'var(--risk)', flexShrink: 0 }}>✕</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 'var(--sp-7)' }}>
                <Button onClick={next}>كمّل <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {stage === 'dialogue' && lesson.dialogue && (
        <m.section {...fade} style={col}>
          <Eyebrow>نفس الموقف · نفس القرار</Eyebrow>
          <h2 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>الفرق في التوصيل</h2>
          <p className="t-body" style={{ color: 'var(--tx2)', marginBottom: 'var(--sp-5)' }}>{lesson.dialogue.setup}</p>

          <DialogueBlock tone="wrong" label="❌ الحوار الغلط" lines={lesson.dialogue.wrong} why={lesson.dialogue.whyWrongFails} whyLabel="ليه بيفشل" />
          <div style={{ height: 'var(--sp-5)' }} />
          <DialogueBlock tone="right" label="✅ الحوار الصح" lines={lesson.dialogue.right} why={lesson.dialogue.whyRightWorks} whyLabel="ليه بينجح" />

          <p className="t-sm" style={{ color: 'var(--tx3)', marginTop: 'var(--sp-5)' }}>
            الحوارات دي أمثلة مش جمل تتحفظ — اللي بينتقل معاك هو المبدأ.
          </p>
          <div style={{ marginTop: 'var(--sp-5)' }}>
            <Button onClick={next}>كمّل <ArrowRight size={16} className="icon-dir" /></Button>
          </div>
        </m.section>
      )}

      {stage === 'comms' && lesson.comms && (
        <m.section {...fade} style={col}>
          <Eyebrow>{lesson.comms.audience === 'sales' ? 'التوصيل الداخلي · للمبيعات' : 'التوصيل · للعضو'}</Eyebrow>
          <h2 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-5)' }}>
            {lesson.comms.audience === 'sales'
              ? 'الفخ والأفضل — في الطلب الداخلي'
              : 'الفخ والأفضل — قدّام العضو'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {/* EYE PATH: the trap · its cost · the way out.
                ① and ③ are objects — they are things that happen and things you
                   do, and the trainee already knows a spine means «stop here».
                ② is PROSE. It used to be a third identical card, which made the
                   consequence read as an equal option rather than the reason the
                   trap matters at all. */}
            <SpineWell spine="risk" label="⚠️ فخ احترافي">
              <p className="t-body measure" style={{ margin: 0 }}>{lesson.comms.risk}</p>
            </SpineWell>

            <div style={{ padding: '0 var(--sp-2)' }}>
              <div className="t-label" style={{ color: 'var(--tx3)', marginBottom: 'var(--sp-2)' }}>بيحصل إيه لما تقع فيه</div>
              <p className="t-body measure" style={{ margin: 0, color: 'var(--tx2)' }}>{lesson.comms.why}</p>
            </div>

            <SpineWell label="⭐ الأفضل">
              <p className="t-body measure" style={{ margin: 0, color: 'var(--tx0)', fontWeight: 500 }}>{lesson.comms.instead}</p>
            </SpineWell>
          </div>
          <div style={{ marginTop: 'var(--sp-6)' }}>
            <Button onClick={next}>كمّل <ArrowRight size={16} className="icon-dir" /></Button>
          </div>
        </m.section>
      )}

      {stage === 'produce' && lesson.production && (
        <ProductionStage p={lesson.production} onPass={next} />
      )}

      {stage === 'practice' && lesson.practice && (
            <PracticeStage key="practice" practice={lesson.practice} onNext={next} />
          )}

          {stage === 'quiz' && lesson.quickQuiz.length > 0 && (
            <QuizStage key="quiz" questions={lesson.quickQuiz} onDone={next}
              onFirstAttempt={(questionId, correct) => onQuizAttempt?.(questionId, correct)} />
          )}

          {/* ── COMMIT ────────────────────────────────────────────────────
              One choice, not three. A person who commits to three things
              commits to nothing. The choice is echoed on the closing screen so
              it is not swallowed the moment it is made. */}
          {stage === 'commit' && lesson.pro?.commitmentOptions?.length && (
            <m.section key="commit" {...fade} style={{ ...col, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Eyebrow>هتركّز على إيه بكرة؟</Eyebrow>
              <h2 className="t-h3 measure" style={{ marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>اختار حاجة واحدة بس.</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {lesson.pro.commitmentOptions.map(o => (
                  <OptionButton key={o} text={o}
                    state={commitment === o ? 'correct' : commitment ? 'dim' : 'idle'}
                    onPick={() => setCommitment(o)} />
                ))}
              </div>
              <div style={{ marginTop: 'var(--sp-6)' }}>
                <Button disabled={!commitment} onClick={() => { if (commitment) onCommit?.(commitment); next(); }}>ده اللي هركّز عليه <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {stage === 'done' && (
            <m.section key="done" {...fade} style={{ ...col, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {/* THE HERO — capability, never completion. «You finished» rewards
                  attendance; «tomorrow you can» rewards becoming. The whole
                  screen is sized so the eye lands here first and only here. */}
              <div style={{ textAlign: 'center' }}>
                <Eyebrow icon={<Sparkles size={13} />}>بكرة في الفرع</Eyebrow>
                <h2 className="t-h2 measure" style={{ marginTop: 'var(--sp-3)', marginInline: 'auto' }}>
                  {lesson.pro?.tomorrowInBranch ?? lesson.canNow}
                </h2>
              </div>

              {/* The golden rule, second and last time — spaced repetition
                  inside one lesson is how a line survives a year. */}
              {lesson.pro?.goldenRule && (
                <p className="t-lead measure" style={{ marginTop: 'var(--sp-5)', marginInline: 'auto', textAlign: 'center', color: 'var(--g1)' }}>
                  {lesson.pro.goldenRule}
                </p>
              )}

              {/* Everything practical drops to a quiet block: present, findable,
                  and never competing with the hero above it. */}
              {lesson.pro && (
                <div style={{ marginTop: 'var(--sp-7)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                  {commitment && <DoneRow label="التزامك بكرة" body={commitment} />}
                  {lesson.pro.dailyHabit && <DoneRow label="عادة النهاردة · أقل من دقيقة" body={lesson.pro.dailyHabit} />}
                  {lesson.pro.officeTask && <DoneRow label="مهمتك مع مدربك" body={lesson.pro.officeTask} />}
                  {lesson.pro.trainerQuestions?.length ? (
                    <div>
                      <span className="t-label" style={{ color: 'var(--tx3)' }}>اسأل مدربك — متخمّنش</span>
                      <ul role="list" style={{ listStyle: 'none', margin: 'var(--sp-2) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                        {lesson.pro.trainerQuestions.map((q, i) => (
                          <li key={i} className="t-sm" style={{ color: 'var(--tx1)' }}>• {q}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {lesson.pro.readinessCheck && (
                    <SpineWell>
                      <span className="t-label" style={{ color: 'var(--tx3)' }}>
                        {lesson.pro.readinessCheck.level === 'YES' ? 'جاهز' : lesson.pro.readinessCheck.level === 'NO' ? 'لسه بدري' : 'قربت'}
                      </span>
                      <p className="t-body measure" style={{ margin: 'var(--sp-2) 0 0' }}>{lesson.pro.readinessCheck.why}</p>
                    </SpineWell>
                  )}
                  {lesson.pro.closingReflection && (
                    <p className="t-sm measure" style={{ color: 'var(--tx2)' }}>{lesson.pro.closingReflection}</p>
                  )}
                </div>
              )}

              {/* skills this lesson moved */}
              <div style={{ marginTop: 'var(--sp-6)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
                {lessonSkillTouches(moduleId, lesson.id).map(t => (
                  <Capsule key={t.name}>{t.name} · {LEVEL_LABEL[t.level]}</Capsule>
                ))}
              </div>

              <div style={{ marginTop: 'var(--sp-6)', display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
                {nextStep && (
                  <Button onClick={() => { onComplete(); nextStep.go(); }}>
                    {nextStep.label} <ArrowRight size={16} className="icon-dir" />
                  </Button>
                )}
                <Button variant={nextStep ? 'ghost' : 'primary'} onClick={onFinish ?? onComplete}>ارجع للمسار</Button>
              </div>
            </m.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

/** One quiet row on the closing screen: a label the eye can skip, and the line
 *  that matters. Kept flat on purpose — cards here would compete with the hero. */
const DoneRow: React.FC<{ label: string; body: string }> = ({ label, body }) => (
  <div>
    <span className="t-label" style={{ color: 'var(--tx3)' }}>{label}</span>
    <p className="t-body measure" style={{ margin: 'var(--sp-2) 0 0' }}>{body}</p>
  </div>
);

/* ---------- prediction ---------- */
const PredictStage: React.FC<{ lesson: Lesson; onNext: () => void }> = ({ lesson, onNext }) => {
  const [picked, setPicked] = useState<number | null>(null);
  const p = lesson.prediction;
  return (
    <m.section {...fade} style={col}>
      <Eyebrow icon={<HelpCircle size={13} />}>قبل ما نقولك القاعدة — إنت إيه رأيك؟</Eyebrow>
      <h2 className="t-h2 measure" style={{ marginTop: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>{p.prompt}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {shuffleOptions(p.options, p.prompt).map((o, i) => (
          <OptionButton key={i} text={o.text} state={picked === null ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'} onPick={() => setPicked(i)} />
        ))}
      </div>
      <AnimatePresence>
        {picked !== null && (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 'var(--sp-5)' }}>
            <FeedbackBlock tone="summary" title="القاعدة" onAction={onNext}
              actionLabel={<>كمّل الشرح <ArrowRight size={16} className="icon-dir" /></>}>
              {p.reveal}
            </FeedbackBlock>
          </m.div>
        )}
      </AnimatePresence>
    </m.section>
  );
};

/* ---------- practice (interactive checklist) ---------- */
const PracticeStage: React.FC<{ practice: Practice; onNext: () => void }> = ({ practice, onNext }) => {
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [checked, setChecked] = useState(false);
  const allMarked = practice.items.every((_, i) => marks[i] !== undefined);
  const allCorrect = checked && practice.items.every((it, i) => marks[i] === it.correct);

  return (
    <m.section {...fade} style={col}>
      <Eyebrow icon={<ClipboardCheck size={13} />}>تمرين — قرارك إنت</Eyebrow>
      <h2 className="t-h2 measure" style={{ marginTop: 'var(--sp-4)', marginBottom: 'var(--sp-3)' }}>{practice.prompt}</h2>
      <p className="t-sm" style={{ marginBottom: 'var(--sp-5)' }}>حدّد لكل بند: مطلوب فعلاً في الملف ده، ولا لأ؟</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {practice.items.map((it, i) => {
          const mark = marks[i];
          const showResult = checked;
          const isRight = showResult && mark === it.correct;
          return (
            <div key={i} style={{
              padding: 'var(--sp-4)', borderRadius: 'var(--r-md)', background: 'var(--s-1)',
              border: `1px solid ${showResult ? (isRight ? 'var(--ready)' : 'var(--risk)') : 'var(--line-2)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                <span className="t-body" style={{ flex: 1, minWidth: 200 }}>{it.text}</span>
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  {[{ v: true, label: 'مطلوب' }, { v: false, label: 'مش مطلوب' }].map(b => (
                    <button key={String(b.v)} type="button" disabled={checked} aria-pressed={mark === b.v}
                      onClick={() => setMarks(m => ({ ...m, [i]: b.v }))}
                      style={{
                        padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-full)', fontWeight: 600,
                        fontFamily: 'var(--font-body)', cursor: checked ? 'default' : 'pointer', minHeight: 36,
                        background: mark === b.v ? 'var(--g2)' : 'transparent',
                        color: mark === b.v ? 'var(--on-gold)' : 'var(--tx2)',
                        border: `1px solid ${mark === b.v ? 'var(--g2)' : 'var(--line-2)'}`,
                        transition: 'all .15s var(--ease)',
                      }}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              {showResult && (
                <p className="t-sm" style={{ marginTop: 'var(--sp-3)', color: isRight ? 'var(--ready)' : 'var(--risk)' }} role="status">
                  {isRight ? '✓ ' : '✕ '}{it.feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 'var(--sp-5)' }} aria-live="polite">
        {!checked
          ? <Button disabled={!allMarked} onClick={() => setChecked(true)}>راجع إجاباتي <ClipboardCheck size={16} /></Button>
          : (
            <FeedbackBlock tone={allCorrect ? 'summary' : 'warning'} title={allCorrect ? 'قرار سليم' : 'شوف الفرق فوق'}
              onAction={onNext} actionLabel={<>كمّل <ArrowRight size={16} className="icon-dir" /></>}>
              {allCorrect ? 'راجعت الملف زي موظف محترف بالظبط.' : 'اقرا الملاحظات الحمرا — دي بالظبط الفروق اللي بتفرّق في الشغل الحقيقي.'}
            </FeedbackBlock>
          )}
      </div>
    </m.section>
  );
};

/* ---------- quick quiz ---------- */
/**
 * 🔴 A MISSED QUESTION USED TO DISAPPEAR.
 *
 * The trainee picked wrong, read the explanation, pressed «السؤال الجاي», and
 * the item never came back — not in this lesson, not later. Reading an
 * explanation is recognition; the platform's own retrieval module says it
 * plainly («re-reading feels productive and does almost nothing»), and that
 * module only starts after a unit exam is passed, which leaves every lesson
 * quiz with no correction loop at all.
 *
 * So the missed items come back ONCE, at the end of the same quiz, in the same
 * screen, with the options reshuffled. Not a punishment and not a second
 * score: the trainee has just read why, and pulling the answer out of memory
 * a minute later is what makes it stick. Nothing is stored and nothing is
 * graded — the lesson quiz was never a grade.
 */
const QuizStage: React.FC<{
  questions: readonly QuizQuestion[];
  onDone: () => void;
  onFirstAttempt?: (questionId: string, correct: boolean) => void;
}> = ({ questions, onDone, onFirstAttempt }) => {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [missed, setMissed] = useState<readonly QuizQuestion[]>([]);
  const [round, setRound] = useState<'first' | 'again'>('first');
  const pool = round === 'first' ? questions : missed;
  const q = pool[qi]!; // stage only mounts when questions.length > 0
  const isLast = qi >= pool.length - 1;
  const answered = picked !== null;
  const correct = answered && q.options[picked]?.correct;

  const advance = () => {
    if (!isLast) { setQi(qi + 1); setPicked(null); return; }
    if (round === 'first' && missed.length > 0) { setRound('again'); setQi(0); setPicked(null); return; }
    onDone();
  };

  return (
    <m.section {...fade} style={col}>
      <Eyebrow>{round === 'first' ? 'اتأكد إنك فهمت' : 'الأسئلة اللي زغللت — جاوبها تاني'} · {qi + 1} من {pool.length}</Eyebrow>
      <h2 className="t-h2 measure" style={{ marginTop: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>{q.prompt}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {shuffleOptions(q.options, q.id + q.prompt + round).map((o, i) => (
          <OptionButton key={i} text={o.text} state={!answered ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'}
            onPick={() => {
              setPicked(i);
              // 🔴 MEASUREMENT IS THE FIRST ATTEMPT. What the trainee could pull
              // out of memory before being told the answer is the only honest
              // signal; the correction round below is teaching, and recording it
              // would both double the attempt count and let a freshly-read
              // explanation pass as retrieval.
              if (round === 'first') onFirstAttempt?.(q.id, !!o.correct);
              // Recorded on the FIRST round only: a second miss does not queue
              // the item a third time — that is a loop, not a correction.
              if (round === 'first' && !o.correct && !missed.some(x => x.id === q.id)) setMissed([...missed, q]);
            }} />
        ))}
      </div>
      <AnimatePresence>
        {answered && (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 'var(--sp-5)' }}>
            <FeedbackBlock tone={correct ? 'summary' : 'warning'} title={correct ? 'صح' : 'مش صح — اعرف ليه'}
              onAction={advance}
              actionLabel={<>
                {!isLast ? 'السؤال الجاي' : round === 'first' && missed.length > 0 ? 'جاوب اللي زغلل تاني' : 'خلّصت الدرس'}
                <ArrowRight size={16} className="icon-dir" />
              </>}>
              {q.explanation}
            </FeedbackBlock>
          </m.div>
        )}
      </AnimatePresence>
    </m.section>
  );
};

/** Renders one version of an exchange plus why it lands the way it does. */
const DialogueBlock: React.FC<{
  tone: 'wrong' | 'right';
  label: string;
  lines: readonly { speaker: 'member' | 'staff'; line: string }[];
  why: string;
  whyLabel: string;
}> = ({ tone, label, lines, why, whyLabel }) => {
  const accent = tone === 'wrong' ? 'var(--risk)' : 'var(--ready)';
  return (
    // 🔴 This used to hand-roll its own bordered container with a header strip —
    // a sixth surface in a language that has five. A transcript is genuinely a
    // different KIND of content (two speakers, alternating), but that is a
    // content pattern, not a reason to invent a shape. It composes from Card
    // like everything else; only the arrangement inside is its own.
    <Card tone="default" pad={4}>
      <div className="t-label" style={{ color: accent, marginBottom: 'var(--sp-3)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
            <span className="t-label" style={{ minWidth: 44, flexShrink: 0, color: 'var(--tx3)', paddingTop: 'var(--sp-1)' }}>
              {l.speaker === 'member' ? 'العضو' : 'إنت'}
            </span>
            <span className="t-body" style={{
              flex: 1, padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-sm)',
              background: l.speaker === 'staff' ? 'var(--s0)' : 'var(--s-2)',
              border: '1px solid var(--line)',
            }}>{l.line}</span>
          </div>
        ))}
      </div>
      {/* The verdict on the exchange. Separated by space, not by a divider —
          negative space groups; a rule line only draws attention to itself. */}
      <div style={{ marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--line)' }}>
        <div className="t-label" style={{ color: accent, marginBottom: 'var(--sp-2)' }}>{whyLabel}</div>
        <p className="t-sm measure" style={{ margin: 0, color: 'var(--tx2)' }}>{why}</p>
      </div>
    </Card>
  );
};

/**
 * Attempt → feedback → retry → pass. Never attempt → answer → next.
 *
 * The trainee performs, then checks their own attempt against stated criteria.
 * Anything unticked is the feedback — specific and named, not "try harder" —
 * and the retry targets it. Passing requires every criterion, because a
 * sentence that promises outside policy is not 80% professional.
 *
 * The attempt count is shown, never scored: a second attempt is the method
 * working, not a failure. No streak, no XP — this is a rehearsal, not a game.
 */
const ProductionStage: React.FC<{ p: Production; onPass: () => void }> = ({ p, onPass }) => {
  const arch = p.archetypeId ? archetypeById(p.archetypeId) : undefined;
  const [started, setStarted] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [attempt, setAttempt] = useState(1);
  const [reviewed, setReviewed] = useState(false);

  const missed = p.criteria.map((_, i) => i).filter(i => !checked[i]);
  const passed = missed.length === 0;

  const MODE_LABEL = { speak: 'قولها بصوتك', roleplay: 'تمثيل مع المدرب', write: 'اكتبها' } as const;

  if (!started) {
    return (
      <m.section {...fade} style={col}>
        <Eyebrow>إنتاج · {MODE_LABEL[p.mode]}</Eyebrow>
        <h2 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-4)' }}>دورك دلوقتي</h2>
        <p className="t-body" style={{ marginBottom: 'var(--sp-5)' }}>{p.task}</p>

        {/* You face a PERSON, not a line. The gap between what they DO and what
            they WANT is where every beginner mistake lives. */}
        {arch && (
          <div style={{ marginBottom: 'var(--sp-5)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <div className="t-label" style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--s-2)', borderBottom: '1px solid var(--line)' }}>
              مين قدّامك · {arch.name}
            </div>
            <div style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <Row k="بيعمل إيه" v={arch.does} />
              <Row k="عايز إيه فعلاً" v={arch.wants} accent />
              <Row k="الفخ بتاعه" v={arch.trap} risk />
            </div>
          </div>
        )}

        {/* 🔴 THE HERO of this briefing. Success is the member MOVING — not you
            performing — and that sentence is the whole exercise. It gets the
            same shape a rule gets, because it IS one. Same language, no new
            object: the trainee already learned to stop at a spine. */}
        {p.arc && (
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <SpineWell label={`النجاح = ${STATE_LABEL[p.arc.opensAs as MemberState]} ← ${STATE_LABEL[p.arc.targetState as MemberState]}`}>
              <p className="t-body measure" style={{ margin: 0, color: 'var(--tx0)', fontWeight: 500 }}>
                مش إنك تقول الجملة الصح — إنه يتحرك.
              </p>
              <ul className="t-sm" style={{ margin: 'var(--sp-3) 0 0', paddingInlineStart: '1.1em', color: 'var(--tx2)' }}>
                {p.arc.signsOfShift.map(sg => <li key={sg} style={{ marginBottom: 'var(--sp-1)' }}>{sg}</li>)}
              </ul>
            </SpineWell>
          </div>
        )}

        {/* The counter is never a quiet room. */}
        {p.distractors && p.distractors.length > 0 && (
          <Card tone="quiet" pad={4} layout={{ marginBottom: 'var(--sp-5)' }}>
            <div className="t-label" style={{ color: 'var(--attn)', marginBottom: 'var(--sp-3)' }}>هيحصل كمان أثناء الكلام</div>
            {p.distractors.map(d => (
              <div key={d.event} style={{ marginBottom: 'var(--sp-3)' }}>
                <p className="t-sm" style={{ margin: 0, color: 'var(--tx1)' }}>{d.event}</p>
                <p className="t-sm" style={{ margin: 'var(--sp-1) 0 0', color: 'var(--tx3)' }}>{d.tests}</p>
              </div>
            ))}
          </Card>
        )}
        {/* Prose, not a card. This is a kind aside, and a card would have given
            it the same footing as the exercise — four surfaces in a row and the
            trainee reads none of them. */}
        <p className="t-sm measure" style={{ margin: '0 var(--sp-2) var(--sp-6)', color: 'var(--tx3)', lineHeight: 1.75 }}>
          محدش بيقيّمك هنا. ده تمرين — تقولها، تشوف نقصت إيه، وتقولها تاني.
          <strong style={{ color: 'var(--tx2)' }}> أول مرة تنطقها المفروض تكون هنا، مش قدّام عضو.</strong>
        </p>
        <Button onClick={() => setStarted(true)}>بدأت <ArrowRight size={16} className="icon-dir" /></Button>
      </m.section>
    );
  }

  return (
    <m.section {...fade} style={col}>
      <Eyebrow>إنتاج · محاولة {attempt}</Eyebrow>
      <h2 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>راجع اللي قلته</h2>
      <p className="t-sm" style={{ color: 'var(--tx3)', marginBottom: 'var(--sp-5)' }}>
        علّم على اللي عملته فعلاً — مش على اللي كنت ناوي تعمله.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {p.criteria.map((c, i) => (
          <label key={i} className="row-hover" style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
            <input type="checkbox" checked={checked[i] === true} style={{ width: 17, height: 17, marginTop: 'var(--sp-1)', accentColor: 'var(--g2)' }}
              onChange={e => { setChecked(v => ({ ...v, [i]: e.target.checked })); setReviewed(false); }} />
            <span className="t-sm" style={{ flex: 1 }}>{c}</span>
          </label>
        ))}
      </div>

      {!reviewed && (
        <div style={{ marginTop: 'var(--sp-5)' }}>
          <Button onClick={() => setReviewed(true)}>شوف نتيجتي</Button>
        </div>
      )}

      {reviewed && !passed && (
        <m.div {...fade} style={{ marginTop: 'var(--sp-5)' }}>
          <SpineWell spine="risk" label={`ناقص ${missed.length}`}>
            <ul className="t-sm" style={{ margin: 0, paddingInlineStart: '1.1em', color: 'var(--tx1)' }}>
              {missed.map(i => <li key={i} style={{ marginBottom: 'var(--sp-1)' }}>{p.criteria[i]}</li>)}
            </ul>
          </SpineWell>
          <Card tone="quiet" pad={4} layout={{ marginTop: 'var(--sp-3)' }}>
            <div className="t-label" style={{ color: 'var(--tx3)', marginBottom: 'var(--sp-2)' }}>اللي بيحصل عادة في المحاولة الأولى</div>
            <ul className="t-sm" style={{ margin: 0, paddingInlineStart: '1.1em', color: 'var(--tx2)' }}>
              {p.commonMisses.map(m => <li key={m} style={{ marginBottom: 'var(--sp-1)' }}>{m}</li>)}
            </ul>
          </Card>
          {/* The retry IS the method. Nothing here calls it a failure. */}
          <div style={{ marginTop: 'var(--sp-5)' }}>
            <Button onClick={() => { setAttempt(a => a + 1); setChecked({}); setReviewed(false); }}>
              قولها تاني — والمرة دي ركّز على اللي فوق
            </Button>
          </div>
        </m.div>
      )}

      {reviewed && passed && (
        <m.div {...fade} style={{ marginTop: 'var(--sp-5)' }}>
          <p className="t-body" style={{ margin: '0 0 var(--sp-4)' }}>
            الأربعة اتعملوا{attempt > 1 ? ` — بعد ${attempt} محاولات، وده الطبيعي` : ''}.
            {' '}دي الجملة اللي هتقولها بكرة على الكاونتر.
          </p>
          {/* ONE question, about the trainee's own conduct. Not a knowledge
              check — those measure the wrong thing at the wrong moment. */}
          {p.reflection && (
            <Card tone="raised" pad={4} layout={{ marginBottom: 'var(--sp-5)' }}>
              <div className="t-label" style={{ marginBottom: 'var(--sp-2)' }}>سؤال واحد قبل ما تكمّل</div>
              <p className="t-body" style={{ margin: 0 }}>{p.reflection}</p>
              <p className="t-sm" style={{ margin: 'var(--sp-2) 0 0', color: 'var(--tx3)' }}>
                مش محتاج تكتبه — بس متعديش من غير ما تجاوبه لنفسك.
              </p>
            </Card>
          )}
          <Button onClick={onPass}>كمّل <ArrowRight size={16} className="icon-dir" /></Button>
        </m.div>
      )}
    </m.section>
  );
};

/** One labelled line inside the archetype brief. */
const Row: React.FC<{ k: string; v: string; accent?: boolean; risk?: boolean }> = ({ k, v, accent, risk }) => (
  <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
    <span className="t-label" style={{ minWidth: 92, flexShrink: 0, color: risk ? 'var(--risk)' : accent ? 'var(--g1)' : 'var(--tx3)' }}>{k}</span>
    <span className="t-sm" style={{ flex: 1, color: 'var(--tx1)' }}>{v}</span>
  </div>
);

/**
 * SpineWell — the academy's signature object.
 *
 * A statement that carries weight SINKS into the page and grows a coloured spine
 * along its reading edge. Recessed rather than raised, on purpose: a raised card
 * says «notice me and move on»; a well says «this is set into the page», and the
 * eye stops because the surface itself changed under it.
 *
 * The spine is not a border. A border frames a thing; a spine points at it — and
 * in RTL it runs down the edge the eye starts from, so it is the first thing
 * seen and the last thing left.
 *
 * This is the visual signature: wherever the academy has something that MATTERS
 * — a rule, the professional way, a verdict — it looks like this. A screenshot
 * should be identifiable without the logo.
 */
// SpineWell now lives in ui/primitives (shared signature object) — imported above.

/** A rule — the sentence that decides whether a member is served right tomorrow. */
const RuleObject: React.FC<{ text: string }> = ({ text }) => (
  <SpineWell>
    <p className="t-body measure" style={{ margin: 0, color: 'var(--tx0)', fontWeight: 500, lineHeight: 1.75 }}>{text}</p>
  </SpineWell>
);

/**
 * An ordinary point — text with a mark, nothing more.
 * Not a lesser card, because it is not a card: it is prose in the reading flow.
 * If everything is an object, nothing is.
 */
const SupportingPoint: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', padding: '0 var(--sp-2)' }}>
    <Check size={16} strokeWidth={2.5} style={{ color: 'var(--tx3)', marginTop: 'var(--sp-1)', flexShrink: 0 }} />
    <span className="t-body measure" style={{ color: 'var(--tx1)' }}>{text}</span>
  </div>
);