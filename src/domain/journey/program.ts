/**
 * The 60-day training program — pure domain model.
 *
 * Source of truth: the official operating guide (دليل التشغيل الرسمي, 3 July
 * 2026). Its six-unit timeline is authoritative because it reflects how the
 * membership office actually onboards, and the built curriculum already carries
 * those exact day ranges (`Module.timeline`).
 *
 * Phases are written as LEARNING OUTCOMES ("what you can do after this"), not
 * as topic lists — a phase earns its place only if it changes what the trainee
 * can safely do. Phases whose modules aren't built yet declare `moduleIds: []`;
 * they are honestly reported as `planned`, never faked as available.
 */

export type PhaseStatus =
  | 'completed'        // every unit approved by a trainer
  | 'waiting_trainer'  // exam passed, evaluation pending
  | 'in_progress'      // started, not finished
  | 'available'        // unlocked, not started
  | 'locked'           // previous phase not approved yet
  | 'planned';         // real part of the program; content not built yet

export interface JourneyPhase {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  /** Why this phase exists — the competence it adds. */
  readonly purpose: string;
  readonly dayStart: number;
  readonly dayEnd: number;
  /** What the trainee can do when this phase is done. */
  readonly outcomes: readonly string[];
  /** Built curriculum units covering this phase. Empty = not built yet. */
  readonly moduleIds: readonly string[];
  /** Marks the phase as a milestone (heavier weight in the UI). */
  readonly milestone?: boolean;
}

export const PROGRAM: readonly JourneyPhase[] = [
  {
    id: 'p1',
    order: 1,
    title: 'الأساس — إنت شغّال فين',
    purpose: 'تفهم وزن غلطة واحدة قبل ما تلمس أي ملف.',
    dayStart: 1,
    dayEnd: 2,
    outcomes: [
      'تعرف دورك وحدوده — إيه من صلاحيتك وإيه لأ',
      'تفهم رحلة الملف الـ11 مرحلة عبر أربع أقسام',
      'تعرف الأخطاء اللي الإدارة بترفضها',
    ],
    moduleIds: ['m1'],
  },
  {
    id: 'p2',
    order: 2,
    title: 'المعاملات — قلب الشغل',
    purpose: 'تتقن الورق والقواعد: أكبر مرحلة، وأكتر حتة الأخطاء بتحصل فيها.',
    dayStart: 3,
    dayEnd: 23,
    outcomes: [
      'تراجع مستندات أي حالة تسجيل وتحكم: ينفع ولا لأ',
      'تحسب غرامة وجوب الضم صح من تاريخ إنشاء العضوية',
      'تنفّذ انفصال بحساب دقيق (الفصل · الغرامة · الضريبة)',
      'تتعامل مع التجديد والتجميد والإلغاء والترقية',
    ],
    moduleIds: ['m2_1', 'm2_2', 'm2_3', 'm2_4'],
    milestone: true,
  },
  {
    id: 'p3',
    order: 3,
    title: 'تمثيل وادي دجلة',
    purpose: 'تطبّق اللائحة وإنت بتمثّل النادي صح — من الموقف العادي للموقف الصعب.',
    dayStart: 24,
    dayEnd: 32,
    outcomes: [
      'تشرح أي قاعدة بحيث العضو يفهم بدل ما يحس إنه اترفض',
      'تراجع كامل وتطلب المستندات مرة واحدة',
      'ترفض من غير ما العضو يبقى خصم',
      'تهدّي موقف متوتر قبل ما تشرح',
      'تشخّص المشكلة الحقيقية وتقفل بخطوة',
      'تفضل محترف وإنت معاك حق والعضو بيضغط',
    ],
    moduleIds: ['m3'],
  },
  {
    id: 'p4',
    order: 4,
    title: 'الاستقلالية التدريجية',
    purpose: 'تنتقل من المشاهدة للعمل المستقل بأمان — مش فجأة، بأربع درجات.',
    dayStart: 33,
    dayEnd: 42,
    outcomes: [
      'Observation Plus (33-35): تراجع ملفات وتكتشف الأخطاء — من غير ما تكمّل معاملة',
      'ممارسة موجّهة (36-40): تشتغل والمدرب بيراجع',
      'تقييم مستقل (41-42): تشتغل لوحدك، المدرب ما يتدخلش إلا عند خطأ مؤثّر',
      'تعرف حدود صلاحيتك: الاستثناءات والإلغاء والموافقات المالية = تصعيد',
    ],
    moduleIds: ['m4'],
    milestone: true,
  },
  {
    id: 'p5',
    order: 5,
    title: 'الحالات المتقدمة والمحاكاة',
    purpose: 'تحكم في الحالة الرمادية — ده اللي بيفرّق موظف جديد عن خبرة 10 سنين.',
    dayStart: 43,
    dayEnd: 53,
    outcomes: [
      'تحكم في 20 حالة رمادية موثّقة من التشغيل الحقيقي',
      'تستخدم طريقة تفكير ثابتة: ارجع للقاعدة ورا الورقة',
      'تنهي أي حالة بقرار واحد من 4: اعتمد · ارفض · اطلب ورق · صعّد',
    ],
    moduleIds: ['m5'],
  },
  {
    id: 'p6',
    order: 6,
    title: 'تقييم الجاهزية المهنية',
    // Not a graduation and not a course — an assessment centre. It answers one
    // question, and refuses when the answer is not confidently yes.
    purpose: 'سؤال واحد: تقدر تمثّل وادي دجلة لوحدك بكرة الصبح؟',
    dayStart: 54,
    dayEnd: 60,
    outcomes: [
      'ست محطات — كل واحدة موقف تشغيلي حقيقي مش مادة',
      'الأدلة بتتجمع من الأداء: قرار · لائحة · خطر · توصيل',
      'اعتماد المدرب على الأداء الميداني',
      'اعتماد المدير — سلطة الجاهزية التشغيلية، وقرار منفصل',
      'الاتنين لازم يقولوا «جاهز» — توقيع واحد مش تأهيل',
    ],
    moduleIds: [],
    milestone: true,
  },
];

export const PROGRAM_DAYS = 60;

/** Everything the status derivation needs — passed in, so the domain stays pure. */
export interface PhaseContext {
  readonly isModuleApproved: (moduleId: string) => boolean;
  readonly isModuleWaiting: (moduleId: string) => boolean;
  readonly isModuleStarted: (moduleId: string) => boolean;
  readonly isModuleUnlocked: (moduleId: string) => boolean;
}

/**
 * A phase's status is DERIVED from its units — never stored. Order matters:
 * planned (no content) → completed → waiting → in progress → available → locked.
 */
export function phaseStatus(phase: JourneyPhase, ctx: PhaseContext): PhaseStatus {
  if (phase.moduleIds.length === 0) return 'planned';
  if (phase.moduleIds.every(ctx.isModuleApproved)) return 'completed';
  if (phase.moduleIds.some(ctx.isModuleWaiting)) return 'waiting_trainer';
  if (phase.moduleIds.some(ctx.isModuleStarted)) return 'in_progress';
  if (phase.moduleIds.some(ctx.isModuleUnlocked)) return 'available';
  return 'locked';
}

/** The one phase the trainee should act on now — the answer to "where am I?". */
export function currentPhase(ctx: PhaseContext): JourneyPhase | null {
  const active = PROGRAM.find(p => {
    const s = phaseStatus(p, ctx);
    return s === 'in_progress' || s === 'waiting_trainer' || s === 'available';
  });
  return active ?? null;
}

/** Program-level completion: approved units / all units that have content. */
export function programProgress(ctx: PhaseContext): number {
  const built = PROGRAM.flatMap(p => p.moduleIds);
  if (built.length === 0) return 0;
  return built.filter(ctx.isModuleApproved).length / built.length;
}

/** Days remaining, estimated from the furthest phase the trainee has reached. */
export function dayPosition(ctx: PhaseContext): { day: number; remaining: number } {
  const cur = currentPhase(ctx);
  const day = cur ? cur.dayStart : PROGRAM_DAYS;
  return { day, remaining: Math.max(0, PROGRAM_DAYS - day) };
}
