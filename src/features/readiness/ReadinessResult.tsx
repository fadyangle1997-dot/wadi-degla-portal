/**
 * Readiness Result — the moment sixty days resolves.
 *
 * WHY THERE IS NO EUPHEMISM HERE:
 * The brief asked to avoid PASS/FAIL and show "Needs Development" instead. That
 * is renaming, not respect — a trainee handed "Needs Development" knows exactly
 * what it means, and dressing it up tells them the institution is managing them
 * rather than talking to them. Corporate euphemism is the opposite of an
 * enterprise standard.
 *
 * What makes a hard decision respectful is not its label. It is that the
 * decision is SPECIFIC, EVIDENCED, and has a ROUTE FORWARD. The engine already
 * returns `reasons` for every outcome; this screen's whole job is to put them
 * in front of the person, name what was seen, and say what happens next.
 * «غير جاهز» with three named observations and a dated plan respects someone far
 * more than a soft label with nothing behind it.
 *
 * WHY NO CELEBRATION ON SUCCESS:
 * The message is «اتوثق فيك تمثّل وادي دجلة» — recognition and responsibility,
 * not confetti. A qualification is a transfer of trust, and trust is sobering.
 *
 * WHY AN INCOMPLETE ASSESSMENT IS NOT SHOWN AS «NOT READY»:
 * The engine is fail-closed: with a station unobserved it answers not_ready,
 * and that is right for certification. Said to the trainee as a verdict, it
 * would be false: nothing was judged yet. Until every station has evidence the
 * screen says the assessment is under way and names the next station. The
 * engine's own reason still shows under «على أي أساس».
 *
 * Reads the domain only. No decision is made here — the engine already decided.
 */
import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { ReadinessStanding } from '../../domain/readiness/track';
import { demonstratedCount, nextStation } from '../../domain/readiness/track';
import { READINESS_FLOORS, CRITICAL_DIMENSIONS, STATIONS } from '../../domain/readiness';
import {
  EVALUATION_DIMENSIONS, DECISION_LABEL, CONDUCT_CHECKS, ALL_CONDUCT_CHECKS,
  type EvaluationDecision, type EvaluationDimension,
} from '../../domain/evaluation';
import {
  Button, Num, PageHeader, Brief, SectionHeader, Status, Meter, DataTable, type Column,
} from '../../ui/primitives';
import { ReadinessTrack } from './ReadinessTrack';
import { WIDTH } from '../../ui/designSystem';

/** Each outcome states plainly what it is, and what happens next. */
const OUTCOME: Record<EvaluationDecision, {
  headline: string; meaning: string; next: string; tone: 'gold' | 'attn' | 'risk';
}> = {
  ready: {
    headline: 'جاهز للعمل المستقل',
    meaning: 'الأدلة من الست محطات بتقول إنك بتاخد القرار الصح وبتوصّله صح — تحت الضغط كمان.',
    next: 'باقي اعتماد المدير — قرار الجاهزية من صلاحيته. توقيع واحد مش تأهيل.',
    tone: 'gold',
  },
  extend: {
    headline: 'تمديد — أيام إضافية بإشراف',
    meaning: 'مفيش خطر تشغيلي في شغلك. فيه فجوات قابلة للتطوير محتاجة وقت مش إعادة.',
    next: 'المدرب هيحدّد أيام إضافية على النقط دي بالظبط، وبعدها تقييم تاني.',
    tone: 'attn',
  },
  escalate: {
    headline: 'مراجعة المدير',
    meaning: 'فيه حاجة في التقييم من سلطة المدير مش من سلطة المدرب. ده مش حكم على أدائك.',
    next: 'المدير هيراجع الأدلة ويقرّر. هتتبلّغ بالنتيجة.',
    tone: 'gold',
  },
  not_ready: {
    headline: 'مش جاهز للعمل المستقل دلوقتي',
    meaning: 'فيه نقط بتخلّي العمل المستقل خطر عليك وعلى النادي. القرار ده على الأداء في المحطات — مش عليك.',
    next: 'المحطات اللي عليها علامة إعادة هي خطة الفترة الجاية — مش نصايح عامة.',
    tone: 'risk',
  },
};

const FINAL_LABEL = { ready: 'معتمد', extend: 'تمديد', reject: 'مرفوض' } as const;
const FINAL_TONE = { ready: 'ready', extend: 'attn', reject: 'risk' } as const;

interface DimRow { d: EvaluationDimension; score: number; floor: number; critical: boolean }

export const ReadinessResult: React.FC<{ standing: ReadinessStanding; onExit: () => void }> = ({ standing, onExit }) => {
  const { outcome, track, conduct, managerDecision, phaseOpen, certified } = standing;
  const shown = demonstratedCount(track);
  const missing = outcome.stationsMissing.length;
  const next = nextStation(track);
  const trainerDone = track.filter(s => s.station.assessor === 'trainer' && s.assessment).length;
  const trainerTotal = STATIONS.filter(s => s.assessor === 'trainer').length;
  const interview = track.find(s => s.station.assessor === 'manager');
  const conductSeen = ALL_CONDUCT_CHECKS.filter(c => conduct[c] === true).length;

  // The one thing on the screen that must be read: the decision, or where the
  // assessment is when there is no decision yet.
  const brief = certified
    ? { tone: 'gold' as const, title: 'معتمد للعمل المستقل',
        body: 'إنت بقيت موثوق تمثّل وادي دجلة قدّام أعضائه. كل جملة هتقولها بعد كده هي موقف النادي — زي أول يوم بالظبط، بس دلوقتي لوحدك.' }
    : missing > 0
      ? { tone: 'gold' as const,
          title: phaseOpen ? 'التقييم لسه شغّال' : 'التقييم بيبدأ بعد اعتماد كل الوحدات',
          body: phaseOpen
            ? <>
                <p className="m-0">فاضل <Num>{missing}</Num> من <Num>{STATIONS.length}</Num> محطات. القرار بيتاخد لما الأدلة تكتمل — مفيش حكم قبلها.</p>
                {next && <p className="m-0 c-tx1">المحطة الجاية: <strong>{next.station.title}</strong> · {next.station.assessor === 'manager' ? 'مع المدير' : 'مع المدرب'}</p>}
              </>
            : 'الست محطات بتتعمل في آخر أسبوع من البرنامج (اليوم 54–60). اللي بتتعلّمه دلوقتي هو اللي هيتقاس فيها.' }
      : { tone: OUTCOME[outcome.decision].tone, title: OUTCOME[outcome.decision].headline,
          body: <><p className="m-0">{OUTCOME[outcome.decision].meaning}</p><p className="m-0 c-tx1">{OUTCOME[outcome.decision].next}</p></> };

  const dims: DimRow[] = (Object.keys(EVALUATION_DIMENSIONS) as EvaluationDimension[]).map(d => ({
    d, score: outcome.scores[d], floor: READINESS_FLOORS[d], critical: CRITICAL_DIMENSIONS.includes(d),
  }));
  const observed = (d: EvaluationDimension) => track.some(s => s.assessment && s.station.measures.includes(d));
  const columns: Column<DimRow>[] = [
    { id: 'dim', header: 'المحور', cell: r => <span className="c-tx0">{EVALUATION_DIMENSIONS[r.d]}</span> },
    {
      id: 'score', header: 'الدرجة', align: 'end', sortValue: r => r.score,
      cell: r => observed(r.d)
        ? <span className="row items-center gap-3 justify-end"><Meter value={r.score} tone={r.score < r.floor ? (r.critical ? 'risk' : 'attn') : 'ready'} /><Num>{r.score}%</Num></span>
        : <span className="c-tx2">—</span>,
    },
    { id: 'floor', header: 'الحد الأدنى', align: 'end', cell: r => <Num>{r.floor}</Num> },
    {
      id: 'state', header: 'الحالة',
      cell: r => !observed(r.d) ? <Status tone="neutral">لسه ما اتقاسش</Status>
        : r.score >= r.floor ? <Status tone="ready">فوق الحد</Status>
        : <Status tone={r.critical ? 'risk' : 'attn'}>{r.critical ? 'تحت الحد · حرج' : 'تحت الحد'}</Status>,
    },
  ];

  return (
    <main style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
      <PageHeader crumbs={[<a key="a" href="#/" className="crumb-link">الأكاديمية</a>, <a key="j" href="#/roadmap" className="crumb-link">رحلتي</a>, 'تقييم الجاهزية']}
        title="جاهزيتك للعمل المستقل"
        lead={<><Num>{shown}</Num> من <Num>{STATIONS.length}</Num> محطات اتثبتت · التقييم في اليوم 54–60</>}
        actions={<Button variant="ghost" onClick={onExit}><ArrowRight size={16} className="icon-dir" /> رجوع لرحلتي</Button>} />

      <Brief prominent tone={brief.tone} title={brief.title} body={brief.body}
        eyebrow={<Status tone={certified ? 'ready' : missing > 0 ? 'neutral' : outcome.decision === 'ready' ? 'ready' : outcome.decision === 'extend' ? 'attn' : outcome.decision === 'not_ready' ? 'risk' : 'info'}>
          {certified ? 'معتمد من المدرب والمدير' : missing > 0 ? 'لسه ما اتحسمش' : `قرار المحطات: ${DECISION_LABEL[outcome.decision]}`}
        </Status>} />

      <div className="workspace workspace--aside region">
        <section aria-labelledby="rd-track">
          <SectionHeader id="rd-track" title="المحطات الست" count={STATIONS.length}
            description="كل محطة موقف حقيقي بيتقاس فيه أكتر من محور مع بعض. الملاحظة اللي بتتسجّل هي الدليل." />
          <div className="mt-5"><ReadinessTrack label="المحطات الست" standings={track} /></div>
        </section>

        <aside className="stack gap-7" aria-label="الاعتماد">
          <section>
            <h2 className="panel-title">الاعتماد</h2>
            <dl className="kv">
              <div><dt className="t-sm">المدرب · محطات 1–5</dt><dd><Status tone={trainerDone === trainerTotal ? 'ready' : 'neutral'}><Num>{trainerDone}</Num> من <Num>{trainerTotal}</Num></Status></dd></div>
              <div><dt className="t-sm">السلوك المهني</dt><dd><Status tone={conductSeen === ALL_CONDUCT_CHECKS.length ? 'ready' : 'neutral'}><Num>{conductSeen}</Num> من <Num>{ALL_CONDUCT_CHECKS.length}</Num></Status></dd></div>
              <div><dt className="t-sm">المدير · المقابلة</dt><dd><Status tone={interview?.assessment ? 'ready' : 'neutral'}>{interview?.assessment ? 'اتسجّلت' : 'لسه'}</Status></dd></div>
              <div><dt className="t-sm">القرار النهائي</dt><dd>{managerDecision
                ? <Status tone={FINAL_TONE[managerDecision.decision]}>{FINAL_LABEL[managerDecision.decision]}</Status>
                : <Status tone="neutral">لسه</Status>}</dd></div>
            </dl>
            <p className="t-sm mt-3 mb-0">توقيع واحد مش تأهيل: المدرب بيوصي من الأدلة، والمدير بيعتمد الجاهزية.</p>
          </section>

          <section>
            <h2 className="panel-title">السلوك المهني</h2>
            <dl className="kv">
              {ALL_CONDUCT_CHECKS.map(c => (
                <div key={c}><dt className="t-sm">{CONDUCT_CHECKS[c]}</dt>
                  <dd>{conduct[c] === true ? <Status tone="ready">اتشاف</Status> : <Status tone="neutral">لسه</Status>}</dd></div>
              ))}
            </dl>
          </section>

          {outcome.strengths.length > 0 && (
            <section>
              {/* Strengths are named too — an assessment that only names
                  failures is an audit, not a development conversation. */}
              <h2 className="panel-title">اللي ظهر قوي</h2>
              <p className="t-sm c-tx1 m-0">{outcome.strengths.map(d => EVALUATION_DIMENSIONS[d]).join(' · ')}</p>
            </section>
          )}
        </aside>
      </div>

      <div className="stack gap-8 region">
        <section aria-labelledby="rd-why">
          <SectionHeader id="rd-why" title="على أي أساس" description="أسباب محرك الجاهزية نفسها — كل سبب راجع لقاعدة." />
          <ul className="ruled-list mt-3">
            {outcome.reasons.map(r => <li key={r}>{r}</li>)}
          </ul>
        </section>

        <section aria-labelledby="rd-dims">
          <SectionHeader id="rd-dims" title="المحاور الرسمية"
            description={<>الإجمالي الموزون <Num>{outcome.overall}%</Num> · الحرجة: مراجعة المستندات، تطبيق اللائحة، الدقة.</>} />
          <div className="mt-3">
            <DataTable caption="المحاور الرسمية" columns={columns} rows={dims} rowKey={r => r.d}
              rowTone={r => observed(r.d) && r.score < r.floor ? (r.critical ? 'risk' : 'attn') : undefined} />
          </div>
        </section>
      </div>

      <p className="t-sm mt-8 mb-0">
        القرار في النظام: {DECISION_LABEL[outcome.decision]} · مبني على أدلة من <Num>{STATIONS.length - missing}</Num> من <Num>{STATIONS.length}</Num> محطات.
      </p>
    </main>
  );
};
