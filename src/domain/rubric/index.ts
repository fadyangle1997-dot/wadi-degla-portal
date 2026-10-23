/**
 * Behavioural rubrics — what a number on this platform is actually allowed to mean.
 *
 * THE PROBLEM THIS FIXES:
 * The readiness engine blocks certification below 70 on a critical KPI. But
 * nothing anywhere defined what 70 meant. Two trainers watching the same
 * encounter produced different numbers, and the engine treated both as fact.
 * That is false precision — a guess wearing a decimal point — and it is worse
 * than no number, because the decimal grants the guess an authority it never
 * earned.
 *
 * A rubric level is not a score. It is a SENTENCE a trainer can point at:
 *   «بيطبّق القاعدة لوحده بس بيتردّد» — either you saw that or you did not.
 *
 * Four levels, because three collapses into "fine / not fine" and five invents a
 * middle nobody can distinguish. The wording follows the same progression across
 * every KPI: with help → alone but hesitant → confident and explains → leads and
 * teaches. That progression IS the academy's arc, from m1 to certification.
 *
 * Pure domain. The trainer picks a level; `scoreOf` converts it for the engine —
 * the engine never changes, and neither does any weight.
 */
import type { EvaluationDimension } from '../evaluation';

export type RubricLevel = 1 | 2 | 3 | 4;
export const RUBRIC_LEVELS: readonly RubricLevel[] = [1, 2, 3, 4];

/**
 * Levels map onto the 0–100 scale the engine already uses. The floors were set
 * at 70 (critical) and 60 (developmental), so Level 3 is the first level that
 * clears a critical floor — «بيطبّقها ويشرحها بثقة» is exactly the bar the club
 * needs for independent work, and Level 2 («بيتردّد») is exactly what should
 * earn extension instead.
 */
export const LEVEL_SCORE: Record<RubricLevel, number> = { 1: 25, 2: 50, 3: 75, 4: 100 };

export const LEVEL_NAME: Record<RubricLevel, string> = {
  1: 'بمساعدة',
  2: 'لوحده بتردّد',
  3: 'بثقة ويشرح',
  4: 'بيقود ويعلّم',
};

/** Every descriptor is an observable act. None of them is an impression. */
export const RUBRIC: Record<EvaluationDimension, Record<RubricLevel, string>> = {
  docReview: {
    1: 'بيراجع الملف والمدرب بيوقّفه على الناقص.',
    2: 'بيمسك الناقص لوحده، بس بيراجع على دفعات فبيطلب أكتر من مرة.',
    3: 'بيراجع الملف كامل قبل ما يتكلم، وبيطلب كل الناقص مرة واحدة بالعدد.',
    4: 'بيمسك الناقص وبيمسك كمان الخطر اللي هيرجع بعدين، وبيوضّحه لزميله.',
  },
  ruleCompliance: {
    1: 'بيسأل على القاعدة قبل أي قرار.',
    2: 'بيطبّق القاعدة لوحده بس بيتردّد، وأحيانًا بيصعّد اللي يقدر يحسمه.',
    3: 'بيطبّقها لوحده وبيسمّي القاعدة ورا قراره من غير ما حد يسأله.',
    4: 'بيطبّقها في الحالة الرمادية كمان، وبيفرّق ناقص من مكسور بلا تردّد.',
  },
  accuracy: {
    1: 'بيحسب والمدرب بيراجع وراه ويلاقي فروق.',
    2: 'بيحسب صح غالبًا، بس مش بيراجع نفسه قبل التسليم.',
    3: 'بيراجع شغله بنفسه قبل ما يقول خلصت، وبيمسك غلطه هو.',
    4: 'بيمسك غلط في احتساب جايله من حد تاني وبيصحّحه قبل الاعتماد.',
  },
  memberService: {
    1: 'بيوصل القرار والعضو بيخرج زعلان أو مش فاهم.',
    2: 'بيشرح القاعدة بس بيبدأ بالنتيجة، فالعضو بيفاوضه هو.',
    3: 'بيربط القرار بالقاعدة، وبيقفل بخطوة، وما بيوعدش بحاجة بره اللائحة.',
    4: 'بيحوّل موقف متوتر لحوار هادي، والعضو بيمشي فاهم حتى لما الرد بالرفض.',
  },
  systemUsage: {
    1: 'محتاج حد يوقف جنبه على النظام.',
    2: 'بيستخدمه لوحده بس ببطء بيأخّر العضو.',
    3: 'بيستخدمه بكفاءة وبيوثّق صح من غير ما يسيب حاجة معلّقة.',
    4: 'بيلاقي طريق أسرع صح ويعلّمه لزمايله.',
  },
  problemSolving: {
    1: 'بيقف قدّام أي حالة مش في الكتاب.',
    2: 'بيوصل للقرار بس بعد وقت، وبيصعّد حاجات هو يقدر يحلّها.',
    3: 'بيشخّص المشكلة الحقيقية مش الظاهرة، وبينهي كل حالة بقرار من الأربعة.',
    4: 'بيمسك التقاطع بين قواعد وبيعرف بالظبط إمتى يصعّد وإمتى يحسم.',
  },
  teamwork: {
    1: 'بيرجّع الملف بكلمة «ناقص» من غير تحديد.',
    2: 'بيحدّد الناقص بس من غير سبب، فبيترد عليه بأسئلة.',
    3: 'بيكتب الناقص وسببه بشكل المبيعات يقدروا يشرحوه للعميل من غير رجوع.',
    4: 'بيسهّل على اللي بعده: بيوثّق القرار بحيث حد تاني يقدر يكمّل من غيره.',
  },
};

/** The score the engine consumes. Trainers pick behaviour; the number follows. */
export function scoreOf(level: RubricLevel): number {
  return LEVEL_SCORE[level];
}

/**
 * The lowest level that meets a floor. The floors were set on the 0–100 scale
 * the levels map onto, so a floor of 70 asks for «بثقة ويشرح» and 50 for
 * «لوحده بتردّد» — the sentence a manager reads instead of the number.
 */
export function requiredLevel(floor: number): RubricLevel {
  return RUBRIC_LEVELS.find(l => LEVEL_SCORE[l] >= floor) ?? 4;
}

/** The level a raw score corresponds to — for reading legacy or imported data. */
export function levelOf(score: number): RubricLevel {
  if (score >= 88) return 4;
  if (score >= 63) return 3;
  if (score >= 38) return 2;
  return 1;
}

/**
 * Two trainers, one encounter. If they differ by more than one level the scores
 * are not comparable and the pair needs recalibration — Ritz-Carlton certifies
 * its own certifiers for exactly this reason. Without this check, a readiness
 * floor is measuring the assessor, not the trainee.
 */
export function needsCalibration(a: RubricLevel, b: RubricLevel): boolean {
  return Math.abs(a - b) > 1;
}

/* ---------------- assessing with levels ---------------- */

/**
 * A trainer's picks so far. A KPI with no pick is NOT ASSESSED — never a
 * default. The old forms opened every slider at 80 (stations at 70, exactly
 * the critical floor) and could be submitted untouched, recording a judgement
 * nobody made.
 */
export type LevelPicks = Readonly<Partial<Record<EvaluationDimension, RubricLevel>>>;

/** The KPIs still without a level, in the order given. */
export function unassessed(picks: LevelPicks, dims: readonly EvaluationDimension[]): readonly EvaluationDimension[] {
  return dims.filter(d => picks[d] === undefined);
}

/**
 * The engine's numbers from complete picks, or null while any KPI is
 * unassessed — so an incomplete assessment cannot become a score at all.
 */
export function scoresFromLevels<D extends EvaluationDimension>(
  picks: LevelPicks, dims: readonly D[],
): Readonly<Record<D, number>> | null {
  if (unassessed(picks, dims).length > 0) return null;
  return Object.fromEntries(dims.map(d => [d, scoreOf(picks[d]!)])) as Record<D, number>;
}

/**
 * The scores of the KPIs the trainer actually picked, and only those. A unit
 * assessment requires the critical KPIs; any other KPI the trainer did not see
 * in that unit stays out of the record instead of becoming a judgement nobody
 * made.
 */
export function observedScores(picks: LevelPicks): Readonly<Partial<Record<EvaluationDimension, number>>> {
  return Object.fromEntries(
    (Object.entries(picks) as [EvaluationDimension, RubricLevel | undefined][])
      .filter(([, l]) => l !== undefined)
      .map(([d, l]) => [d, scoreOf(l!)]),
  );
}
