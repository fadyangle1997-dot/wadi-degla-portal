/**
 * LessonFlow — the signature interaction. Staged rhythm (progressive disclosure):
 *   ask → predict → learn (+ live rule examples) → practice? → quiz? → done
 * Stage list is computed per lesson from data (practice/quiz optional), so an
 * empty quiz can never mount the quiz stage — the render-phase bug class is
 * structurally impossible now. All persistence is event-driven via onComplete.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { HelpCircle, Lightbulb, Sparkles, ArrowRight, ChevronLeft, ClipboardCheck } from 'lucide-react';
import { Icon } from '../../ui/Icon';
import type { Lesson } from '../../domain/types/content';
import { Button, Eyebrow, Callout, OptionButton, FlowRoom, FlowSplit, Achievement, Capsule, SpineWell, Content } from '../../ui/primitives';
import { useLang, t, tf } from '../../app/i18n';
import { lessonSkillTouches, LEVEL_LABEL } from '../../app/skills';
import { RuleExamples } from './ruleRenderers';
import { RuleObject, SupportingPoint, DialogueBlock, DoneRow } from './lessonBlocks';
import { PredictStage } from './PredictStage';
import { PracticeStage } from './PracticeStage';
import { QuizStage } from './QuizStage';
import { ProductionStage } from './ProductionStage';
import { FileJourneyMap } from './FileJourneyMap';
import { DeclarationMatrix } from './DeclarationMatrix';
import { AgeEligibilityTimeline } from './AgeEligibilityTimeline';
import { RenewalPenaltyTiers } from './RenewalPenaltyTiers';
import { CheckBeforeActFlow } from './CheckBeforeActFlow';
import { fade, achieve } from '../../ui/motion';

type Stage = 'challenge' | 'ask' | 'predict' | 'learn' | 'reflect' | 'office' | 'coach' | 'mistakes' | 'dialogue' | 'comms' | 'produce' | 'practice' | 'quiz' | 'commit' | 'done';

/** What the trainee is doing on each screen, named in the chrome so the bar of
 *  segments is never the only answer to «where am I in this lesson». */
const STAGE_LABEL: Record<Stage, string> = {
  challenge: 'الموقف', ask: 'السؤال', predict: 'توقّعك', learn: 'القاعدة', reflect: 'وقفة',
  office: 'في المكتب', coach: 'تفكير المحترف', mistakes: 'أخطاء بتتكرر', dialogue: 'الحوار',
  comms: 'إزاي تقولها', produce: 'قولها بنفسك', practice: 'تمرين', quiz: 'أسئلة سريعة',
  commit: 'التزام بكرة', done: 'الخلاصة',
};

interface Props {
  lesson: Lesson;
  /** «الوحدة 3 من 9» — the unit's place in the programme, never its internal code. */
  unitLabel: string;
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
  /** Called once, when the closing screen is reached: everything the lesson
   *  asks has been done, so leaving from there by any route keeps it. */
  onComplete: () => void;
  /** Completion AND return to the path — the two were fused, so «ارجع للمسار»
   *  silently did nothing whenever a next lesson existed. */
  onFinish?: () => void;
  onExit: () => void;
  /** Where leaving goes, in words: the path, or the roadmap it was opened from. */
  exitLabel?: string;
}


export const LessonFlow: React.FC<Props> = ({ lesson, unitLabel, moduleId, lessonIndex, lessonCount, nextStep, onCommit, onQuizAttempt, onComplete, onFinish, onExit, exitLabel }) => {
  const lang = useLang();
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

  // Where the trainee is in the lesson survives leaving it, for this browser
  // session: exiting mid-lesson is then a pause, not a loss, and needs no
  // confirmation. Only a position inside the same stage list is trusted.
  const posKey = `wda.lessonpos.v1.${lesson.id}`;
  const [idx, setIdx] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(posKey) ?? 'null') as { n: number; at: number } | null;
      return saved && saved.n === stages.length && saved.at > 0 && saved.at < stages.length - 1 ? saved.at : 0;
    } catch { return 0; }
  });
  // The trainee's one focus for tomorrow. Local to the lesson: it is echoed on
  // the closing screen so the choice is not swallowed. Carrying it across
  // sessions would need a store change, so it is deliberately not persisted.
  const [commitment, setCommitment] = useState<string | null>(null);
  const stage = stages[idx] ?? 'done';
  // A press moves from the stage it was drawn on, once. A leaving stage keeps
  // its button on screen while it fades, so a double-click lands twice; counting
  // from wherever the lesson is by then would skip the next stage, quiz included.
  const next = () => setIdx(i => (i === idx ? Math.min(i + 1, stages.length - 1) : i));
  // «السابق» re-reads what came before. It never steps into the quiz or back
  // past it: the quiz records each question's FIRST answer for spaced
  // retrieval, and a second «first» answer would change that schedule. The
  // closing screen has its own ways on.
  const quizAt = stages.indexOf('quiz');
  const floor = quizAt >= 0 && idx > quizAt ? quizAt + 1 : 0;
  const canGoBack = idx > floor && stage !== 'quiz' && stage !== 'done';
  const prev = () => setIdx(i => (i === idx ? Math.max(i - 1, floor) : i));
  // «السابق» sits with the stage's own actions where the stage is a question
  // beside its answers (as in the exam and the review); on a reading stage it
  // follows the text.
  const backButton = canGoBack ? <Button variant="ghost" onClick={prev}><Icon as={ChevronLeft} dir /> السابق</Button> : null;
  const splitStage = stage === 'predict' || stage === 'commit';
  const ruleRefs = useMemo(() => lesson.points.flatMap(p => (p.rule ? [p.rule] : [])), [lesson]);
  const headingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Focus management: move focus to the stage container so screen-reader and
    // keyboard users land at the new content, not on the old button (Phase 2 §6).
    // A new stage starts at its top: focusing alone scrolled the stage's first
    // lines under the sticky lesson bar on a phone.
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [stage]);

  useEffect(() => {
    try {
      if (stage === 'done') sessionStorage.removeItem(posKey);
      else sessionStorage.setItem(posKey, JSON.stringify({ n: stages.length, at: idx }));
    } catch { /* position is a convenience */ }
  }, [idx, stage, stages.length, posKey]);

  // Completion is recorded on arrival, once: before this, Back or Escape on the
  // closing screen left without it and the lesson stayed open on the path.
  const completed = useRef(false);
  useEffect(() => {
    if (stage !== 'done' || completed.current) return;
    completed.current = true;
    onComplete();
  }, [stage, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  return (
    /* Orientation: the lesson's name and its place in the unit sit in the
       bar, the rail shows progress within this lesson and names the step, and
       Exit is the same labelled control as in the exam and the challenge.
       Leaving mid-lesson is a pause (the place is kept), so it never asks. */
    <FlowRoom mode={<Content>{unitLabel} · درس {lessonIndex + 1} من {lessonCount}</Content>} title={<Content>{lesson.title}</Content>}
      progress={{ total: stages.length - 1, current: idx }}
      progressLabel={
        <span className="lesson-stage">
          <Content>{STAGE_LABEL[stage]}</Content>
          <span className="sr-only"> · {tf('flow.stepof', { n: Math.min(idx + 1, stages.length - 1), total: stages.length - 1 }, lang)}</span>
        </span>
      }
      onExit={onExit} exitTo={exitLabel ?? t('ex.backtopath', lang)} mainRef={headingRef}>
        <AnimatePresence mode="wait">
          {/* ── CHALLENGE ─────────────────────────────────────────────────
              A real situation, alone, before a single word of explanation.
              The trainee must want the answer before being given one. */}
          {stage === 'challenge' && lesson.pro?.openingChallenge && (
            <m.section key="challenge" {...fade} className="flow-stage">
              <FlowSplit prompt={<>
                <Eyebrow icon={<Icon as={HelpCircle} size="sm" />}>موقف في المكتب</Eyebrow>
                <h1 className="t-h2 flow-question mt-4">{lesson.pro.openingChallenge}</h1>
                {/* The trainee's own question, under the situation that provokes
                    it — one beat, one screen. Splitting them would open the
                    lesson twice with the same emotion. */}
                <p className="t-lead measure mt-4 c-tx2">{lesson.employeeQuestion}</p>
              </>}>
                <Callout tone="objective">{lesson.objective}</Callout>
                <div className="mt-6">
                  <Button onClick={next}>تفتكر تعمل إيه؟ <Icon as={ArrowRight} dir /></Button>
                </div>
              </FlowSplit>
            </m.section>
          )}

          {stage === 'ask' && (
            <m.section key="ask" {...fade} className="flow-stage">
              <FlowSplit prompt={<>
                <Eyebrow icon={<Icon as={HelpCircle} size="sm" />}>سؤال بيقابلك في الشغل</Eyebrow>
                <h1 className="t-h2 flow-question mt-4">{lesson.employeeQuestion}</h1>
              </>}>
                <Callout tone="objective">{lesson.objective}</Callout>
                <div className="mt-6">
                  <Button onClick={next}>قول توقّعك <Icon as={ArrowRight} dir /></Button>
                </div>
              </FlowSplit>
            </m.section>
          )}

          {stage === 'predict' && <PredictStage key="predict" lesson={lesson} onNext={next} back={backButton} />}

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
              <Eyebrow as="h1">{lesson.title}</Eyebrow>

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
              {/* The rules arrive with the stage, together: one at a time made
                  the reader wait for a list they could already read. */}
              <ul role="list" className="list-plain stack gap-3">
                {lesson.points.map((pt, i) => (
                  <li key={i}>
                    {pt.rule ? <RuleObject text={pt.text} /> : <SupportingPoint text={pt.text} />}
                  </li>
                ))}
              </ul>

              {/* ④ Prose, not a card. It must not out-weigh the rule. */}
              <div className="mt-6">
                <Eyebrow icon={<Icon as={Lightbulb} size="sm" />}>مثال من الشغل</Eyebrow>
                <p className="t-body measure mt-3 c-tx2">
                  {lesson.example}
                </p>

                <RuleExamples rules={ruleRefs} />

                <div className="mt-6">
                  <Button onClick={next}>
                    {lesson.practice ? 'جرّب بنفسك' : 'فهمت — اسألني'} <Icon as={ArrowRight} dir />
                  </Button>
                </div>
              </div>
            </m.section>
          )}

          {/* ── REFLECT ───────────────────────────────────────────────────
              The bravest screen here: it gives nothing. One question, no
              answer, no options. The button says «فكّرت» — a small contract
              with yourself, not a navigation label. */}
          {stage === 'reflect' && lesson.pro?.reflectiveQuestion && (
            <m.section key="reflect" {...fade} className="focus-col stack grow justify-center">
              <Eyebrow icon={<Icon as={Lightbulb} size="sm" />}>خد ثانية وفكّر</Eyebrow>
              <h1 className="t-h2 measure mt-4">{lesson.pro.reflectiveQuestion}</h1>
              <div className="mt-7">
                <Button variant="ghost" onClick={next}>فكّرت <Icon as={ArrowRight} dir /></Button>
              </div>
            </m.section>
          )}

          {/* ── OFFICE ────────────────────────────────────────────────────
              One moment from two sides — what happened, and what the member
              felt while it happened. Splitting them would break the scene. */}
          {stage === 'office' && lesson.pro?.officeScenario && (
            <m.section key="office" {...fade} className="focus-col">
              <Eyebrow as="h1" icon={<Icon as={ClipboardCheck} size="sm" />}>في المكتب</Eyebrow>
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
                    <p className="t-body measure mb-0 mt-2">{lesson.pro.customerPerspective}</p>
                  </SpineWell>
                </div>
              )}
              <div className="mt-7">
                <Button onClick={next}>طيب أتصرّف إزاي؟ <Icon as={ArrowRight} dir /></Button>
              </div>
            </m.section>
          )}

          {/* ── COACH ─────────────────────────────────────────────────────
              The emotional peak: the trainer talking in your ear. It closes on
              the golden rule — the one line meant to survive years. */}
          {stage === 'coach' && lesson.pro?.professionalThinking && (
            <m.section key="coach" {...fade} className="focus-col">
              <Eyebrow as="h1" icon={<Icon as={Sparkles} size="sm" />}>إزاي المحترف بيفكّر</Eyebrow>
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
                <Button onClick={next}>التالي <Icon as={ArrowRight} dir /></Button>
              </div>
            </m.section>
          )}

          {/* ── MISTAKES ──────────────────────────────────────────────────
              Contrast, and only after the right model exists to contrast with. */}
          {stage === 'mistakes' && lesson.pro?.commonMistakes?.length && (
            <m.section key="mistakes" {...fade} className="focus-col">
              <Eyebrow as="h1">أخطاء بتتكرر</Eyebrow>
              <ul role="list" className="list-plain stack gap-3 mt-4">
                {lesson.pro.commonMistakes.map((m, i) => (
                  <li key={i} className="t-body measure row gap-3 items-start">
                    <span aria-hidden className="c-risk no-shrink">✕</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Button onClick={next}>التالي <Icon as={ArrowRight} dir /></Button>
              </div>
            </m.section>
          )}

          {stage === 'dialogue' && lesson.dialogue && (
        <m.section {...fade} className="focus-col">
          <Eyebrow>نفس الموقف · نفس القرار</Eyebrow>
          <h1 className="t-h2 mt-3 mb-2">الفرق في التوصيل</h1>
          <p className="t-body c-tx2 mb-5">{lesson.dialogue.setup}</p>

          <DialogueBlock tone="wrong" label="الحوار الغلط" lines={lesson.dialogue.wrong} why={lesson.dialogue.whyWrongFails} whyLabel="ليه بيفشل" />
          <div className="mt-5" />
          <DialogueBlock tone="right" label="الحوار الصح" lines={lesson.dialogue.right} why={lesson.dialogue.whyRightWorks} whyLabel="ليه بينجح" />

          <p className="t-sm c-tx3 mt-5">
            الحوارات دي أمثلة مش جمل تتحفظ — اللي بينتقل معاك هو المبدأ.
          </p>
          <div className="mt-5">
            <Button onClick={next}>التالي <Icon as={ArrowRight} dir /></Button>
          </div>
        </m.section>
      )}

      {stage === 'comms' && lesson.comms && (
        <m.section {...fade} className="focus-col">
          <Eyebrow>{lesson.comms.audience === 'sales' ? 'التوصيل الداخلي · للمبيعات' : 'التوصيل · للعضو'}</Eyebrow>
          <h1 className="t-h2 mt-3 mb-5">
            {lesson.comms.audience === 'sales'
              ? 'الفخ والأفضل — في الطلب الداخلي'
              : 'الفخ والأفضل — قدّام العضو'}
          </h1>
          <div className="stack gap-4">
            {/* EYE PATH: the trap · its cost · the way out.
                ① and ③ are objects — they are things that happen and things you
                   do, and the trainee already knows a spine means «stop here».
                ② is PROSE. It used to be a third identical card, which made the
                   consequence read as an equal option rather than the reason the
                   trap matters at all. */}
            <SpineWell spine="risk" label="الفخ">
              <p className="t-body measure m-0">{lesson.comms.risk}</p>
            </SpineWell>

            <div className="px-2">
              <div className="t-label c-tx3 mb-2">بيحصل إيه لما تقع فيه</div>
              <p className="t-body measure m-0 c-tx2">{lesson.comms.why}</p>
            </div>

            <SpineWell label="الأفضل">
              <p className="t-body measure m-0 c-tx0 fw-500">{lesson.comms.instead}</p>
            </SpineWell>
          </div>
          <div className="mt-6">
            <Button onClick={next}>التالي <Icon as={ArrowRight} dir /></Button>
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
            <m.section key="commit" {...fade} className="flow-stage">
              <FlowSplit prompt={<>
                <Eyebrow>هتركّز على إيه بكرة؟</Eyebrow>
                <h1 className="t-h2 flow-question mt-3">اختار حاجة واحدة بس.</h1>
              </>}>
              <div className="stack gap-3">
                {lesson.pro.commitmentOptions.map(o => (
                  <OptionButton key={o} text={o}
                    state={commitment === o ? 'correct' : commitment ? 'dim' : 'idle'}
                    onPick={() => setCommitment(o)} />
                ))}
              </div>
              <div className="row gap-2 mt-6 items-center">
                {backButton}
                <div className="grow" />
                <Button disabled={!commitment} onClick={() => { if (commitment) onCommit?.(commitment); next(); }}>ده اللي هركّز عليه <Icon as={ArrowRight} dir /></Button>
              </div>
              </FlowSplit>
            </m.section>
          )}

          {stage === 'done' && (
            <m.section key="done" {...achieve} className="flow-stage">
              {/* THE HERO — capability, never completion. «You finished» rewards
                  attendance; «tomorrow you can» rewards becoming. On a wide room
                  the hero holds one side and what to do with it the other; the
                  mark is the smallest of the earned moments — a lesson is a
                  step, not the unit. */}
              <FlowSplit prompt={
                <div className="done-hero">
                  <Achievement tier="task" />
                  <Eyebrow icon={<Icon as={Sparkles} size="sm" />}>بكرة في الفرع</Eyebrow>
                  <h1 className="t-h2 flow-question">{lesson.pro?.tomorrowInBranch ?? lesson.canNow}</h1>
                  {/* The golden rule, second and last time — spaced repetition
                      inside one lesson is how a line survives a year. */}
                  {lesson.pro?.goldenRule && <p className="golden-rule golden-rule--start">{lesson.pro.goldenRule}</p>}
                </div>
              }>
                <div className="done-notes">
                  {/* Everything practical is a quiet block: present, findable,
                      and never competing with the hero beside it. */}
                  {lesson.pro && (
                    <>
                      {commitment && <DoneRow label="التزامك بكرة" body={commitment} />}
                      {lesson.pro.dailyHabit && <DoneRow label="عادة النهارده · أقل من دقيقة" body={lesson.pro.dailyHabit} />}
                      {lesson.pro.officeTask && <DoneRow label="مهمتك مع مدربك" body={lesson.pro.officeTask} />}
                      {lesson.pro.trainerQuestions?.length ? (
                        <div>
                          <span className="t-label c-tx3">اسأل مدربك — ما تخمّنش</span>
                          <ul role="list" className="list-plain stack gap-2 mt-2">
                            {lesson.pro.trainerQuestions.map((q, i) => (
                              <li key={i} className="t-sm c-tx1">• {q}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {lesson.pro.readinessCheck && (
                        <SpineWell>
                          <span className="t-label c-tx3">
                            {/* «جاهز» belongs to certification alone; this says how ready the
                                lesson is to use tomorrow (docs/voice-and-language.md). */}
                            {lesson.pro.readinessCheck.level === 'YES' ? 'تقدر تطبّقها بكرة' : lesson.pro.readinessCheck.level === 'NO' ? 'لسه محتاج تتمرّن عليها' : 'قرّبت تطبّقها'}
                          </span>
                          <p className="t-body measure mb-0 mt-2">{lesson.pro.readinessCheck.why}</p>
                        </SpineWell>
                      )}
                      {lesson.pro.closingReflection && (
                        <p className="t-sm measure c-tx2 m-0">{lesson.pro.closingReflection}</p>
                      )}
                    </>
                  )}

                  {/* skills this lesson moved */}
                  <div className="row gap-2 wrap">
                    {lessonSkillTouches(moduleId, lesson.id).map(sk => (
                      <Capsule key={sk.name}>{sk.name} · {LEVEL_LABEL[sk.level]}</Capsule>
                    ))}
                  </div>

                  <div className="done-actions">
                    {nextStep && (
                      <Button onClick={nextStep.go}>
                        {nextStep.label} <Icon as={ArrowRight} dir />
                      </Button>
                    )}
                    <Button variant={nextStep ? 'ghost' : 'primary'} onClick={onFinish ?? onExit}>{t('flow.done', lang)}</Button>
                  </div>
                </div>
              </FlowSplit>
            </m.section>
          )}
        </AnimatePresence>
        {backButton && !splitStage && <div className="focus-col lesson-steps">{backButton}</div>}
    </FlowRoom>
  );
};
