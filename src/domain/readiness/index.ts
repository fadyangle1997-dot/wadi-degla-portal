/**
 * Professional Readiness Assessment (day 54–60) — the qualification engine.
 *
 * This phase does not teach. It answers one operational question:
 *   «الموظف ده يقدر يمثّل وادي دجلة لوحده بكرة الصبح؟»
 * If the answer is not confidently yes, the system refuses.
 *
 * ── FOUR DEPARTURES FROM THE PROPOSED DESIGN, AND WHY ────────────────────
 *
 * 1. A STATION IS AN ENCOUNTER, NOT A COMPETENCY.
 *    The proposal had a "communication station", a "judgment station" and so
 *    on. But the academy spent sixty days teaching that the rule, the decision
 *    and the delivery are inseparable — an assessment that splits them apart
 *    contradicts its own curriculum, and it is not how work arrives. Work
 *    arrives as a member with a problem, and every competency surfaces at once.
 *    This is the OSCE principle from clinical assessment: the station is «مريض
 *    بألم في الصدر», never «a communication station», and the candidate is
 *    scored across dimensions from one performance.
 *
 * 2. THE STATIONS MUST COVER THE SEVEN OFFICIAL KPIs.
 *    The proposed six measured neither `systemUsage` (10%) nor `teamwork` (5%)
 *    — 15% of the official score would have been computed from nothing. A
 *    contract test now fails the build if any KPI is unmeasured.
 *
 * 3. CRITICALITY IS A TIER, NOT A FLAT RULE.
 *    "Failure in one dimension means NOT ready" cannot coexist with a decision
 *    engine that offers «تمديد». Being slow in the system is not the same as
 *    breaking policy. Critical dimensions block outright; developmental ones
 *    extend.
 *
 * 4. TRAINER AND MANAGER ARE TWO AUTHORITIES, NOT ONE STATION.
 *    The proposal's "Manager Review" station was run by the trainer. The
 *    operating guide requires BOTH «اعتماد المدرب» and «اعتماد المدير»;
 *    collapsing them removes the second pair of eyes, and our own RBAC says the
 *    manager does not train. The trainer proposes from evidence; readiness for
 *    independent work is confirmed by the manager.
 *
 * Pure domain: no UI, no storage. The API enforces the identical rules.
 */
import type { EvaluationDimension, EvaluationDecision, ConductObservations, Scores } from '../evaluation';
import { ALL_DIMENSIONS, conductPassed, readinessScore } from '../evaluation';

/** How the encounter is staged — the format, not the competency. */
export type StationKind = 'case' | 'file_review' | 'live_encounter' | 'interview';

export interface Station {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  /** The operational situation the trainee walks into. */
  readonly situation: string;
  readonly kind: StationKind;
  /** The official KPIs this ONE encounter exercises — scored together. */
  readonly measures: readonly EvaluationDimension[];
  /** Who observes. The manager's station is not the trainer's. */
  readonly assessor: 'trainer' | 'manager';
}

/**
 * Six encounters. Between them they exercise all seven KPIs — asserted by test,
 * because a weighted score over unmeasured dimensions is theatre.
 */
export const STATIONS: readonly Station[] = [
  {
    id: 'st1-routine-joining',
    order: 1,
    title: 'حالة انضمام عادية',
    situation:
      'عضوة جاية تضم والدتها (58 سنة). معاها بطاقة الوالدة بس. مفيش ضغط ومفيش زعل — ' +
      'موقف عادي زي 90% من شغل اليوم.',
    kind: 'case',
    // The ordinary encounter: paper, rule, and how it is asked for — together.
    measures: ['docReview', 'ruleCompliance', 'memberService'],
    assessor: 'trainer',
  },
  {
    id: 'st2-gray-case',
    order: 2,
    title: 'حالة رمادية',
    situation:
      'ابن 24 سنة، طالب، بكارنيه جامعة ساري — ووظيفة «مهندس» مثبتة في بطاقته. ' +
      'العضو بيقول إن ابنه لسه بيدرس ماجستير.',
    kind: 'case',
    // Judgment under ambiguity + the reasoning behind it.
    measures: ['ruleCompliance', 'problemSolving', 'accuracy'],
    assessor: 'trainer',
  },
  {
    id: 'st3-file-review',
    order: 3,
    title: 'مراجعة ملفات حقيقية',
    situation:
      'تلات ملفات جاية من المبيعات للاعتماد. اكتشف الناقص، والمستند الغلط، ' +
      'ومخالفة اللائحة — واكتب اللي بيترجع لهم إزاي.',
    kind: 'file_review',
    // Registration is internal work: the audience is Sales, so teamwork is the
    // KPI that shows here — the only station where it can honestly be observed.
    measures: ['docReview', 'accuracy', 'systemUsage', 'teamwork'],
    assessor: 'trainer',
  },
  {
    id: 'st4-refusal-encounter',
    order: 4,
    title: 'رفض قدّام عضو',
    situation:
      'عضو عايز يضم أخته — وهي شغّالة. الرفض صح ومحسوم. المطلوب: يوصل من غير ما العضو يبقى خصم.',
    kind: 'live_encounter',
    measures: ['ruleCompliance', 'memberService', 'problemSolving'],
    assessor: 'trainer',
  },
  {
    id: 'st5-compound-pressure',
    order: 5,
    title: 'ضغط مركّب',
    situation:
      'عضو غاضب بيرفع صوته على غرامة + النظام بطيء + ملفه ناقص ورقة + وراه طابور مستني. ' +
      'كل ده في نفس الوقت.',
    kind: 'live_encounter',
    // Everything at once — the closest thing to a real bad morning.
    measures: ['memberService', 'problemSolving', 'systemUsage', 'ruleCompliance'],
    assessor: 'trainer',
  },
  {
    id: 'st6-manager-review',
    order: 6,
    title: 'مقابلة الجاهزية التشغيلية',
    situation:
      'مقابلة مع المدير. مفيش أسئلة نظرية — أسئلة تفكير: «ليه ماعتمدتش الحالة دي؟» · ' +
      '«إيه الخطر التشغيلي اللي كان موجود؟» · «لو تجاهلت القاعدة دي كان هيحصل إيه؟».',
    kind: 'interview',
    // A separate authority, per the operating guide: the manager owns
    // operational readiness and does not train.
    measures: ['ruleCompliance', 'problemSolving', 'accuracy'],
    assessor: 'manager',
  },
];

/**
 * Operational safety vs developmental gaps.
 *
 * Failing these three means the employee would issue wrong files, break policy,
 * or miscalculate money. There is no coaching plan that makes that safe
 * tomorrow morning — it blocks.
 */
export const CRITICAL_DIMENSIONS: readonly EvaluationDimension[] = ['docReview', 'ruleCompliance', 'accuracy'];

/** Minimum per KPI. Critical dimensions sit higher — they carry the risk. */
export const READINESS_FLOORS: Record<EvaluationDimension, number> = {
  docReview: 70,
  ruleCompliance: 70,
  accuracy: 70,
  memberService: 60,
  systemUsage: 60,
  problemSolving: 60,
  teamwork: 50,
};

/** One observation, tied to the station that produced it. Evidence, not opinion. */
export interface Evidence {
  readonly stationId: string;
  readonly dimension: EvaluationDimension;
  readonly score: number;
  /** WHY this score. An unexplainable evaluation is not traceable — and the
   *  guide requires every readiness decision to be defensible. */
  readonly observation: string;
}

export interface ReadinessInput {
  readonly evidence: readonly Evidence[];
  /** The four observable conduct behaviours, from the professionalism layer. */
  readonly conduct: ConductObservations;
  /** Stations the manager flagged as needing their own authority. */
  readonly managerFlag?: boolean;
}

export interface ReadinessOutcome {
  readonly decision: EvaluationDecision;
  /** Every reason is traceable to a rule — this is what makes it explainable. */
  readonly reasons: readonly string[];
  readonly scores: Scores;
  readonly overall: number;
  readonly strengths: readonly EvaluationDimension[];
  readonly risks: readonly EvaluationDimension[];
  readonly stationsMissing: readonly string[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Mean score per dimension across every station that measured it. */
export function scoresFrom(evidence: readonly Evidence[]): Scores {
  const out = {} as Record<EvaluationDimension, number>;
  for (const d of ALL_DIMENSIONS) {
    const hits = evidence.filter(e => e.dimension === d);
    out[d] = hits.length === 0 ? 0 : Math.round(hits.reduce((s, e) => s + clamp(e.score), 0) / hits.length);
  }
  return out;
}

/** Stations with no evidence at all — an unattempted station is not a pass. */
export function missingStations(evidence: readonly Evidence[]): readonly string[] {
  const seen = new Set(evidence.map(e => e.stationId));
  return STATIONS.filter(s => !seen.has(s.id)).map(s => s.id);
}

/**
 * The decision engine. Order matters: the hardest blocks are checked first, so
 * a trainee is never told "extend" when the truth is "not ready".
 *
 * FAIL-CLOSED throughout — every unresolved path lands on `not_ready`, never on
 * `ready`. Certification is the one outcome that must be earned explicitly.
 */
export function assessReadiness(input: ReadinessInput): ReadinessOutcome {
  const reasons: string[] = [];
  const scores = scoresFrom(input.evidence);
  const overall = readinessScore(scores);
  const stationsMissing = missingStations(input.evidence);

  const risks = ALL_DIMENSIONS.filter(d => scores[d] < READINESS_FLOORS[d]);
  const strengths = ALL_DIMENSIONS.filter(d => scores[d] >= 85);

  const failedCritical = risks.filter(d => CRITICAL_DIMENSIONS.includes(d));
  const failedDevelopmental = risks.filter(d => !CRITICAL_DIMENSIONS.includes(d));

  const base = { scores, overall, strengths, risks, stationsMissing };

  // 1 · Incomplete evidence is never a pass. You cannot certify what you did
  //     not observe.
  if (stationsMissing.length > 0) {
    reasons.push(`مفيش أدلة من ${stationsMissing.length} محطة — التقييم مش مكتمل.`);
    return { decision: 'not_ready', reasons, ...base };
  }

  // 2 · The professionalism gate. A correct decision delivered badly still
  //     costs the club a member — this is the rule the whole layer rests on.
  if (!conductPassed(input.conduct)) {
    reasons.push('التمثيل المهني مش مكتمل — القرار الصح بتوصيل غلط مش جاهزية.');
    return { decision: 'not_ready', reasons, ...base };
  }

  // 3 · Operational safety. No coaching plan makes a policy breach safe tomorrow.
  if (failedCritical.length > 0) {
    reasons.push(`أبعاد حرجة تحت الحد الآمن: ${failedCritical.join(' · ')} — ده خطر تشغيلي مباشر.`);
    return { decision: 'not_ready', reasons, ...base };
  }

  // 4 · The manager's own authority. Not a verdict on the trainee.
  if (input.managerFlag) {
    reasons.push('المدير طلب مراجعة — القرار من سلطته مش من سلطة المدرب.');
    return { decision: 'escalate', reasons, ...base };
  }

  // 5 · Developmental gaps are real but coachable — extension, not failure.
  if (failedDevelopmental.length > 0) {
    reasons.push(`فجوات قابلة للتطوير: ${failedDevelopmental.join(' · ')} — أيام إضافية بإشراف.`);
    return { decision: 'extend', reasons, ...base };
  }

  reasons.push('كل الأبعاد فوق الحد الآمن، والتمثيل المهني مكتمل عبر الست محطات.');
  return { decision: 'ready', reasons, ...base };
}

/**
 * Readiness for independent work needs BOTH authorities — the guide is explicit
 * that the trainer approves the field performance and the manager approves the
 * operational readiness. One signature is not a qualification.
 */
export function isCertified(trainer: EvaluationDecision, manager: EvaluationDecision): boolean {
  return trainer === 'ready' && manager === 'ready';
}
