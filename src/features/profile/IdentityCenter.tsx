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
import { useProgress, learningProgress, moduleLessonsDone, isModuleUnlocked } from '../../app/progress';
import { useTraining, trainingStore, traineeIdOrNull, reviewOf } from '../../app/training/trainingStore';
import { readinessFromOwnEvents } from '../../app/analytics/dashboardStore';
import { currentPhase, dayPosition, PROGRAM, type PhaseContext } from '../../domain/journey/program';
import { nextAction } from '../../domain/journey/nextAction';
import type { OrgEvent } from '../../domain/analytics/organization';
import { ScreenHeader, Card, Eyebrow, StatusBadge, EmptyState, ArabicContent } from '../../ui/primitives';
import { useLang, t as tr } from '../../app/i18n';
import { fade } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';
import { branchNameOf } from '../../domain/organization';
import { useOrganization } from '../../app/organization/orgStore';
import { MODULES } from '../../content/registry';

export const IdentityCenter: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { users } = useIdentity();
  const org = useOrganization();
  const p = useProgress();
  const t = useTraining();
  const me = identityStore.currentUser();
  const traineeId = me?.id ?? '';

  const ctx: PhaseContext = useMemo(() => ({
    isModuleApproved: id => reviewOf(t, (traineeIdOrNull() ?? ''), id).status === 'ready',
    isModuleWaiting: id => reviewOf(t, (traineeIdOrNull() ?? ''), id).status === 'waiting',
    isModuleStarted: id => moduleLessonsDone(p, id) > 0,
    isModuleUnlocked: id => isModuleUnlocked(p, id),
  }), [t, p]);

  const phase = currentPhase(ctx);
  const lang = useLang();
  const { day, remaining } = dayPosition(ctx);
  const learnPct = Math.round(learningProgress(p) * 100);

  const readiness = useMemo(() => {
    const own = (trainingStore.events() as readonly OrgEvent[]).filter(e => e.employeeId === traineeId);
    return readinessFromOwnEvents(traineeId, own);
  }, [traineeId]);

  // Next step — derived from the SAME nextAction the home screen resolves, so
  // the profile can never disagree with the path about what comes next.
  const next = useMemo(() => nextAction(p, t, traineeId), [p, t, traineeId]);
  const nextLine = ((): string | null => {
    switch (next.kind) {
      case 'resume_lesson': return next.module ? `${tr('pf.resume', lang)} «${next.module.title}»` : null;
      case 'take_exam': return next.module ? `${tr('pf.exam', lang)} «${next.module.title}»` : null;
      case 'waiting_review': return tr('pf.underreview', lang);
      case 'needs_submission': return next.module ? `${tr('pf.submit', lang)} «${next.module.title}»` : null;
      case 'rejected_review': return next.module ? `${tr('pf.improve', lang)} «${next.module.title}»` : null;
      case 'all_done': return tr('pf.alldone', lang);
      default: return null;
    }
  })();

  const trainer = me?.trainerId ? users.find(u => u.id === me.trainerId) : undefined;

  const initials = (me?.name ?? '؟').split(' ').slice(0, 2).map(s => s[0]).join('');

  return (
    <div style={{ minHeight: '100vh' }}>
      <ScreenHeader onBack={onClose} maxWidth={WIDTH.read} leading={<Eyebrow>{tr('pf.title', lang)}</Eyebrow>} />

      {/* Enters with the same fade as every other screen — this was the
          only one that appeared instantly, which read as a different product
          for the half-second it took to notice. Consistency, not decoration:
          the shared `fade` already respects prefers-reduced-motion. */}
      <m.main {...fade} style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: '0 var(--sp-5) var(--sp-9)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>

        {/* ── 1 · Hero Identity — who am I ── */}
        <Card tone="accent" pad={6}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
            <span aria-hidden style={{
              width: 76, height: 76, borderRadius: 'var(--r-full)', flexShrink: 0,
              background: 'var(--s0)', border: '2px solid var(--g3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--g1)',
            }}>
              <span className="t-h3" style={{ margin: 0 }}>{initials}</span>
            </span>
            <div style={{ flex: 1, minWidth: '16ch' }}>
              <h1 className="t-h2" style={{ margin: 0 }}>{me?.name ?? '—'}</h1>
              <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', marginTop: 'var(--sp-2)' }}>
                <span className="t-sm" style={{ color: 'var(--tx2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
                  <User2 size={13} aria-hidden /> {me?.id ?? '—'}
                </span>
                {me?.branchId && (
                  <span className="t-sm" style={{ color: 'var(--tx2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
                    <MapPin size={13} aria-hidden /> {branchNameOf(me.branchId, org.branches)}
                  </span>
                )}
              </div>
              {phase && (
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <StatusBadge tone="info"><ArabicContent as="span">{phase.title}</ArabicContent></StatusBadge>
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
        <section aria-label="حالتك دلوقتي" className="pf-state">
          <Eyebrow icon={<GraduationCap size={13} />}>{tr('pf.status', lang)}</Eyebrow>
          <div className="pf-state-row">
            <span className="pf-phase t-num" aria-hidden>{phase ? phase.order : '—'}</span>
            <div className="pf-state-body">
              <h2 className="pf-state-title">
                {phase ? <ArabicContent as="span">{phase.title}</ArabicContent> : tr('pf.programdone', lang)}
              </h2>
              <p className="pf-state-sub">
                المرحلة {phase ? phase.order : PROGRAM.length} من {PROGRAM.length}
                <span className="pf-dot" aria-hidden>·</span>
                اليوم {day} من 60
                <span className="pf-dot" aria-hidden>·</span>
                فاضل {remaining} يوم
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
        <section aria-label="الدليل">
          <div className="pf-stats">
            {/* 🔴 TWO OF THESE FOUR WERE THE SAME FACT. «المعتمد 0%» and «وحدات
                معتمدة 0» are one number in two units, printed side by side, so
                a trainee reads four measures and can only act on three — and
                the percentage was the weaker of the pair: it hid the
                denominator, which is the part that answers «قد إيه فاضل؟».
                Three cards now, and the approval one carries x/y. */}
            <StatCard label={tr('db.completion', lang)} value={`${learnPct}%`} sub={tr('pf.lessonsdone', lang)} />
            <StatCard label={tr('pf.unitsapp', lang)} value={`${readiness.approvedModules}/${MODULES.length}`} sub={tr('pf.fromtrainer', lang)} />
            <StatCard label={tr('db.readiness', lang)} value={readiness.readinessIndex > 0 ? `${readiness.readinessIndex}%` : '—'} sub={readiness.readinessIndex > 0 ? tr('pf.lastassess', lang) : tr('pf.noassess', lang)} />
          </div>
        </section>

        <section aria-label="المدرب">
          <Eyebrow icon={<BadgeCheck size={13} />}>{tr('pf.assigned', lang)}</Eyebrow>
          <div style={{ marginTop: 'var(--sp-3)' }}>
            {trainer ? (
              <Card tone="quiet" pad={5}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <span aria-hidden style={{
                    width: 44, height: 44, borderRadius: 'var(--r-full)', flexShrink: 0,
                    background: 'var(--s0)', border: '1px solid var(--line-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx2)',
                  }}>
                    <User2 size={22} />
                  </span>
                  <div>
                    <div className="t-sm" style={{ color: 'var(--tx0)' }}>{trainer.name}</div>
                    <div className="t-label" style={{ color: 'var(--tx3)' }}>{tr('pf.assigned', lang)}</div>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState icon={<Clock size={22} />} title="لسه مفيش مdرب معيّن"
                body="أول ما الإدارة تعيّنلك مدرب، هيظهر هنا مع حالة متابعتك." />
            )}
          </div>
        </section>

        {/* ── 6 · Personal Information ── */}
        <section aria-label="البيانات الشخصية">
          <Eyebrow icon={<User2 size={13} />}>{tr('pf.personal', lang)}</Eyebrow>
          <div style={{ marginTop: 'var(--sp-3)' }}>
          <Card tone="quiet" pad={5}>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--sp-2) var(--sp-5)' }}>
              <dt className="t-label" style={{ color: 'var(--tx3)' }}>{tr('pf.name', lang)}</dt>
              <dd className="t-sm" style={{ margin: 0, color: 'var(--tx1)' }}>{me?.name ?? '—'}</dd>
              <dt className="t-label" style={{ color: 'var(--tx3)' }}>{tr('pf.staffno', lang)}</dt>
              <dd className="t-sm" style={{ margin: 0, color: 'var(--tx1)' }}>{me?.id ?? '—'}</dd>
              <dt className="t-label" style={{ color: 'var(--tx3)' }}>{tr('pf.branch', lang)}</dt>
              <dd className="t-sm" style={{ margin: 0, color: 'var(--tx1)' }}>{branchNameOf(me?.branchId, org.branches)}</dd>
            </dl>
          </Card>
          </div>
        </section>

        {/* ── 7 · Certificates — honest empty state, never a faked cert ── */}
        <section aria-label="الشهادات">
          <Eyebrow icon={<Award size={13} />}>{tr('pf.certs', lang)}</Eyebrow>
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <EmptyState icon={<Award size={22} />} title="لسه مفيش شهادة"
              body="الشهادة بتصدر بعد ما تكمّل البرنامج ويعتمد المدير جاهزيتك." />
          </div>
        </section>
      </m.main>
    </div>
  );
};

/** A single fact, stated plainly. Reused across the journey and performance
 *  sections — same shape, so the eye reads them as one family. */
const StatCard: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <Card tone="quiet" pad={5}>
    <div className="t-label" style={{ color: 'var(--tx3)' }}>{label}</div>
    <div className="t-h3 t-num" style={{ margin: 'var(--sp-1) 0' }}>{value}</div>
    <div className="t-label" style={{ color: 'var(--tx3)' }}>{sub}</div>
  </Card>
);
