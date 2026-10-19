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
    <div className="stack min-h-screen">
      {/* Orientation: the lesson's name and its place in the unit sit in the
          chrome; the bar shows progress within this lesson. */}
      <ScreenHeader onBack={onExit} maxWidth={WIDTH.focus}
        rail={<ProgressRail total={stages.length - 1} current={idx} />}
        leading={
          <span className="stack" style={{ minWidth: 0 }}>
            <span className="t-label">{unitCode} · درس {lessonIndex + 1} من {lessonCount}</span>
            <span className="t-sm c-tx1" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '42vw' }}>
              {lesson.title}
            </span>
          </span>
        } />

      <main ref={headingRef} tabIndex={-1} className="stack grow" style={{ outline: 'none' }}>
        <AnimatePresence mode="wait">
          {/* ── CHALLENGE ─────────────────────────────────────────────────
              A real situation, alone, before a single word of explanation.
              The trainee must want the answer before being given one. */}
          {stage === 'challenge' && lesson.pro?.openingChallenge && (
            <m.section key="challenge" {...fade} className="focus-col stack grow justify-center">
              <Eyebrow icon={<HelpCircle size={13} />}>موقف في المكتب</Eyebrow>
              <h1 className="t-h1 measure mt-4">{lesson.pro.openingChallenge}</h1>
              {/* The trainee's own question, under the situation that provokes
                  it — one beat, one screen. Splitting them would open the
                  lesson twice with the same emotion. */}
              <p className="t-lead measure mt-4 c-tx2">{lesson.employeeQuestion}</p>
              <div className="mt-5">
                <Callout tone="objective">{lesson.objective}</Callout>
              </div>
              <div className="mt-7">
                <Button onClick={next}>تفتكر تعمل إيه؟ <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {stage === 'ask' && (
            <m.section key="ask" {...fade} className="focus-col stack grow justify-center">
              <Eyebrow icon={<HelpCircle size={13} />}>سؤال بيقابلك في الشغل</Eyebrow>
              <h1 className="t-h1 measure mt-4">{lesson.employeeQuestion}</h1>
              <div className="mt-6">
                <Callout tone="objective">{lesson.objective}</Callout>
              </div>
              <div className="mt-7">
                <Button onClick={next}>يلا نجاوب عليه <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {stage === 'predict' && <PredictStage key="predict" lesson={lesson} onNext={next} />}

          {/* ── LEARN ─────────────────────────────────────────────────────
              Eye path, and the markup follows it:
                ① eyebrow  · a quiet line: where you are
                ② intro    · one lead sentence, larger than body
                ③ RULES    · the focal point. Everything above leads here.
                ④ example  · supports the rule, never competes with it
                ⑤ button   · the exit
              Rules render as RuleObject, ordinary points as SupportingPoint; the
              example is prose, so it never outweighs the rule. */}
          {stage === 'learn' && (
            <m.section key="learn" {...fade} className="focus-col">
              <Eyebrow>{lesson.title}</Eyebrow>

              <p className="t-lead measure mt-3 mb-6">
                {lesson.intro}
              </p>

              {/* Framing, not a screen of its own: three lines do not earn a
                  Continue tap. It sits above the rules because it is why they
                  matter — the rule stays the hero. */}
              {lesson.pro?.whyMatters && (
                <div className="mb-6">
                  <Callout tone="objective">{lesson.pro.whyMatters}</Callout>
                </div>
              )}

              {/* ③ THE HERO */}
              <ul role="list" className="stack m-0 gap-3" style={{ listStyle: 'none', padding: 0 }}>
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
                className="mt-6"
              >
                <Eyebrow icon={<Lightbulb size={13} />}>مثال من الشغل</Eyebrow>
                <p className="t-body measure mt-3 c-tx2">
                  {lesson.example}
                </p>

                <RuleExamples rules={ruleRefs} />

                <div className="mt-6">
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
            <m.section key="reflect" {...fade} className="focus-col stack grow justify-center">
              <Eyebrow icon={<Lightbulb size={13} />}>خد ثانية وفكّر</Eyebrow>
              <h2 className="t-h2 measure mt-4">{lesson.pro.reflectiveQuestion}</h2>
              <div className="mt-7">
                <Button variant="ghost" onClick={next}>فكّرت <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {/* ── OFFICE ────────────────────────────────────────────────────
              One moment from two sides — what happened, and what the member
              felt while it happened. Splitting them would break the scene. */}
          {stage === 'office' && lesson.pro?.officeScenario && (
            <m.section key="office" {...fade} className="focus-col">
              <Eyebrow icon={<ClipboardCheck size={13} />}>في المكتب</Eyebrow>
              <p className="t-lead measure mt-3">{lesson.pro.officeScenario}</p>
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
                <div className="mt-6">
                  <SpineWell>
                    <span className="t-label c-tx3">العضو حاسس بإيه</span>
                    <p className="t-body measure" style={{ margin: 'var(--sp-2) 0 0' }}>{lesson.pro.customerPerspective}</p>
                  </SpineWell>
                </div>
              )}
              <div className="mt-7">
                <Button onClick={next}>طيب أتصرّف إزاي؟ <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {/* ── COACH ─────────────────────────────────────────────────────
              The emotional peak: the trainer talking in your ear. It closes on
              the golden rule — the one line meant to survive years. */}
          {stage === 'coach' && lesson.pro?.professionalThinking && (
            <m.section key="coach" {...fade} className="focus-col">
              <Eyebrow icon={<Sparkles size={13} />}>إزاي المحترف بيفكّر</Eyebrow>
              <p className="t-lead measure mt-3">{lesson.pro.professionalThinking}</p>
              {lesson.pro.ownershipMindset && (
                <p className="t-body measure mt-5 c-tx1">{lesson.pro.ownershipMindset}</p>
              )}
              {lesson.pro.goldenRule && (
                <div className="mt-6">
                  <Callout tone="objective">{lesson.pro.goldenRule}</Callout>
                </div>
              )}
              <div className="mt-7">
                <Button onClick={next}>كمّل <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {/* ── MISTAKES ──────────────────────────────────────────────────
              Contrast, and only after the right model exists to contrast with. */}
          {stage === 'mistakes' && lesson.pro?.commonMistakes?.length && (
            <m.section key="mistakes" {...fade} className="focus-col">
              <Eyebrow>أخطاء بتحصل كتير</Eyebrow>
              <ul role="list" className="stack gap-3" style={{ listStyle: 'none', margin: 'var(--sp-4) 0 0', padding: 0 }}>
                {lesson.pro.commonMistakes.map((m, i) => (
                  <li key={i} className="t-body measure row gap-3 items-start">
                    <span aria-hidden className="c-risk no-shrink">✕</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Button onClick={next}>كمّل <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {stage === 'dialogue' && lesson.dialogue && (
        <m.section {...fade} className="focus-col">
          <Eyebrow>نفس الموقف · نفس القرار</Eyebrow>
          <h2 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>الفرق في التوصيل</h2>
          <p className="t-body c-tx2 mb-5">{lesson.dialogue.setup}</p>

          <DialogueBlock tone="wrong" label="❌ الحوار الغلط" lines={lesson.dialogue.wrong} why={lesson.dialogue.whyWrongFails} whyLabel="ليه بيفشل" />
          <div style={{ height: 'var(--sp-5)' }} />
          <DialogueBlock tone="right" label="✅ الحوار الصح" lines={lesson.dialogue.right} why={lesson.dialogue.whyRightWorks} whyLabel="ليه بينجح" />

          <p className="t-sm c-tx3 mt-5">
            الحوارات دي أمثلة مش جمل تتحفظ — اللي بينتقل معاك هو المبدأ.
          </p>
          <div className="mt-5">
            <Button onClick={next}>كمّل <ArrowRight size={16} className="icon-dir" /></Button>
          </div>
        </m.section>
      )}

      {stage === 'comms' && lesson.comms && (
        <m.section {...fade} className="focus-col">
          <Eyebrow>{lesson.comms.audience === 'sales' ? 'التوصيل الداخلي · للمبيعات' : 'التوصيل · للعضو'}</Eyebrow>
          <h2 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-5)' }}>
            {lesson.comms.audience === 'sales'
              ? 'الفخ والأفضل — في الطلب الداخلي'
              : 'الفخ والأفضل — قدّام العضو'}
          </h2>
          <div className="stack gap-4">
            {/* EYE PATH: the trap · its cost · the way out.
                ① and ③ are objects — they are things that happen and things you
                   do, and the trainee already knows a spine means «stop here».
                ② is PROSE. It used to be a third identical card, which made the
                   consequence read as an equal option rather than the reason the
                   trap matters at all. */}
            <SpineWell spine="risk" label="⚠️ فخ احترافي">
              <p className="t-body measure m-0">{lesson.comms.risk}</p>
            </SpineWell>

            <div style={{ padding: '0 var(--sp-2)' }}>
              <div className="t-label c-tx3 mb-2">بيحصل إيه لما تقع فيه</div>
              <p className="t-body measure m-0 c-tx2">{lesson.comms.why}</p>
            </div>

            <SpineWell label="⭐ الأفضل">
              <p className="t-body measure m-0 c-tx0" style={{ fontWeight: 500 }}>{lesson.comms.instead}</p>
            </SpineWell>
          </div>
          <div className="mt-6">
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
            <m.section key="commit" {...fade} className="focus-col stack grow justify-center">
              <Eyebrow>هتركّز على إيه بكرة؟</Eyebrow>
              <h2 className="t-h3 measure mt-3 mb-5">اختار حاجة واحدة بس.</h2>
              <div className="stack gap-3">
                {lesson.pro.commitmentOptions.map(o => (
                  <OptionButton key={o} text={o}
                    state={commitment === o ? 'correct' : commitment ? 'dim' : 'idle'}
                    onPick={() => setCommitment(o)} />
                ))}
              </div>
              <div className="mt-6">
                <Button disabled={!commitment} onClick={() => { if (commitment) onCommit?.(commitment); next(); }}>ده اللي هركّز عليه <ArrowRight size={16} className="icon-dir" /></Button>
              </div>
            </m.section>
          )}

          {stage === 'done' && (
            <m.section key="done" {...fade} className="focus-col stack grow justify-center">
              {/* THE HERO — capability, never completion. «You finished» rewards
                  attendance; «tomorrow you can» rewards becoming. The whole
                  screen is sized so the eye lands here first and only here. */}
              <div className="text-center">
                <Eyebrow icon={<Sparkles size={13} />}>بكرة في الفرع</Eyebrow>
                <h2 className="t-h2 measure mt-3" style={{ marginInline: 'auto' }}>
                  {lesson.pro?.tomorrowInBranch ?? lesson.canNow}
                </h2>
              </div>

              {/* The golden rule, second and last time — spaced repetition
                  inside one lesson is how a line survives a year. */}
              {lesson.pro?.goldenRule && (
                <p className="t-lead measure mt-5 text-center c-g1" style={{ marginInline: 'auto' }}>
                  {lesson.pro.goldenRule}
                </p>
              )}

              {/* Everything practical drops to a quiet block: present, findable,
                  and never competing with the hero above it. */}
              {lesson.pro && (
                <div className="stack mt-7 gap-4">
                  {commitment && <DoneRow label="التزامك بكرة" body={commitment} />}
                  {lesson.pro.dailyHabit && <DoneRow label="عادة النهاردة · أقل من دقيقة" body={lesson.pro.dailyHabit} />}
                  {lesson.pro.officeTask && <DoneRow label="مهمتك مع مدربك" body={lesson.pro.officeTask} />}
                  {lesson.pro.trainerQuestions?.length ? (
                    <div>
                      <span className="t-label c-tx3">اسأل مدربك — متخمّنش</span>
                      <ul role="list" className="stack gap-2" style={{ listStyle: 'none', margin: 'var(--sp-2) 0 0', padding: 0 }}>
                        {lesson.pro.trainerQuestions.map((q, i) => (
                          <li key={i} className="t-sm c-tx1">• {q}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {lesson.pro.readinessCheck && (
                    <SpineWell>
                      <span className="t-label c-tx3">
                        {lesson.pro.readinessCheck.level === 'YES' ? 'جاهز' : lesson.pro.readinessCheck.level === 'NO' ? 'لسه بدري' : 'قربت'}
                      </span>
                      <p className="t-body measure" style={{ margin: 'var(--sp-2) 0 0' }}>{lesson.pro.readinessCheck.why}</p>
                    </SpineWell>
                  )}
                  {lesson.pro.closingReflection && (
                    <p className="t-sm measure c-tx2">{lesson.pro.closingReflection}</p>
                  )}
                </div>
              )}

              {/* skills this lesson moved */}
              <div className="row mt-6 gap-2 wrap justify-center">
                {lessonSkillTouches(moduleId, lesson.id).map(t => (
                  <Capsule key={t.name}>{t.name} · {LEVEL_LABEL[t.level]}</Capsule>
                ))}
              </div>

              <div className="row mt-6 gap-3 wrap justify-center">
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
    <span className="t-label c-tx3">{label}</span>
    <p className="t-body measure" style={{ margin: 'var(--sp-2) 0 0' }}>{body}</p>
  </div>
);

/* ---------- prediction ---------- */
const PredictStage: React.FC<{ lesson: Lesson; onNext: () => void }> = ({ lesson, onNext }) => {
  const [picked, setPicked] = useState<number | null>(null);
  const p = lesson.prediction;
  return (
    <m.section {...fade} className="focus-col">
      <Eyebrow icon={<HelpCircle size={13} />}>قبل ما نقولك القاعدة — إنت إيه رأيك؟</Eyebrow>
      <h2 className="t-h2 measure mt-4 mb-6">{p.prompt}</h2>
      <div className="stack gap-3">
        {shuffleOptions(p.options, p.prompt).map((o, i) => (
          <OptionButton key={i} text={o.text} state={picked === null ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'} onPick={() => setPicked(i)} />
        ))}
      </div>
      <AnimatePresence>
        {picked !== null && (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
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
    <m.section {...fade} className="focus-col">
      <Eyebrow icon={<ClipboardCheck size={13} />}>تمرين — قرارك إنت</Eyebrow>
      <h2 className="t-h2 measure mt-4 mb-3">{practice.prompt}</h2>
      <p className="t-sm mb-5">حدّد لكل بند: مطلوب فعلاً في الملف ده، ولا لأ؟</p>
      <div className="stack gap-3">
        {practice.items.map((it, i) => {
          const mark = marks[i];
          const showResult = checked;
          const isRight = showResult && mark === it.correct;
          return (
            <div key={i} style={{
              padding: 'var(--sp-4)', borderRadius: 'var(--r-md)', background: 'var(--s-1)',
              border: `1px solid ${showResult ? (isRight ? 'var(--ready)' : 'var(--risk)') : 'var(--line-2)'}`,
            }}>
              <div className="row items-center gap-3 wrap">
                <span className="t-body grow" style={{ minWidth: 200 }}>{it.text}</span>
                <div className="row gap-2">
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
                <p className="t-sm mt-3" style={{ color: isRight ? 'var(--ready)' : 'var(--risk)' }} role="status">
                  {isRight ? '✓ ' : '✕ '}{it.feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5" aria-live="polite">
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
 * Missed questions come back once, at the end of the same quiz, with the
 * options reshuffled: retrieval a minute after reading the explanation is what
 * makes it stick. Nothing is stored or graded — the lesson quiz is not a grade.
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
    <m.section {...fade} className="focus-col">
      <Eyebrow>{round === 'first' ? 'اتأكد إنك فهمت' : 'الأسئلة اللي زغللت — جاوبها تاني'} · {qi + 1} من {pool.length}</Eyebrow>
      <h2 className="t-h2 measure mt-4 mb-6">{q.prompt}</h2>
      <div className="stack gap-3">
        {shuffleOptions(q.options, q.id + q.prompt + round).map((o, i) => (
          <OptionButton key={i} text={o.text} state={!answered ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'}
            onPick={() => {
              setPicked(i);
              // Only the first attempt is measured; the correction round is teaching,
              // and recording it would count a freshly read explanation as retrieval.
              if (round === 'first') onFirstAttempt?.(q.id, !!o.correct);
              // Recorded on the FIRST round only: a second miss does not queue
              // the item a third time — that is a loop, not a correction.
              if (round === 'first' && !o.correct && !missed.some(x => x.id === q.id)) setMissed([...missed, q]);
            }} />
        ))}
      </div>
      <AnimatePresence>
        {answered && (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
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
    // A transcript composes from Card like every other surface; only the
    // two-speaker arrangement inside is its own.
    <Card tone="default" pad={4}>
      <div className="t-label mb-3" style={{ color: accent }}>
        {label}
      </div>
      <div className="stack gap-3">
        {lines.map((l, i) => (
          <div key={i} className="row gap-3 items-start">
            <span className="t-label no-shrink c-tx3" style={{ minWidth: 44, paddingTop: 'var(--sp-1)' }}>
              {l.speaker === 'member' ? 'العضو' : 'إنت'}
            </span>
            <span className="t-body grow" style={{ padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-sm)', background: l.speaker === 'staff' ? 'var(--s0)' : 'var(--s-2)', border: '1px solid var(--line)' }}>{l.line}</span>
          </div>
        ))}
      </div>
      {/* The verdict on the exchange. Separated by space, not by a divider —
          negative space groups; a rule line only draws attention to itself. */}
      <div className="mt-4" style={{ paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--line)' }}>
        <div className="t-label mb-2" style={{ color: accent }}>{whyLabel}</div>
        <p className="t-sm measure m-0 c-tx2">{why}</p>
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
      <m.section {...fade} className="focus-col">
        <Eyebrow>إنتاج · {MODE_LABEL[p.mode]}</Eyebrow>
        <h2 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-4)' }}>دورك دلوقتي</h2>
        <p className="t-body mb-5">{p.task}</p>

        {/* You face a PERSON, not a line. The gap between what they DO and what
            they WANT is where every beginner mistake lives. */}
        {arch && (
          <div className="mb-5" style={{ border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <div className="t-label" style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--s-2)', borderBottom: '1px solid var(--line)' }}>
              مين قدّامك · {arch.name}
            </div>
            <div className="stack gap-3" style={{ padding: 'var(--sp-4)' }}>
              <Row k="بيعمل إيه" v={arch.does} />
              <Row k="عايز إيه فعلاً" v={arch.wants} accent />
              <Row k="الفخ بتاعه" v={arch.trap} risk />
            </div>
          </div>
        )}

        {/* The briefing's hero: success is the member moving, not you performing.
            It takes the rule's shape because it is one. */}
        {p.arc && (
          <div className="mb-5">
            <SpineWell label={`النجاح = ${STATE_LABEL[p.arc.opensAs as MemberState]} ← ${STATE_LABEL[p.arc.targetState as MemberState]}`}>
              <p className="t-body measure m-0 c-tx0" style={{ fontWeight: 500 }}>
                مش إنك تقول الجملة الصح — إنه يتحرك.
              </p>
              <ul className="t-sm c-tx2" style={{ margin: 'var(--sp-3) 0 0', paddingInlineStart: '1.1em' }}>
                {p.arc.signsOfShift.map(sg => <li key={sg} className="mb-1">{sg}</li>)}
              </ul>
            </SpineWell>
          </div>
        )}

        {/* The counter is never a quiet room. */}
        {p.distractors && p.distractors.length > 0 && (
          <Card tone="quiet" pad={4} layout={{ marginBottom: 'var(--sp-5)' }}>
            <div className="t-label c-attn mb-3">هيحصل كمان أثناء الكلام</div>
            {p.distractors.map(d => (
              <div key={d.event} className="mb-3">
                <p className="t-sm m-0 c-tx1">{d.event}</p>
                <p className="t-sm c-tx3" style={{ margin: 'var(--sp-1) 0 0' }}>{d.tests}</p>
              </div>
            ))}
          </Card>
        )}
        {/* Prose, not a card. This is a kind aside, and a card would have given
            it the same footing as the exercise — four surfaces in a row and the
            trainee reads none of them. */}
        <p className="t-sm measure c-tx3" style={{ margin: '0 var(--sp-2) var(--sp-6)', lineHeight: 1.75 }}>
          محدش بيقيّمك هنا. ده تمرين — تقولها، تشوف نقصت إيه، وتقولها تاني.
          <strong className="c-tx2"> أول مرة تنطقها المفروض تكون هنا، مش قدّام عضو.</strong>
        </p>
        <Button onClick={() => setStarted(true)}>بدأت <ArrowRight size={16} className="icon-dir" /></Button>
      </m.section>
    );
  }

  return (
    <m.section {...fade} className="focus-col">
      <Eyebrow>إنتاج · محاولة {attempt}</Eyebrow>
      <h2 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>راجع اللي قلته</h2>
      <p className="t-sm c-tx3 mb-5">
        علّم على اللي عملته فعلاً — مش على اللي كنت ناوي تعمله.
      </p>

      <div className="stack gap-2">
        {p.criteria.map((c, i) => (
          <label key={i} className="row-hover row gap-3 items-start" style={{ padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
            <input type="checkbox" checked={checked[i] === true} className="mt-1" style={{ width: 17, height: 17, accentColor: 'var(--g2)' }}
              onChange={e => { setChecked(v => ({ ...v, [i]: e.target.checked })); setReviewed(false); }} />
            <span className="t-sm grow">{c}</span>
          </label>
        ))}
      </div>

      {!reviewed && (
        <div className="mt-5">
          <Button onClick={() => setReviewed(true)}>شوف نتيجتي</Button>
        </div>
      )}

      {reviewed && !passed && (
        <m.div {...fade} className="mt-5">
          <SpineWell spine="risk" label={`ناقص ${missed.length}`}>
            <ul className="t-sm m-0 c-tx1" style={{ paddingInlineStart: '1.1em' }}>
              {missed.map(i => <li key={i} className="mb-1">{p.criteria[i]}</li>)}
            </ul>
          </SpineWell>
          <Card tone="quiet" pad={4} layout={{ marginTop: 'var(--sp-3)' }}>
            <div className="t-label c-tx3 mb-2">اللي بيحصل عادة في المحاولة الأولى</div>
            <ul className="t-sm m-0 c-tx2" style={{ paddingInlineStart: '1.1em' }}>
              {p.commonMisses.map(m => <li key={m} className="mb-1">{m}</li>)}
            </ul>
          </Card>
          {/* The retry IS the method. Nothing here calls it a failure. */}
          <div className="mt-5">
            <Button onClick={() => { setAttempt(a => a + 1); setChecked({}); setReviewed(false); }}>
              قولها تاني — والمرة دي ركّز على اللي فوق
            </Button>
          </div>
        </m.div>
      )}

      {reviewed && passed && (
        <m.div {...fade} className="mt-5">
          <p className="t-body" style={{ margin: '0 0 var(--sp-4)' }}>
            الأربعة اتعملوا{attempt > 1 ? ` — بعد ${attempt} محاولات، وده الطبيعي` : ''}.
            {' '}دي الجملة اللي هتقولها بكرة على الكاونتر.
          </p>
          {/* ONE question, about the trainee's own conduct. Not a knowledge
              check — those measure the wrong thing at the wrong moment. */}
          {p.reflection && (
            <Card tone="raised" pad={4} layout={{ marginBottom: 'var(--sp-5)' }}>
              <div className="t-label mb-2">سؤال واحد قبل ما تكمّل</div>
              <p className="t-body m-0">{p.reflection}</p>
              <p className="t-sm c-tx3" style={{ margin: 'var(--sp-2) 0 0' }}>
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
  <div className="row gap-3 items-start">
    <span className="t-label no-shrink" style={{ minWidth: 92, color: risk ? 'var(--risk)' : accent ? 'var(--g1)' : 'var(--tx3)' }}>{k}</span>
    <span className="t-sm grow c-tx1">{v}</span>
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
    <p className="t-body measure m-0 c-tx0" style={{ fontWeight: 500, lineHeight: 1.75 }}>{text}</p>
  </SpineWell>
);

/**
 * An ordinary point — text with a mark, nothing more.
 * Not a lesser card, because it is not a card: it is prose in the reading flow.
 * If everything is an object, nothing is.
 */
const SupportingPoint: React.FC<{ text: string }> = ({ text }) => (
  <div className="row gap-3 items-start" style={{ padding: '0 var(--sp-2)' }}>
    <Check size={16} strokeWidth={2.5} className="c-tx3 mt-1 no-shrink" />
    <span className="t-body measure c-tx1">{text}</span>
  </div>
);