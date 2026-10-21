/**
 * «مراجعاتي» — where a trainee's daily reviews come back with the trainer's
 * comments. The debrief promised «المدرب هيشوفها ويعلّق»; this is the place
 * that promise is kept and can be checked: every review filed, newest first,
 * and what the trainer said about it, or that a comment is still coming.
 *
 * Opening it marks the comments as seen, so the bell's «تعليق جديد» clears.
 * Structured training feedback, not chat: the trainee reads, the trainer
 * comments, nobody replies to a reply.
 */
import React, { useEffect } from 'react';
import { MessageSquareText, PenLine } from 'lucide-react';
import { useTrainingEvents, traineeIdOrNull } from '../../app/training/trainingStore';
import { useIdentity } from '../../app/identity/identityStore';
import { filedReviews, REVIEW_FIELDS, REVIEW_LABELS } from '../../domain/review';
import { reviewSeen } from '../../app/reviewSeen';
import { tone, UNIT_REVIEW } from '../../ui/statusSemantics';
import { PageHeader, Status, Button, EmptyState, ArabicContent, ContentLanguageNote } from '../../ui/primitives';
import { useLang, t, tf, type Lang } from '../../app/i18n';
import { displayNameOf } from '../../domain/identity';
import { WIDTH } from '../../ui/designSystem';
import { toHash } from '../../app/router';

const dateOf = (at: number, lang: Lang) =>
  new Date(at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export const MyReviews: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const events = useTrainingEvents();
  const { users } = useIdentity();
  const lang = useLang();
  const id = traineeIdOrNull() ?? '';
  const reviews = filedReviews(events, id);
  const nameOf = (uid: string) => { const u = users.find(x => x.id === uid); return u ? displayNameOf(u, lang) : t('mr.trainer', lang); };

  // Reading this screen is reading the comments.
  useEffect(() => { reviewSeen.mark(id); }, [id, reviews.length]);

  return (
    <main style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
      <PageHeader crumbs={[<a key="a" href="#/" className="crumb-link">{t('crumb.academy', lang)}</a>, t('menu.reviews', lang)]}
        title={t('menu.reviews', lang)}
        lead={t('mr.lead', lang)}
        actions={<Button onClick={() => { location.hash = toHash({ kind: 'review' }); }}><PenLine size={16} aria-hidden /> {t('mr.new', lang)}</Button>} />
      <ContentLanguageNote />
      {reviews.length === 0 ? (
        <EmptyState icon={<MessageSquareText />} title={t('mr.empty', lang)}
          body={t('mr.emptybody', lang)}
          action={<Button variant="ghost" onClick={onExit}>{t('mr.back', lang)}</Button>} />
      ) : (
        <div className="stack gap-5 region">
          {reviews.map(r => (
            <article key={r.at} className="tp-review" aria-labelledby={`rv-${r.at}`}>
              <h2 id={`rv-${r.at}`} className="t-title m-0 row items-center gap-2 wrap">
                {dateOf(r.at, lang)}
                {r.comments.length === 0
                  ? <Status tone={tone(UNIT_REVIEW.waiting)}>{t('mr.waiting', lang)}</Status>
                  : <Status tone={tone(UNIT_REVIEW.ready)}>{t('mr.commented', lang)}</Status>}
              </h2>
              <dl className="tp-chain">
                {REVIEW_FIELDS.map(f => (
                  <React.Fragment key={f}>
                    <dt className="t-label c-tx3"><ArabicContent as="span">{REVIEW_LABELS[f]}</ArabicContent></dt>
                    <dd className="m-0 t-sm c-tx1"><ArabicContent as="span">{r[f]}</ArabicContent></dd>
                  </React.Fragment>
                ))}
              </dl>
              {r.comments.map(c => (
                <p key={c.at} className="tp-comment t-sm m-0">
                  <span className="t-label c-tx3">{tf('mr.commentby', { name: nameOf(c.trainerId), date: dateOf(c.at, lang) }, lang)}</span><br />
                  <ArabicContent as="span">{c.comment}</ArabicContent>
                </p>
              ))}
            </article>
          ))}
        </div>
      )}
    </main>
  );
};
