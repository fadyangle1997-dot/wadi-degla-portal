/**
 * Readiness report — the one document a trainer, branch manager and
 * department manager read about a trainee: «هل المتدرب جاهز يشتغل في مكتب
 * العضويات لوحده؟».
 *
 * A pure COMPOSITION. It invents no scoring and no verdict of its own: the
 * answer is the formal readiness (domain/readiness/status — the six stations,
 * conduct, the engine and the manager), the supporting evidence is practical
 * performance (domain/performance — the trainer's unit evaluations), and the
 * context is programme progress (units approved). This report used to derive
 * a second verdict from the unit evaluations («جاهز بشروط», a risk level),
 * which is how one file could read «87% · مش جاهز · مخاطرة منخفضة»; that
 * parallel verdict is gone.
 */
import type { TrainingState } from '../../app/training/trainingStore';
import type { EvaluationDimension } from '../evaluation';
import { isProgramComplete, approvedModuleCount } from '../journey/programCompletion';
import { practicalPerformance, type PracticalPerformance, type PerformanceDimension, type TrainingEventLike } from '../performance';
import { formalReadiness, type FormalReadiness } from './status';

export interface DevelopmentArea extends PerformanceDimension {
  /** Why it matters, with the evidence (how far below the floor). */
  readonly why: string;
  readonly suggestion: string;
}

export interface ReadinessReport {
  readonly traineeId: string;
  readonly programme: { readonly complete: boolean; readonly approved: number; readonly total: number };
  /** The answer. */
  readonly formal: FormalReadiness;
  /** The evidence — the trainer's latest judgement of the seven KPIs. */
  readonly performance: PracticalPerformance;
  /** Every KPI under its floor in that judgement, with what to do about it. */
  readonly developmentAreas: readonly DevelopmentArea[];
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

/** Any training-log event; only the evaluation and extension events feed performance. */
type LogEvent = { readonly type: string; readonly employeeId?: string; readonly at?: number };
const feedsPerformance = (e: LogEvent): boolean => e.type === 'EVALUATION_RECORDED' || e.type === 'TRAINING_EXTENDED';

export function readinessReport(t: TrainingState, events: readonly LogEvent[], traineeId: string): ReadinessReport {
  const complete = isProgramComplete(t, traineeId);
  const { approved, total } = approvedModuleCount(t, traineeId);
  const performance = practicalPerformance(events.filter(feedsPerformance) as unknown as readonly TrainingEventLike[], traineeId);
  const developmentAreas: DevelopmentArea[] = performance.gaps.map(l => ({
    ...l,
    why: l.critical
      ? `بُعد حرج تحت الحد الآمن (${l.score} مقابل ${l.floor}) — خطر تشغيلي مباشر على الملف.`
      : `تحت الحد المطلوب (${l.score} مقابل ${l.floor}) — فجوة قابلة للتطوير.`,
    suggestion: SUGGESTION[l.dimension],
  }));
  return {
    traineeId,
    programme: { complete, approved, total },
    formal: formalReadiness(events, traineeId, complete),
    performance,
    developmentAreas,
  };
}
