/**
 * Operational Readiness Report — the ONE operational document the trainer,
 * branch manager and department manager read to answer a single question:
 * "is this trainee operationally ready to work inside the Membership Office?"
 *
 * This is a pure AGGREGATION layer. It invents no scoring and stores nothing.
 * It reads the evidence the platform already produces — trainer evaluations
 * (EVALUATION_RECORDED → Scores), the manager's final decision, module reviews —
 * and folds them through the EXISTING engines (readinessScore, READINESS_FLOORS,
 * CRITICAL_DIMENSIONS, EVALUATION_DIMENSIONS) into one executive summary.
 *
 * Single source of truth: every number here traces back to a training event.
 */
import type { TrainingState, FinalDecision } from '../../app/training/trainingStore';
import { finalDecisionOf } from '../training/selectors';
import {
  ALL_DIMENSIONS, EVALUATION_DIMENSIONS, readinessScore, DECISION_LABEL,
  type EvaluationDimension, type Scores, type EvaluationDecision,
} from '../evaluation';
import { CRITICAL_DIMENSIONS, READINESS_FLOORS } from './index';
import { isProgramComplete, approvedModuleCount } from '../journey/programCompletion';

export type ReadinessVerdict = 'ready' | 'ready_with_conditions' | 'extend' | 'not_ready';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface DimensionLine {
  readonly dimension: EvaluationDimension;
  readonly label: string;
  readonly score: number;
  readonly floor: number;
  readonly critical: boolean;
  readonly belowFloor: boolean;
}

export interface DevelopmentArea {
  readonly dimension: EvaluationDimension;
  readonly label: string;
  readonly score: number;
  readonly floor: number;
  readonly critical: boolean;
  /** why it matters + evidence (how far below floor) + suggested improvement. */
  readonly why: string;
  readonly suggestion: string;
}

export interface OperationalReadinessReport {
  readonly traineeId: string;
  readonly programComplete: boolean;
  readonly modulesApproved: number;
  readonly modulesTotal: number;
  /** Weighted overall readiness across the seven dimensions (existing engine). */
  readonly overall: number;
  readonly evaluationsCount: number;
  readonly dimensions: readonly DimensionLine[];
  readonly strengths: readonly DimensionLine[];
  readonly developmentAreas: readonly DevelopmentArea[];
  readonly criticalFailures: readonly DimensionLine[];
  readonly risk: RiskLevel;
  readonly trainerRecommendation: EvaluationDecision | null;
  readonly managerDecision: FinalDecision | null;
  readonly verdict: ReadinessVerdict;
  /** Traceable, human-readable reasons behind the verdict. */
  readonly reasons: readonly string[];
}

/** The trainee's dimension scores = the MEAN of each dimension across every
 *  trainer evaluation on record. Reads the same events analytics reads. */
function meanScores(evals: readonly { scores?: Scores }[]): Scores {
  const out = {} as Record<EvaluationDimension, number>;
  for (const d of ALL_DIMENSIONS) {
    const vals = evals.map(e => e.scores?.[d]).filter((v): v is number => typeof v === 'number');
    out[d] = vals.length === 0 ? 0 : Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }
  return out;
}

const SUGGESTION: Record<EvaluationDimension, string> = {
  docReview: 'تدريب موجّه على مراجعة مستندات حقيقية بإشراف المدرب.',
  ruleCompliance: 'مراجعة اللوائح المرتبطة بالحالات اللي غلط فيها + تطبيق عملي.',
  accuracy: 'تمرين دقة على حالات مشابهة قبل التسليم المستقل.',
  memberService: 'محاكاة تعامل مع أعضاء بأنماط مختلفة تحت إشراف.',
  systemUsage: 'ممارسة إضافية على النظام في المكتب على معاملات بسيطة.',
  problemSolving: 'حالات تشخيص مشكلة متدرّجة الصعوبة مع المدرب.',
  teamwork: 'إشراك في مهام مشتركة مع الفريق لبناء التنسيق.',
};

/**
 * Build the report from the training log. Everything derived, nothing stored.
 * `evals` are this trainee's EVALUATION_RECORDED events (with scores).
 */
export function operationalReadinessReport(
  t: TrainingState,
  traineeId: string,
  evals: readonly { scores?: Scores; decision?: EvaluationDecision; at?: number }[],
): OperationalReadinessReport {
  const withScores = evals.filter(e => e.scores);
  const scores = meanScores(withScores);
  const overall = withScores.length ? readinessScore(scores) : 0;

  const dimensions: DimensionLine[] = ALL_DIMENSIONS.map(d => ({
    dimension: d,
    label: EVALUATION_DIMENSIONS[d],
    score: scores[d],
    floor: READINESS_FLOORS[d],
    critical: CRITICAL_DIMENSIONS.includes(d),
    belowFloor: scores[d] < READINESS_FLOORS[d],
  }));

  const strengths = dimensions.filter(l => l.score >= 85);
  const belowFloor = dimensions.filter(l => l.belowFloor);
  const criticalFailures = belowFloor.filter(l => l.critical);

  const developmentAreas: DevelopmentArea[] = belowFloor.map(l => ({
    dimension: l.dimension, label: l.label, score: l.score, floor: l.floor, critical: l.critical,
    why: l.critical
      ? `بُعد حرج تحت الحد الآمن (${l.score} مقابل ${l.floor}) — خطر تشغيلي مباشر على الملف.`
      : `تحت الحد المطلوب (${l.score} مقابل ${l.floor}) — فجوة قابلة للتطوير.`,
    suggestion: SUGGESTION[l.dimension],
  }));

  // Risk: any critical failure → high; any developmental gap → medium; else low.
  const risk: RiskLevel = criticalFailures.length > 0 ? 'high' : belowFloor.length > 0 ? 'medium' : 'low';

  // Latest trainer recommendation across the record.
  const lastEval = withScores.length ? evals[evals.length - 1]! : null;
  const trainerRecommendation = lastEval?.decision ?? null;

  const managerDecision = finalDecisionOf(t, traineeId);
  const programComplete = isProgramComplete(t, traineeId);
  const { approved, total } = approvedModuleCount(t, traineeId);

  // Verdict — fail-closed, evidence-only. The manager's explicit decision wins
  // when present; otherwise the report derives a provisional verdict.
  const reasons: string[] = [];
  let verdict: ReadinessVerdict;
  if (managerDecision) {
    verdict = managerDecision.decision === 'ready' ? 'ready'
      : managerDecision.decision === 'extend' ? 'extend' : 'not_ready';
    reasons.push(`قرار المدير النهائي: ${verdict === 'ready' ? 'جاهز' : verdict === 'extend' ? 'تمديد' : 'غير جاهز'}.`);
  } else if (!programComplete) {
    verdict = 'not_ready';
    reasons.push(`البرنامج مش مكتمل — ${approved} من ${total} وحدات معتمدة.`);
  } else if (criticalFailures.length > 0) {
    verdict = 'not_ready';
    reasons.push(`أبعاد حرجة تحت الحد الآمن: ${criticalFailures.map(l => l.label).join(' · ')}.`);
  } else if (belowFloor.length > 0) {
    verdict = 'ready_with_conditions';
    reasons.push(`جاهز مع متابعة على: ${belowFloor.map(l => l.label).join(' · ')}.`);
  } else {
    verdict = 'ready';
    reasons.push('كل الأبعاد فوق الحد الآمن والبرنامج مكتمل.');
  }

  if (trainerRecommendation) {
    reasons.push(`توصية المدرب: ${DECISION_LABEL[trainerRecommendation]}.`);
  }

  return {
    traineeId, programComplete, modulesApproved: approved, modulesTotal: total,
    overall, evaluationsCount: withScores.length,
    dimensions, strengths, developmentAreas, criticalFailures, risk,
    trainerRecommendation, managerDecision, verdict, reasons,
  };
}
