/**
 * Today's retrieval — two questions, inside the day, before the new lesson.
 *
 * WHY IT IS A COMPONENT AND NOT A SCREEN:
 * A "revision centre" is a system the trainee visits. This must be something the
 * platform does FOR them — it hands back the two things they are about to
 * forget, on the way to today's work, and gets out of the way. The moment it
 * has its own route it becomes a chore with a door, and chores with doors get
 * skipped. It lives in the one home, at the top of the day, before the lesson.
 *
 * FEEDBACK RULE: no «صح!» and no «غلط!». Both make the moment about the score.
 * The trainee sees «راجع السبب» and the reason — because the reason is the only
 * part that transfers, and a verdict adds nothing to it.
 *
 * No streak, no XP, no count of questions answered. A pilot gets no points for
 * the pre-flight checklist.
 */
import React, { useMemo, useState } from 'react';
import { m } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { dailySet, shuffleOrder, attemptCount, type RetrievalEvent } from '../../domain/retrieval';
import { RETRIEVAL_BANK, retrievalQuestion } from '../../content/registry';
import { trainingStore, currentTraineeId, traineeIdOrNull } from '../../app/training/trainingStore';
import { Card, OptionButton, FeedbackBlock } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { useLang, t } from '../../app/i18n';

/**
 * Is anything due right now?
 *
 * The parent needs this to decide whether to draw the «مهمة النهارده» heading
 * at all. It calls the same `dailySet` the component does — one computation,
 * not a parallel guess that can disagree with what actually renders.
 */
export function dueToday(input: { passedModuleIds: readonly string[]; completedLessonIds: readonly string[] }): boolean {
  return dailySet({
    bank: RETRIEVAL_BANK,
    passedModuleIds: input.passedModuleIds,
    completedLessonIds: input.completedLessonIds,
    events: retrievalEvents(),
    now: Date.now(),
  }).length > 0;
}

/** This trainee's retrieval history, in the shape the domain expects. */
function retrievalEvents(): RetrievalEvent[] {
  return trainingStore.events()
    .filter((e): e is Extract<typeof e, { type: 'RETRIEVAL_ANSWERED' }> => e.type === 'RETRIEVAL_ANSWERED')
    .filter(e => e.employeeId === traineeIdOrNull())
    .map(e => ({ itemId: e.itemId, moduleId: e.moduleId, correct: e.correct, at: e.at }));
}

export const TodayRetrieval: React.FC<{
  passedModuleIds: readonly string[];
  /** Lesson questions open as soon as their lesson is done — that is what lets
   *  retrieval exist on day 4 instead of day 23. */
  completedLessonIds: readonly string[];
}> = ({ passedModuleIds, completedLessonIds }) => {
  const lang = useLang();
  const events = useMemo<RetrievalEvent[]>(retrievalEvents, []);

  // Frozen at mount: the set must not reshuffle as answers land.
  const [set] = useState(() => dailySet({ bank: RETRIEVAL_BANK, passedModuleIds, completedLessonIds, events, now: Date.now() }));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  // Nothing due is the normal, healthy case — and it stays silent. An empty
  // "you have no reviews!" card is noise dressed as feedback.
  if (set.length === 0 || idx >= set.length) return null;

  const found = retrievalQuestion(set[idx]!.id);
  if (!found) return null;
  const { question, module } = found;

  const attempt = attemptCount(events, set[idx]!.id) + 1;
  const order = shuffleOrder(set[idx]!.id, attempt, question.options.length);
  const answered = picked !== null;

  const pick = (originalIndex: number) => {
    if (answered) return;
    setPicked(originalIndex);
    trainingStore.answerRetrieval(
      currentTraineeId(), set[idx]!.id, module.id,
      question.options[originalIndex]?.correct ?? false,
    );
  };

  return (
    // Same Card as everything else in today's work. It used to hand-roll its
    // own background, border, radius and padding — which is precisely how a
    // card ends up feeling like it came from a different application.
    <m.div {...fade}>
     <Card tone="raised" pad={5}>
      <div className="t-label" style={{ marginBottom: 'var(--sp-2)', color: 'var(--tx3)' }}>
        فكّرني · {idx + 1} من {set.length}
      </div>
      {/* The unit is named, but the SET is mixed on purpose — working out which
          rule applies is the skill; at the counter nobody announces it. */}
      <div className="t-label" style={{ marginBottom: 'var(--sp-3)', color: 'var(--tx3)' }}>{module.title}</div>
      <p className="t-body" style={{ margin: '0 0 var(--sp-4)' }}>{question.prompt}</p>

      {/* 🔴 ONE ANSWER CONTROL IN THE PRODUCT, NOT TWO. This screen hand-rolled
          its own option button — its own padding, radius, border, disabled
          state and focus behaviour — while the lesson, the unit exam and the
          boss battle all shared `OptionButton`. Four screens ask the trainee to
          choose an answer; three of them looked and behaved identically and the
          fourth quietly did not. Retrieval's own rule is kept intact through
          the component's states: the correct option is marked, every other one
          dims, and the trainee's wrong pick is never painted red — the reason
          is the lesson, not the verdict. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {order.map(oi => {
          const o = question.options[oi]!;
          return (
            <OptionButton key={oi} text={o.text} onPick={() => pick(oi)}
              state={!answered ? 'idle' : o.correct ? 'correct' : 'dim'} />
          );
        })}
      </div>

      {answered && (
        <m.div {...fade} style={{ marginTop: 'var(--sp-4)' }}>
          {/* The same explanation block the lesson and the exam use — which also
              brings aria-live and the focus move to the continue button that
              this hand-rolled version never had. */}
          <FeedbackBlock tone="summary" title="راجع السبب"
            onAction={() => { setIdx(i => i + 1); setPicked(null); }}
            actionLabel={idx + 1 >= set.length ? t('rt.donetoday', lang) : <>{t('rt.next', lang)} <ArrowRight size={16} className="icon-dir" /></>}>
            {question.explanation}
          </FeedbackBlock>
        </m.div>
      )}
     </Card>
    </m.div>
  );
};
