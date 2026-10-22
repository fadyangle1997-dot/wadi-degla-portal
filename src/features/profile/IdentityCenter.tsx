/**
 * ProfileView — the trainee's Identity Center. It answers one question:
 * «مين أنا جوّه الأكاديمية؟» — where am I, what have I achieved, what's next.
 *
 * PRESENTATION ONLY. Every value here is read from an existing hook or engine
 * — useIdentity, useProgress, useTraining, and the same pure functions the
 * roadmap already reads (currentPhase, dayPosition, approvalProgress,
 * readinessFromOwnEvents, nextAction). Nothing is calculated here, nothing is
 * stored, no new authorization. Where the platform has no data yet (e.g. no
 * certification), an honest empty state stands in — never a faked value.
 *
 * Optimised for trust, not decoration: every section states a fact the trainee
 * needs, in the design system's own tokens. No element exists just to look good.
 */
import React, { useMemo } from 'react';
import { m } from 'motion/react';
import { User2, MapPin, BadgeCheck, GraduationCap, Award, Clock } from 'lucide-react';
import { useIdentity, identityStore } from '../../app/identity/identityStore';
import { useProgress, learningProgress } from '../../app/progress';
import { useTraining, trainingStore, traineeIdOrNull } from '../../app/training/trainingStore';
import { useTodaysMission } from '../../app/journeyContext';
import { progression } from '../../domain/journey/progression';
import { readinessReport } from '../../domain/readiness/report';
import { formalLabel, performanceText } from '../readiness/labels';
import { PROGRAM } from '../../domain/journey/program';
import type { OrgEvent } from '../../domain/analytics/organization';
import { Icon } from '../../ui/Icon';
import { ScreenHeader, Card, Eyebrow, StatusBadge, EmptyState, ArabicContent, CloseButton, tx } from '../../ui/primitives';
import { useLang, t as tr, tf, dateLocale } from '../../app/i18n';
import { displayNameOf } from '../../domain/identity';
import { fade } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';
import { branchNameOf } from '../../domain/organization';
import { useOrganization } from '../../app/organization/orgStore';
import { dayCount } from '../../app/plural';

export const IdentityCenter: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { users } = useIdentity();
  const org = useOrganization();
  const p = useProgress();
  const t = useTraining();
  const me = identityStore.currentUser();
  const traineeId = me?.id ?? '';

  // The same position the home screen and the roadmap read.
  const { phase, day, remaining } = useMemo(() => progression(p, t, traineeIdOrNull() ?? ''), [t, p]);
  const lang = useLang();
  const learnPct = Math.round(learningProgress(p) * 100);

  // Three concepts, three figures: units approved (programme progress), the
  // trainer's practical evaluations, and the readiness assessment's status.
  const { performance, formal, programme } = useMemo(
    () => readinessReport(t, trainingStore.events() as readonly OrgEvent[], traineeId),
    [t, traineeId]);

  // Next step — today's mission, from the SAME resolver the home screen and
  // the roadmap read, so the profile can never give a third answer.
  const next = useTodaysMission().primary;
  // The module title is Arabic content, so it is declared as such inside the
  // translated sentence.
  const withTitle = (key: 'pf.resume' | 'pf.exam' | 'pf.submit' | 'pf.improve') =>
    next.module ? tx(key, { m: <ArabicContent as="span">{next.module.title}</ArabicContent> }, lang) : null;
  const nextLine = ((): React.ReactNode => {
    switch (next.kind) {
      case 'resume_lesson': return withTitle('pf.resume');
      case 'take_exam': return withTitle('pf.exam');
      case 'waiting_review': return tr('pf.underreview', lang);
      case 'needs_submission': return withTitle('pf.submit');
      case 'rejected_review': return withTitle('pf.improve');
      case 'all_done': return tr('pf.alldone', lang);
      case 'readiness': return tr('jr.readytitle', lang);
      case 'decision_review': return tr('jr.reviewtitle', lang);
      default: return null;
    }
  })();

  const trainer = me?.trainerId ? users.find(u => u.id === me.trainerId) : undefined;
  const certifier = formal.managerDecision?.managerId ? users.find(u => u.id === formal.managerDecision!.managerId) : undefined;
  const certifiedOn = formal.managerDecision
    ? new Date(formal.managerDecision.at).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const certifiedLine = certifier
    ? tf('mi.certifiedby', { name: displayNameOf(certifier, lang), date: certifiedOn }, lang)
    : tf('mi.certifiedon', { date: certifiedOn }, lang);

  const initials = (me?.name ?? '؟').split(' ').slice(0, 2).map(s => s[0]).join('');

  return (
    <div className="min-h-screen">
      {/* An overlay closes; it does not go «back to the path». */}
      <ScreenHeader maxWidth={WIDTH.read} leading={<Eyebrow>{tr('pf.title', lang)}</Eyebrow>}
        trailing={<CloseButton onClick={onClose} />} />

      {/* Enters with the same fade as every other screen — this was the
          only one that appeared instantly, which read as a different product
          for the half-second it took to notice. Consistency, not decoration:
          the shared `fade` already respects prefers-reduced-motion. */}
      <m.main {...fade} className="stack gap-6" style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: '0 var(--sp-5) var(--sp-9)' }}>

        {/* ── 1 · Hero Identity — who am I ── */}
        <Card tone="accent" pad={6}>
          <div className="row items-center gap-5 wrap">
            <span aria-hidden className="avatar avatar--hero row no-shrink items-center justify-center">
              <span className="t-h3 m-0">{initials}</span>
            </span>
            <div className="grow" style={{ minWidth: '16ch' }}>
              <h1 className="t-h2 m-0">{me?.name ?? '—'}</h1>
              <div className="row gap-4 wrap mt-2">
                <span className="t-sm c-tx2 items-center gap-1" style={{ display: 'inline-flex' }}>
                  <User2 size={13} aria-hidden /> {me?.id ?? '—'}
                </span>
                {me?.branchId && (
                  <span className="t-sm c-tx2 items-center gap-1" style={{ display: 'inline-flex' }}>
                    <MapPin size={13} aria-hidden /> {branchNameOf(me.branchId, org.branches)}
                  </span>
                )}
              </div>
              {phase && (
                <div className="mt-3">
                  <StatusBadge tone="neutral"><ArabicContent as="span">{phase.title}</ArabicContent></StatusBadge>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── 2 · CURRENT STATE — the one thing this page exists to answer.
              Editorial, not a card: an oversized phase numeral carries the
              "where am I", the day line supports it, and the next step sits
              beneath as the only forward-looking sentence. Previously this
              screen opened with EIGHT equally-weighted stat cards, which gave
              the eye no entry point — the trainee had to read all eight to
              learn their own state. One hero, then quiet evidence. ── */}
        <section aria-label={tr('pf.status', lang)} className="pf-state">
          <Eyebrow icon={<GraduationCap size={13} />}>{tr('pf.status', lang)}</Eyebrow>
          <div className="pf-state-row">
            <span className="pf-phase t-num" aria-hidden>{phase ? phase.order : '—'}</span>
            <div className="pf-state-body">
              <h2 className="pf-state-title">
                {phase ? <ArabicContent as="span">{phase.title}</ArabicContent> : tr('pf.programdone', lang)}
              </h2>
              <p className="pf-state-sub">
                {tf('pf.phaseof', { a: phase ? phase.order : PROGRAM.length, b: PROGRAM.length }, lang)}
                <span className="pf-dot" aria-hidden>·</span>
                {tf('pf.dayof', { d: day }, lang)}
                <span className="pf-dot" aria-hidden>·</span>
                {tf('pf.daysleft', { days: dayCount(remaining, lang) }, lang)}
              </p>
            </div>
          </div>
          {nextLine && (
            <p className="pf-next">
              <span className="pf-next-lbl">{tr('db.nextstep', lang)}</span>
              {nextLine}
            </p>
          )}
        </section>

        {/* ── 3 · EVIDENCE — four numbers that support the state above, never
              compete with it. Dropped from eight: «المرحلة» and «وحدات معتمدة»
              were duplicates of the hero and of «المعتمد»; «الثقة» is a
              trainer-facing confidence-in-the-evidence measure, not something
              a trainee acts on; «الشهادة» rendered a hardcoded '—' with no
              backing data at all, so it was a fake affordance and is gone. ── */}
        <section aria-label={tr('pf.evidence', lang)}>
          <div className="pf-stats">
            {/* Three measures, not four: approval shows x/y, so the denominator
                answers «how much is left?». */}
            <StatCard label={tr('db.completion', lang)} value={`${learnPct}%`} sub={tr('pf.lessonsdone', lang)} />
            <StatCard label={tr('pf.unitsapp', lang)} value={`${programme.approved}/${programme.total}`} sub={tr('pf.fromtrainer', lang)} />
            <StatCard label={tr('perf.title', lang)} value={performanceText(performance)} sub={performance.score !== null ? tr('perf.latest', lang) : tr('perf.none', lang)} />
            <StatCard words label={tr('fr.title', lang)} value={formalLabel(formal, lang)} sub={formal.status === 'not_open' ? tf('fr.not_open.body', { a: programme.approved, b: programme.total }, lang) : ''} />
          </div>
        </section>

        <section aria-label={tr('pf.trainer', lang)}>
          <Eyebrow icon={<BadgeCheck size={13} />}>{tr('pf.assigned', lang)}</Eyebrow>
          <div className="mt-3">
            {trainer ? (
              <Card tone="quiet" pad={5}>
                <div className="row items-center gap-3">
                  <span aria-hidden className="avatar row no-shrink items-center justify-center c-tx2">
                    <User2 size={22} />
                  </span>
                  <div>
                    <div className="t-sm c-tx0">{trainer.name}</div>
                    <div className="t-label c-tx3">{tr('pf.assigned', lang)}</div>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState icon={<Clock size={22} />} title={tr('pf.notrainer', lang)}
                body={tr('pf.notrainerbody', lang)} />
            )}
          </div>
        </section>

        {/* ── 6 · Personal Information ── */}
        <section aria-label={tr('pf.personal', lang)}>
          <Eyebrow icon={<User2 size={13} />}>{tr('pf.personal', lang)}</Eyebrow>
          <div className="mt-3">
          <Card tone="quiet" pad={5}>
            <dl className="m-0" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--sp-2) var(--sp-5)' }}>
              <dt className="t-label c-tx3">{tr('pf.name', lang)}</dt>
              <dd className="t-sm m-0 c-tx1">{me?.name ?? '—'}</dd>
              <dt className="t-label c-tx3">{tr('pf.staffno', lang)}</dt>
              <dd className="t-sm m-0 c-tx1">{me?.id ?? '—'}</dd>
              <dt className="t-label c-tx3">{tr('pf.branch', lang)}</dt>
              <dd className="t-sm m-0 c-tx1">{branchNameOf(me?.branchId, org.branches)}</dd>
            </dl>
          </Card>
          </div>
        </section>

        {/* ── 7 · Certification — the manager's decision as the record holds it.
            The platform issues no certificate document (docs/redesign.md,
            deferred), so it never promises one: certified says who and when;
            before that, what certification takes. ── */}
        <section aria-label={tr('pf.certs', lang)}>
          <Eyebrow icon={<Award size={13} />}>{tr('pf.certs', lang)}</Eyebrow>
          <div className="mt-3">
            {formal.certified && formal.managerDecision ? (
              <Card pad={5}>
                <div className="row items-center gap-3">
                  <Icon as={Award} size="lg" className="c-ready no-shrink" />
                  <div>
                    <p className="t-title m-0">{tr('pf.certified', lang)}</p>
                    <p className="t-sm c-tx2 m-0">{certifiedLine}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState icon={<Award size={22} />} title={tr('pf.nocert', lang)}
                body={tr('pf.nocertbody', lang)} />
            )}
          </div>
        </section>
      </m.main>
    </div>
  );
};

/** A single fact, stated plainly. Reused across the journey and performance
 *  sections — same shape, so the eye reads them as one family. */
const StatCard: React.FC<{ label: string; value: string; sub: string; words?: boolean }> = ({ label, value, sub, words }) => (
  <Card tone="quiet" pad={5}>
    <div className="t-label c-tx3">{label}</div>
    {/* A status in words is prose, not a figure: no numeric isolation. */}
    <div className={words ? 't-title' : 't-h3 t-num'} style={{ margin: 'var(--sp-1) 0' }}>{value}</div>
    <div className="t-label c-tx3">{sub}</div>
  </Card>
);
