/**
 * PROFESSIONAL JUDGMENT BANK — the counter, not an exam.
 *
 * ── WHAT CHANGED, AND WHY ────────────────────────────────────────────────
 * The items used to open with the facts of a case. Facts are how an examiner
 * describes a situation; they are not how a situation ARRIVES. A real one
 * arrives as a TIME, a FLOOR, and a SENTENCE — 8:45pm, seven people waiting,
 * «طب بسرعة، أنا مستعجل». The learner has to be standing there before the
 * question means anything, because the whole point is what they do in the first
 * five seconds.
 *
 * ── THE PRINCIPLE EVERY ITEM IS BUILT ON ─────────────────────────────────
 * Not «إيه القرار الصح؟» but «إيه أول حاجة تعملها؟». A beginner very often
 * reaches the correct conclusion through an unsafe order — quotes a fee before
 * verifying the age it depends on, refuses before naming the broken condition,
 * reviews a document before checking whether the rule even asks for it. The
 * conclusion lands by luck; the workflow does not survive the next case.
 *
 * ── WHY EVERY ITEM EXPLAINS THE BEGINNER'S THINKING ──────────────────────
 * «لأن اللائحة بتقول كده» corrects an answer and teaches nothing. «المبتدئ
 * بيبدأ يحسب قبل ما يتأكد من السن» names the THINKING that produced it — and
 * that is the only part that transfers to a case nobody wrote.
 *
 * ── PRESSURE IS NEVER DECORATION ─────────────────────────────────────────
 * Every pressure source names the ONE behaviour it tests. A crying child that
 * tests nothing is drama — and drama teaches the learner to skim the setup.
 *
 * Every item is traceable: `policySource` names the confirmed rule, `reviewDate`
 * is when it must be re-checked. An item that outlives its rule teaches a
 * confident falsehood.
 */
import type { EvaluationDimension } from '../../domain/evaluation';

export type AssessmentType = 'learning_check' | 'retrieval' | 'certification';
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'judgment';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType =
  | 'first_action' | 'best_decision' | 'find_mistake' | 'next_step'
  | 'policy_application' | 'prioritization' | 'explain_why' | 'must_not_assume';
export type RiskTier = 'high' | 'medium' | 'low';

/** The situation as it arrives — before any facts of the case. */
export interface CounterMoment {
  /** A counter at 8:45pm is a different place than the same counter at 10am. */
  readonly time: string;
  /** What is going on around you while this happens. */
  readonly floor: string;
  /** The member's opening line, in their own words. */
  readonly opening: string;
}

/** One pressure source, and the single behaviour it exists to test. */
export interface Pressure {
  readonly source: string;
  readonly tests: string;
}

export interface JudgmentItem {
  readonly id: string;
  readonly moduleId: string;
  readonly lessonId?: string;
  readonly competency: EvaluationDimension;
  readonly objective: string;
  readonly assessmentType: AssessmentType;
  readonly bloom: BloomLevel;
  readonly difficulty: Difficulty;
  readonly riskTier: RiskTier;
  readonly scenarioCategory: string;
  readonly questionType: QuestionType;
  readonly policySource: string;
  readonly reviewDate: string;
  readonly version: number;
  readonly moment: CounterMoment;
  readonly pressure: Pressure;
  /** The facts — AFTER the learner is standing there. */
  readonly context?: string;
  readonly prompt: string;
  readonly options: readonly { readonly text: string; readonly correct: boolean; readonly why: string }[];
  /** The professional reasoning behind the right order. */
  readonly expertThinking: string;
  /** The THINKING mistake — never «لأن اللائحة بتقول». */
  readonly beginnerThinking: string;
  readonly misconception: string;
}

/**
 * COUNTER WISDOM — one sentence, after every five items.
 *
 * This is not policy and it is not a takeaway. Policy tells you what the club
 * decided; wisdom tells you what forty people learned the hard way standing at
 * that counter, and it stays true after every fee in the manual has changed.
 *
 * The risk: a line like this is one step from a motivational poster.
 * «اعمل شغلك بحب» is memorable, timeless, and changes nothing about the next
 * five seconds.
 *
 * The test every line must pass: **can the trainee ACT on it at the counter in
 * the next ten seconds?** «استعجال العضو بيغيّر سرعتك — مايغيّرش ترتيبك» passes:
 * it names a real force, a real temptation, and what to hold. Anything that only
 * makes you feel professional is philosophy, and it goes in the bin.
 *
 * One line. No explanation attached — an instinct you have to explain is not an
 * instinct yet.
 */
export interface CounterWisdom {
  readonly id: string;
  readonly afterItems: readonly string[];
  /** ONE sentence. Operational, timeless, never motivational. */
  readonly line: string;
}

/** A one-minute page after every five items. Not a summary — a pattern. */
export interface CounterMistakes {
  readonly id: string;
  readonly afterItems: readonly string[];
  readonly title: string;
  readonly mistake: string;
  readonly whyItHappens: string;
  readonly whatExpertsDo: string;
  readonly takeaway: string;
}

const REVIEW = '2026-10-17';

export const JUDGMENT_BANK_1: readonly JudgmentItem[] = [
  /* ══ 1 · SEPARATION — verify before you quote ═══════════════════════════ */
  {
    id: 'j-sep-01',
    moduleId: 'm2_3',
    lessonId: 'l3-tiers',
    competency: 'accuracy',
    objective: 'يتحقّق من السن قبل أي حساب — الشريحة كلها متعلّقة بيه.',
    assessmentType: 'certification',
    bloom: 'judgment',
    difficulty: 'medium',
    riskTier: 'high',
    scenarioCategory: 'ضغط وقت + معلومة ناقصة',
    questionType: 'first_action',
    policySource: 'شرائح الفصل بالسن — 25:0% · 26:50% · 27:100% · 28:200% · فوق 28: 10% من قيمة العضوية الحالية + 14% ضريبة على الـ10%.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: '8:45 مساءً — قبل القفل بربع ساعة.',
      floor: 'ورا الشباك سبع أعضاء مستنيين، والنظام أبطأ من المعتاد.',
      opening: '«طب بسرعة، أنا مستعجل. عايز أفصل ابني — هو حوالي 26 أو 27. المهم هو كام؟ قولّي الرقم وأنا هدفع دلوقتي».',
    },
    pressure: { source: 'طابور + قرب القفل', tests: 'هتتحقّق من المعلومة اللي الحساب كله واقف عليها، ولا هتسرّع؟' },
    prompt: 'أول حاجة تعملها؟',
    options: [
      {
        text: 'تقوله الشريحتين: «لو 26 يبقى 3250، ولو 27 يبقى 6500» — وهو يقول إنهي واحدة.',
        correct: false,
        why: 'بتحوّل قرار النادي لاختيار العضو. والرقمين قدّامه معناهم ضغط عليك تاخد الأقل — ده مش قرار، ده تفاوض.',
      },
      {
        text: 'تفتح البطاقة وتتحقّق من السن بالظبط، وبعدين تحسب.',
        correct: true,
        why: 'الشريحة كلها متعلّقة بالسن. أي رقم بيتقال قبل التحقق ده تخمين — والتخمين في الفلوس بيرجع شكوى.',
      },
      {
        text: 'تحسب على 26 عشان تسرّع، ولو طلع 27 تعدّل بعدين.',
        correct: false,
        why: 'رقم اتقال بقى وعد. التعديل لفوق بعدين بيتسمع تراجع — «إنت قلت 3250».',
      },
      {
        text: 'تقوله يجيب شهادة ميلاد الابن عشان تتأكد من السن.',
        correct: false,
        why: 'طلب زيادة — السن على البطاقة اللي في الملف قدّامك. ده بيرجّع العضو لغير لزوم.',
      },
    ],
    expertThinking:
      'المحترف بيسأل نفسه: **الحساب ده واقف على إيه؟** الإجابة: السن. ' +
      'فبيروح للسن الأول — 10 ثواني — قبل أي كلام عن فلوس. ' +
      '26 يعني 3250، و27 يعني 6500. **الضعف.** الفرق ده مش تفصيلة تتظبط بعدين.',
    beginnerThinking:
      '**المبتدئ بيبدأ يحسب قبل ما يتأكد من المُدخل** — لأن العضو سأل عن رقم، فحس إن شغله يجاوب. ' +
      'والاستعجال بيقنعه إن التحقق «تعطيل». وهو مش بيغلط في الشريحة — **بيغلط في إنه اتكلم قبل ما يشوف**.',
    misconception: 'إن السرعة خدمة. **السرعة اللي بتسبق التحقق مش خدمة — دي مخاطرة بفلوس العضو وبسمعتك.**',
  },

  /* ══ 2 · SEPARATION — the self-consistent wrong number ══════════════════ */
  {
    id: 'j-sep-02',
    moduleId: 'm2_3',
    lessonId: 'l2-vat-base',
    competency: 'accuracy',
    objective: 'يكتشف الخطأ في ترتيب الحساب — الضريبة بتتشال قبل الشريحة.',
    assessmentType: 'retrieval',
    bloom: 'analyze',
    difficulty: 'medium',
    riskTier: 'high',
    scenarioCategory: 'اكتشاف خطأ زميل + العضو مستني',
    questionType: 'find_mistake',
    policySource: 'رسم الفصل 7410 شامل الضريبة ← يتشال 14% ← الأساس 6500 ← الشريحة عليه. غرامة التأخير نفسها مش بتتضرّب.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: '11:20 صباحًا.',
      floor: 'الشباك التاني قافل، فكل الناس عندك. زميلك سلّمك الملف وقام يرد على التليفون.',
      opening: '«أنا مستني من ساعة وربع. أوقّع فين؟»',
    },
    pressure: { source: 'العضو مستني + زميلك مش موجود يسأله', tests: 'هتعتمد حساب حد تاني تحت الضغط، ولا هتراجعه؟' },
    context: 'في الورقة: ابن 27 سنة. زميلك كاتب: «7410 × 100% = 7410 جنيه».',
    prompt: 'إيه أول حاجة تعملها؟',
    options: [
      {
        text: 'توقّع — الشريحة 100% صح لابن 27، والرقم متسق.',
        correct: false,
        why: 'الشريحة صح والأساس غلط. الاعتماد بيحوّل غلط زميلك لغلط باسمك — والملف بيرجع من الأرشيف بعد شهور بتوقيعك.',
      },
      {
        text: 'تراجع الأساس: 7410 شامل ضريبة، فلازم تتشال الأول (7410 ÷ 1.14 = 6500) — والشريحة بتتحسب على 6500.',
        correct: true,
        why: 'الترتيب هو الغلط مش النسبة. الشريحة بتتطبّق على الصافي — فالصح 6500 مش 7410، وفرق 910 جنيه على العضو.',
      },
      {
        text: 'تضيف 14% على الناتج عشان الغرامة تتضرّب زي أي رسم.',
        correct: false,
        why: 'غلط مزدوج: الضريبة اتحسبت مرتين، والغرامة أصلاً مش بتتضرّب.',
      },
      {
        text: 'تستنى زميلك يخلّص تليفون وتسأله — هو أدرى بالحالة.',
        correct: false,
        why: 'المراجعة مش مجاملة. ولو الرقم غلط، مين حسبه مش هيغيّر إنه غلط — والعضو بيدفع 910 زيادة.',
      },
    ],
    expertThinking:
      'المحترف بيبص على **الرقم اللي اتضرب فيه**، مش على النسبة. ' +
      '7410 رسم **شامل الضريبة**، والشريحة بتتطبّق على **الصافي**. ' +
      'وأخطر حاجة في الورقة دي إنها **متسقة مع نفسها**: الحسبة سليمة والمدخل غلط.',
    beginnerThinking:
      '**المبتدئ بيراجع العملية الحسابية ومبيراجعش المُدخل.** بيشوف 27 → 100% ✓، والضرب صح ✓، فبيوقّع. ' +
      'هو مش مستعجل — **هو بيدوّر على غلط في الحساب، والغلط في اللي قبل الحساب**.',
    misconception: 'إن الرقم المتسق مع نفسه رقم صح. **7410 رسم — والأساس اللي بتتحسب عليه الشريحة حاجة تانية.**',
  },

  /* ══ 3 · SEPARATION — the ladder that stops ═════════════════════════════ */
  {
    id: 'j-sep-03',
    moduleId: 'm2_3',
    lessonId: 'l3-tiers',
    competency: 'ruleCompliance',
    objective: 'يفرّق بين الشريحة الثابتة والحالة اللي محتاجة قيمة يدوية.',
    assessmentType: 'certification',
    bloom: 'apply',
    difficulty: 'hard',
    riskTier: 'high',
    scenarioCategory: 'مستندات متعددة — واحدة بس هي المهمة',
    questionType: 'must_not_assume',
    policySource: 'فوق 28 سنة: 10% من قيمة العضوية الحالية + 14% ضريبة على الـ10% — القيمة الحالية بتتدخّل يدويًا من الموظف.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: '1:10 ظهرًا.',
      floor: 'هادي نسبيًا. مدير الفرع بيمرّ ورا الشبابيك بيتكلم مع حد.',
      opening: '«ابني 31 سنة وعايز أفصله. أنا جايب كل الورق أهو — شوف إنت عايز إيه».',
    },
    pressure: { source: 'المدير بيمرّ + ملف مليان مستندات رسمية', tests: 'هتختار المستند اللي القاعدة طالباه، ولا اللي أسهل تلاقيه؟' },
    context: 'في الملف: عقد العضوية الأصلي بقيمته وقت الشراء · إيصال آخر تجديد · خطاب من الأب بيقول «القيمة وقتها كانت كذا».',
    prompt: 'إيه اللي لازم تتحقّق منه قبل أي حساب؟',
    options: [
      {
        text: 'قيمة العقد الأصلي — دي القيمة الرسمية الموثّقة في الملف.',
        correct: false,
        why: 'العقد بيقول قيمة وقت الشراء. القاعدة بتقول القيمة **الحالية** — والاتنين ممكن يبقوا مختلفين بمراحل.',
      },
      {
        text: 'قيمة العضوية **الحالية** المعتمدة — دي المدخل الوحيد، والباقي مش داخل الحساب.',
        correct: true,
        why: 'فوق 28 مفيش شريحة ثابتة أصلاً: الحساب 10% من القيمة الحالية + ضريبة على الـ10%.',
      },
      {
        text: 'تحسب 200% × 6500 زي شريحة الـ28 — هو أكبر منها فالشريحة الأعلى بتنطبق.',
        correct: false,
        why: 'الأخطر في القايمة. فوق 28 **مش امتداد للجدول** — ده حساب مختلف على أساس مختلف تمامًا.',
      },
      {
        text: 'خطاب الأب — هو صاحب العضوية وأدرى بقيمتها.',
        correct: false,
        why: 'إقرار مش مستند. القيمة المعتمدة بتتاخد من النادي مش من العضو.',
      },
    ],
    expertThinking:
      'المحترف بيسأل: **الحالة دي في الجدول أصلاً؟** لأ — فوق 28 **بيخرج من الجدول خالص**. ' +
      'فمش بيدوّر على شريحة، بيدوّر على **القيمة الحالية**. ' +
      'والملف المليان بيبقى مصدر تشتيت مش مصدر معلومة: **تلات أوراق رسمية، وولا واحدة فيهم هي المطلوبة**.',
    beginnerThinking:
      '**المبتدئ بيمدّ النمط.** شاف 26→50، 27→100، 28→200، فدماغه بتكمّل: 31 لازم أعلى. ' +
      'ده **استنتاج منطقي تمامًا** — وغلط تمامًا، لأنه بيفترض إن القاعدة بتكمل بنفس الشكل. ' +
      'والمبتدئ التاني بياخد أول رقم رسمي شايفه (العقد) لأنه موثّق ومكتوب — **من غير ما يسأل: موثّق لإيه؟**',
    misconception: 'إن الشرائح بتكمل بنفس النمط لفوق. **بتقف عند 28** — وبعدها القاعدة بتتغيّر لأساس تاني.',
  },

  /* ══ 4 · SISTER — the comparison ════════════════════════════════════════ */
  {
    id: 'j-sis-01',
    moduleId: 'm2_2',
    lessonId: 'l4-sister',
    competency: 'ruleCompliance',
    objective: 'يراجع الشروط الأربعة قبل أي رد — مش بعد ما يرفض.',
    assessmentType: 'certification',
    bloom: 'judgment',
    difficulty: 'medium',
    riskTier: 'high',
    scenarioCategory: 'مقارنة بفرع تاني + عضو تاني بيسمع',
    questionType: 'first_action',
    policySource: 'شروط ضم الأخت الأربعة إلزامية كلها: الوالد متوفى أو فوق سن المعاش (60) · نفس العنوان · مش متجوزة · مش بتشتغل. سقوط شرط = رفض.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: '12:30 ظهرًا.',
      floor: 'عضو تاني واقف وراه على بعد خطوة وسامع كل حاجة.',
      opening: '«عايز أضم أختي. و**ما المكتب التاني عملها** لواحد صاحبي الشهر اللي فات — فمتقولّيش ماينفعش».',
    },
    pressure: { source: 'عضو تاني بيسمع + مقارنة بفرع تاني', tests: 'هتدافع عن النادي، ولا هتشتغل بالشروط؟' },
    prompt: 'أول حاجة تعملها؟',
    options: [
      {
        text: 'تطمّنه إنك هتشوف الموضوع وتراجع مع المكتب التاني إيه اللي حصل هناك.',
        correct: false,
        why: 'بتربط قراره بحالة إنت مش شايفها، وبتوعد بمراجعة مش من شغلك. والوعد بيتحوّل دين.',
      },
      {
        text: 'تراجع الشروط الأربعة على حالة أخته هو **قبل** ما تقول أي نتيجة.',
        correct: true,
        why: 'الحالة اللي قدّامك هي الحالة الوحيدة. الشروط قبل النتيجة بتخلّي أي رد بعدين **حسبة مش مزاج**.',
      },
      {
        text: 'توضّحله إن كل حالة ليها ظروفها وإن المكتب التاني ممكن يكون طبّق غلط.',
        correct: false,
        why: '«كل حالة ليها ظروفها» بتأكّد شكّه إن الموضوع مزاج. واتهام مكتب تاني ممنوع — والعضو اللي وراه سامع.',
      },
      {
        text: 'تسأله عن تفاصيل حالة أخت صاحبه عشان تفهم الفرق وتشرحهوله.',
        correct: false,
        why: 'بتنقل الحوار لحالة مش في ملفك، وبتديله شرعية للمقارنة.',
      },
    ],
    expertThinking:
      'المحترف بيسمع الجملة دي على حقيقتها: **مش هجوم — دي محاولة يتأكد إن القاعدة واحدة**. ' +
      'فبيرد عليها بأقوى حاجة ممكنة: **إنه يشتغل بالشروط قدّامه**. ' +
      'ولما الأربعة يتقالوا الأول، أي نتيجة بعدها بتبقى **حسبة** — والعضو اللي وراه بيسمع قاعدة، مش دفاع.',
    beginnerThinking:
      '**المبتدئ بيسمع «المكتب التاني» فيحس إنه متهم، فبيدخل وضع دفاع.** ' +
      'والدفاع بياخد شكلين: يهاجم المكتب التاني، أو يقول «كل حالة ليها ظروفها» — ' +
      '**والاتنين بيثبتوا للعضو إن الموضوع مزاج موظف**. ' +
      'هو بيحاول يكسب نقاش، **والنقاش مش موجود أصلاً**.',
    misconception: 'إن اللي بيقارن خصم لازم تكسبه. **هو بيتأكد إنه مش مظلوم — والشروط بترد على ده أحسن من أي جملة.**',
  },

  /* ══ 5 · SISTER — convincing, and irrelevant ════════════════════════════ */
  {
    id: 'j-sis-02',
    moduleId: 'm2_2',
    lessonId: 'l4-sister',
    competency: 'problemSolving',
    objective: 'يقاوم المعلومة المؤثّرة عاطفيًا لكن غير المتعلّقة باللائحة.',
    assessmentType: 'certification',
    bloom: 'judgment',
    difficulty: 'hard',
    riskTier: 'high',
    scenarioCategory: 'ضغط عاطفي بلا ضغط تشغيلي',
    questionType: 'must_not_assume',
    policySource: 'شروط الأخت الأربعة إلزامية كلها — سقوط شرط واحد = رفض. مفيش أوزان ومفيش أغلبية.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: '10:15 صباحًا.',
      floor: 'الكاونتر فاضي. مفيش أي استعجال — الوقت كله معاك.',
      opening: '«**أنا مش بطلب حاجة خاصة.** أنا بس عايز أعرف إيه المطلوب».',
    },
    pressure: { source: 'مفيش ضغط تشغيلي خالص — الضغط إنساني بس', tests: 'من غير طابور ولا صوت عالي، هتفرّق بين المؤثّر والمتعلّق؟' },
    context:
      'بيكمّل بهدوء: «أختي والدنا متوفى من سنتين، وساكنة معايا في نفس الشقة، ومش متجوزة، ' +
      'وهي اللي بتصرف على البيت كله من شغلها في مدرسة خاصة — أنا مش قادر أوفّرلها حاجة غير ده».',
    prompt: 'إيه اللي بيحسم القرار هنا؟',
    options: [
      {
        text: 'إنها بتصرف على الأسرة — ده بيدّي الحالة أولوية إنسانية تستاهل إنك تعرضها على الإدارة.',
        correct: false,
        why: 'مقنعة إنسانيًا ومش متعلقة باللائحة. ولو عرضتها على الأساس ده، بتديله أمل مالوش سند — وهيرجع أغضب.',
      },
      {
        text: 'إنها **بتشتغل** — الشرط الرابع ساقط، والأربعة إلزاميين مع بعض.',
        correct: true,
        why: 'تلات شروط متحققين وواحد ساقط = رفض. مفيش نظام نقاط — إلزامي معناه إلزامي.',
      },
      {
        text: 'تلاتة من أربعة متحققين — الأغلبية تكفي مع اعتبار الظروف.',
        correct: false,
        why: 'أخطر إجابة. «معظم الشروط» **مش قاعدة** — دي بتحوّل اللائحة لتقدير شخصي.',
      },
      {
        text: 'الوالد متوفى — ده أهم شرط والباقي تفاصيل مساعدة.',
        correct: false,
        why: 'ترتيب مخترع — الشروط الأربعة **مالهمش أوزان ولا ترتيب أهمية**. والمبتدئ بيعمل الترتيب ده لأن الوفاة أثقل إنسانيًا، فبيفترض إنها أثقل لائحيًا.',
      },
    ],
    expertThinking:
      'المحترف بيعمل حاجة واحدة: **بيمرّ على الأربعة واحد واحد**. ' +
      'الوفاة ✓ · العنوان ✓ · مش متجوزة ✓ · **بتشتغل ✗**. النتيجة: رفض. ' +
      'والجملة اللي عن مصروف البيت؟ **بيسمعها وبيقدّرها ومبيبنيش عليها** — ' +
      'لأنها بتوصف صعوبة الظرف مش تحقّق الشرط. **التعاطف بيتقال، والقاعدة بتتطبّق، والاتنين ينفع مع بعض.**',
    beginnerThinking:
      '**المبتدئ بيوزن الشروط بدل ما يعدّها.** بيشوف تلاتة متحققين وواحد لأ، فدماغه بتقول «قريّبة أوي». ' +
      'وبعدين الجملة الإنسانية بتقفل عليه: بيبقى عايز يساعد، ومش لاقي طريق جوّه اللائحة، **فبيخترع واحد** — ' +
      'اسمه «أعرضها على الإدارة». ' +
      '🔴 وده مش لطف: **ده تأجيل الرفض وتحميله لحد تاني**، والعضو بيستنى أسبوع عشان يسمع نفس الجواب.',
    misconception: 'إن الظروف الصعبة بتخلق مساحة. **بتخلق تعاطف — مش استثناء.**',
  },

  /* ══ 6 · STUDENT DOC — refusal without an alternative ═══════════════════ */
  {
    id: 'j-doc-01',
    moduleId: 'm2_2',
    lessonId: 'l2-children',
    competency: 'docReview',
    objective: 'يعرف المستند البديل المقبول — الرفض بلا بديل مش قرار.',
    assessmentType: 'certification',
    bloom: 'apply',
    difficulty: 'medium',
    riskTier: 'high',
    scenarioCategory: 'مستند مرفوض + عضو استثمر وقت',
    questionType: 'next_step',
    policySource:
      'كارنيه الطالب مش بيتعد بيه من 1 يوليو (السنة الدراسية خلصت). البديل المقبول: برنت تأميني حديث مختوم بالنسر ' +
      'بواحدة من التلات صيغ: غير مؤمن عليه حالياً / مستفيد / معاش مبكر.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: 'أول أغسطس، 2:40 ظهرًا.',
      floor: 'الطابور طويل من الصبح والتكييف واقف.',
      opening: '«أنا **ضيّعت ساعة** في الطابور. الكارنيه ساري أهو، مكتوب عليه التاريخ — إيه المشكلة؟»',
    },
    pressure: { source: 'العضو استثمر ساعة + الورقة شكلها سليمة', tests: 'هترفض وتقف، ولا هترفض وتدّي طريق؟' },
    context: 'الابن 23 سنة. الكارنيه جامعي وساري لحد آخر السنة الدراسية الجاية.',
    prompt: 'إيه أول حاجة تقولها؟',
    options: [
      {
        text: '«الكارنيه مش بيتعد بيه من 1 يوليو» — وتستنى لو سأل عن البديل.',
        correct: false,
        why: 'صح ومقطوع. **الرفض بلا بديل مش قرار — ده وقفة.** وبعد ساعة انتظار، دي بتتحوّل شكوى.',
      },
      {
        text: 'تقبله — التاريخ اللي عليه ساري فعلاً، والقاعدة معمولة للكارنيهات المنتهية.',
        correct: false,
        why: 'القاعدة مش عن تاريخ الكارنيه — دي عن إن **السنة الدراسية خلصت**، فالكارنيه مبقاش بيثبت إنه لسه طالب.',
      },
      {
        text: 'من 1 يوليو الكارنيه مش بيتعد بيه لأن السنة الدراسية خلصت — **والبديل برنت تأميني حديث مختوم بالنسر**.',
        correct: true,
        why: 'بتقول **ليه** (فالقاعدة منطقية مش تعنّت) وبتدّي **الخطوة** — فالعضو بيمشي عارف يعمل إيه.',
      },
      {
        text: 'تقبله مؤقتًا وتطلب البرنت لما ييجي — الراجل تعب والحالة واضحة.',
        correct: false,
        why: 'الملف بيتقفل ناقص **باسمك** وبيرجع من الأرشيف بعد شهور. والقبول المؤقت مش موجود في اللائحة.',
      },
    ],
    expertThinking:
      'المحترف عارف إن **الرفض نص الشغل بس**. وبيرتّب: **السبب ← البديل**. ' +
      'السبب بيخلّي القاعدة مفهومة (مش تاريخ الورقة — السنة الدراسية خلصت)، ' +
      'والبديل بيخلّي العضو يمشي **بخطوة بدل شكوى**. ' +
      'الساعة اللي ضيّعها مش بتغيّر القرار — **بتخلّي الرد لازم يكون كامل من أول مرة**.',
    beginnerThinking:
      '**المبتدئ فاكر إن شغله يقول أيوه أو لأ.** فبيقول «لأ» ويسكت. ' +
      'وفي دماغه ده حياد — «أنا بطبّق». **وفي دماغ العضو ده باب اتقفل بعد ساعة انتظار**. ' +
      'والمبتدئ التاني بيتعاطف مع التعب فيقبل مؤقتًا — **وبيحوّل تعاطف لحظة لملف ناقص باسمه**.',
    misconception: 'إن تاريخ السريان هو المعيار. **المعيار إن الورقة تثبت الحالة النهارده.**',
  },

  /* ══ 7 · PRINT FORMAT — the over-refusal ═══════════════════════════════ */
  {
    id: 'j-doc-02',
    moduleId: 'm2_2',
    lessonId: 'l3-affiliates',
    competency: 'docReview',
    objective: 'يقبل كل الصيغ المعتمدة — الرفض لصيغة مش متعوّد عليها طلب زيادة.',
    assessmentType: 'retrieval',
    bloom: 'apply',
    difficulty: 'easy',
    riskTier: 'high',
    scenarioCategory: 'مستند صحيح بصيغة غير متوقعة',
    questionType: 'best_decision',
    policySource: 'برنت تأميني حديث مختوم بالنسر — التلات صيغ مقبولة: غير مؤمن عليه حالياً / مستفيد / معاش مبكر.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: '9:30 صباحًا.',
      floor: 'أول ساعة في اليوم، الكاونتر لسه فاضي.',
      opening: '«أهو البرنت اللي طلبتوه. أنا رحت التأمينات إمبارح مخصوص».',
    },
    pressure: { source: 'مفيش ضغط — بس الصيغة مش اللي متعوّد عليها', tests: 'هتحكم على اللي الورقة بتثبته، ولا على شكلها؟' },
    context: 'الأب 57 سنة. البرنت حديث ومختوم بالنسر، ومكتوب فيه: «**معاش مبكر**». إنت متعوّد تشوف «غير مؤمن عليه حالياً».',
    prompt: 'تعمل إيه؟',
    options: [
      {
        text: 'تقبله — «معاش مبكر» واحدة من التلات صيغ المعتمدة، والختم والتاريخ سليمين.',
        correct: true,
        why: 'التلاتة (غير مؤمن عليه حالياً · مستفيد · معاش مبكر) **بيثبتوا نفس الحاجة**: مش بيشتغل دلوقتي.',
      },
      {
        text: 'ترفضه وتطلب برنت مكتوب فيه «غير مؤمن عليه حالياً».',
        correct: false,
        why: 'رفض لمستند صحيح. **بترجّع العضو عشان صيغة إنت مش متعوّد عليها** — ودي شكوى من صنعك، وهو راح التأمينات مخصوص.',
      },
      {
        text: 'تقبله بس تكتب ملاحظة إنه صيغة غير معتادة تحسبًا.',
        correct: false,
        why: 'الملاحظة بتشكّك في مستند سليم، وبتخلق مراجعة لحد بعدك بلا سبب.',
      },
      {
        text: 'تسأله يجيب خطاب توضيحي من التأمينات.',
        correct: false,
        why: 'طلب زيادة على مستند مكتمل — تكلفته زيارة كاملة تانية.',
      },
    ],
    expertThinking:
      'المحترف بيسأل: **الورقة دي بتثبت إيه؟** — إنه مش بيشتغل دلوقتي. ' +
      'والتلات صيغ كلهم بيقولوا كده. **فالصيغة مش المعيار، اللي بتثبته هو المعيار.**',
    beginnerThinking:
      '**المبتدئ بيقارن الورقة باللي شافه قبل كده، مش باللي القاعدة طالباه.** ' +
      'وفي دماغه ده تدقيق — **وهو في الحقيقة طلب زيادة**، وتكلفته بتتدفع عند العضو.',
    misconception: 'إن اللي مش شوفته قبل كده مشكوك فيه. **المعتاد مش هو المعتمد.**',
  },

  /* ══ 8 · RETIREMENT — the review nobody asked for ══════════════════════ */
  {
    id: 'j-ret-01',
    moduleId: 'm2_2',
    lessonId: 'l3-affiliates',
    competency: 'docReview',
    objective: 'يتحقّق من السن قبل ما يطلب أو يراجع أي مستند — فوق 60 مفيش برنت أصلاً.',
    assessmentType: 'certification',
    bloom: 'judgment',
    difficulty: 'hard',
    riskTier: 'high',
    scenarioCategory: 'ورقة زيادة في الملف',
    questionType: 'first_action',
    policySource: 'بعد سن المعاش (60) مفيش برنت تأميني مطلوب للأب ولا للأم. تحت 60: برنت حديث بختم النسر. الست: + شهادة ميلاد الابن للقرابة.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: '3:00 عصرًا.',
      floor: 'طفل بيعيّط جنب الكاونتر والأم بتحاول تهدّيه وتتكلم معاك في نفس الوقت.',
      opening: '«جبت كل حاجة — صاحبتي قالتلي هيطلبوا البرنت أكيد فجبته معايا».',
    },
    pressure: { source: 'طفل بيعيّط + ورقة زيادة اتقدّمت باقتناع', tests: 'هتراجع اللي اتحطّ قدّامك، ولا هتحدّد المطلوب الأول؟' },
    context: 'عضوة جاية تضم والدتها. معاها: بطاقة الوالدة · شهادة ميلاد العضوة · **وبرنت تأميني** جابته احتياطي.',
    prompt: 'أول حاجة تعملها؟',
    options: [
      {
        text: 'تراجع البرنت وتتأكد إنه حديث ومختوم — طالما جابته يبقى نستخدمه.',
        correct: false,
        why: 'بتراجع ورقة يمكن مش مطلوبة أصلاً. **ولو طلعت ناقصة، هترجّعها عشان حاجة القاعدة مش طالباها.**',
      },
      {
        text: 'تبص على سن الوالدة في البطاقة الأول — السن هو اللي بيحدّد المطلوب.',
        correct: true,
        why: 'فوق 60 → **مفيش برنت خالص** (سن المعاش)، والمطلوب بطاقة + شهادة ميلاد للقرابة بس. تحت 60 → البرنت مطلوب. **السن بيحسم القايمة كلها.**',
      },
      {
        text: 'تاخد التلات ورق وتكمّل — الملف كامل ومفيش داعي تعقّد.',
        correct: false,
        why: 'بتعتمد ورقة زيادة. **الملف المليان مش ملف صح** — وبتأكّد للعضوة إن نصيحة صاحبتها كانت صح.',
      },
      {
        text: 'تقولها إن البرنت مش مطلوب وتديهولها.',
        correct: false,
        why: 'استنتاج قبل التحقق. **إنت لسه مشوفتش سن الوالدة** — ولو تحت 60 يبقى رجّعت ورقة مطلوبة.',
      },
    ],
    expertThinking:
      'المحترف **بيحدّد القايمة قبل ما يراجع أي حاجة**. السن مش تفصيلة — ده اللي بيحدّد المطلوب من أساسه: ' +
      'فوق 60 مفيش برنت، تحت 60 البرنت مطلوب. ' +
      '**وبيقاوم إغراء إنه يراجع اللي قدّامه** لمجرد إنه قدّامه.',
    beginnerThinking:
      '**المبتدئ بيراجع اللي اتحطّ قدّامه، مش اللي القاعدة طالباه.** الورقة موجودة، فبيبص عليها. ' +
      'ده مسار طبيعي جدًا — **وبيخلق أسوأ نتيجة ممكنة**: يرجّع العضوة عشان نقص في مستند مش مطلوب أصلاً. ' +
      'والطفل اللي بيعيّط بيسرّع كل ده: **دماغه عايزة تخلّص، والمراجعة السريعة بتبدأ من أول ورقة مش من القاعدة**.',
    misconception: 'إن كل ورقة في الملف لازم تتراجع. **السن بيحدّد المطلوب الأول — وبعدين تراجع المطلوب بس.**',
  },

  /* ══ 9 · MANDATORY JOINING — reason before number ══════════════════════ */
  {
    id: 'j-join-01',
    moduleId: 'm2_2',
    lessonId: 'l2-children',
    competency: 'ruleCompliance',
    objective: 'يرتّب: السبب قبل الرقم — الرقم بلا سياق بيتسمع عقوبة.',
    assessmentType: 'certification',
    bloom: 'judgment',
    difficulty: 'easy',
    riskTier: 'high',
    scenarioCategory: 'عضو قديم + مفاجأة مالية',
    questionType: 'prioritization',
    policySource: 'غرامة وجوب الضم بتتحسب من تاريخ إنشاء العضوية. المثال المعتمد: 1342 جنيه.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: '5:20 مساءً.',
      floor: 'الكاونتر متوسط الزحمة. الراجل واقف مرتاح ومبتسم.',
      opening: '«**أنا عضو من زمان** — بقالي 8 سنين هنا. بضم ابني عادي، إيه الإجراءات؟»',
    },
    pressure: { source: 'العضو متوقّع إجراء بسيط ومفيش أي توتر', tests: 'هتقول الرقم لما الجو مريح، ولا هترتّب برضه؟' },
    context: 'الابن 12 سنة. حسبت غرامة وجوب الضم: 1342 جنيه. لسه ماقلتش حاجة.',
    prompt: 'أول حاجة تقولها؟',
    options: [
      {
        text: '«الرسوم 1342 جنيه» — تقول الرقم وتشرح لو سأل.',
        correct: false,
        why: 'الرقم بلا سياق **بيتسمع عقوبة**. وهو مش هيسأل — هيزعل الأول، وساعتها الشرح بينزل على ودن مقفولة.',
      },
      {
        text: 'إن فيه غرامة وجوب ضم بتتحسب من تاريخ إنشاء العضوية — **وبعدين** الرقم.',
        correct: true,
        why: '**السبب قبل الرقم.** نفس الرقم بسياق بيتسمع قاعدة، وبلا سياق بيتسمع عقوبة.',
      },
      {
        text: 'تسأله الأول إذا كان يعرف بالغرامة دي ولا لأ.',
        correct: false,
        why: 'بتحمّله مسؤولية إنه ما اتبلّغش. ولو قال «لأ»، بقيت في موقف دفاع من غير ما تكون قلت حاجة.',
      },
      {
        text: 'تقوله إن مدة عضويته الطويلة هي اللي كبّرت الرقم.',
        correct: false,
        why: 'صح حسابيًا و**كارثة توصيلاً**: بتقوله إن **ولاؤه هو سبب الغرامة**.',
      },
    ],
    expertThinking:
      'المحترف عارف إن **المفاجأة هي المشكلة مش الرقم**. ' +
      'فبيدّي السياق الأول: فيه غرامة، وبتتحسب من تاريخ إنشاء العضوية — **وبعدين** الرقم. ' +
      'الجو المريح مش سبب إنه يتسرّع: **الترتيب مش رد فعل على التوتر، ده الطريقة**.',
    beginnerThinking:
      '**المبتدئ بيفتكر إن السياق ليه لزمة لما العضو يزعل.** والجو هنا مريح، فبيروح للرقم على طول. ' +
      'وهو بيعمل كده باحترام — **بيحترم وقته**. بس ده بالظبط اللي بيخلق الزعل اللي هو مستعد له. ' +
      '🔴 والخيار الأخير أخطر: **بيدوّر على سبب مقنع فيلاقي أصدق سبب — ومش واخد باله إنه بيلوم العضو على ولاؤه**.',
    misconception: 'إن المباشرة احترام لوقت العضو. **المباشرة اللي بتسبق السبب مش وضوح — دي مفاجأة.**',
  },

  /* ══ 10 · FREEZE — compound social pressure ════════════════════════════ */
  {
    id: 'j-frz-01',
    moduleId: 'm2_4',
    lessonId: 'l-freeze',
    competency: 'ruleCompliance',
    objective: 'يقاوم الوعد بالاستثناء ويقفل ببديل حقيقي جوّه اللائحة.',
    assessmentType: 'certification',
    bloom: 'judgment',
    difficulty: 'medium',
    riskTier: 'high',
    scenarioCategory: 'ضغط اجتماعي من زميل + طلب استثناء',
    questionType: 'best_decision',
    policySource: 'نافذة التجميد: 1 يناير → 31 مارس.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: 'مايو، 6:00 مساءً.',
      floor: 'زميلك بيمرّ ويقول قدّام العضو: «ده الأستاذ فلان، عضو من زمان — شوفله حاجة».',
      opening: '«**طب استثناء المرة دي**. أنا مسافر شغل 6 شهور، ومش هستخدم النادي ولا يوم».',
    },
    pressure: { source: 'زميل بيضغط قدّام العضو', tests: 'هيتغيّر القرار عشان حد وقف جنبك وقال؟' },
    prompt: 'تعمل إيه؟',
    options: [
      {
        text: 'تقوله «هشوف أعملك إيه» وتراجع مع المدير بعدين.',
        correct: false,
        why: '«هشوف» **وعد**. ولما ترجع بلا نتيجة، هيرجع أغضب — **وزميلك اللي بعدك هو اللي هيدفع**.',
      },
      {
        text: 'توضّح إن النافذة 1 يناير → 31 مارس ومقفولة دلوقتي، وتشرح إزاي يستفيد منها السنة الجاية — **بلا وعد بنتيجة**.',
        correct: true,
        why: 'النافذة **تاريخ مش تفاوض**. والبديل الحقيقي جوّه اللائحة بيغني عن الوعد الوهمي.',
      },
      {
        text: 'تجمّدها استثناءً — العضو قديم وزميلك أكّد والحالة مبررة.',
        correct: false,
        why: 'ضغط اجتماعي مش سند. **القرار مبيتغيّرش لأن حد وقف جنبك وقاله.**',
      },
      {
        text: 'تقوله يقدّم طلب رسمي للإدارة وهما هيوافقوا غالبًا.',
        correct: false,
        why: '«**غالبًا**» هي الوعد. عرض الحالة تمام — التلميح بالنتيجة ممنوع.',
      },
    ],
    expertThinking:
      'المحترف بيفرّق بين **العرض والوعد**: العرض التزام بإجراء؛ الوعد التزام بنتيجة. ' +
      'وبيعرف إن التاريخ **مش من صلاحيته أصلاً** — فمفيش حاجة يتفاوض عليها. ' +
      'وبيقفل ببديل حقيقي (السنة الجاية) — **فالعضو بيمشي بطريق، مش بأمل**.',
    beginnerThinking:
      '**المبتدئ بيتنازل مش عن اقتناع — عن إحراج.** زميله وقف قدّام العضو وقال «شوفله حاجة»، ' +
      'فبقى الرفض شكله إنه بيحرج زميله. ' +
      'فبيلجأ لأنعم حاجة يقدر يقولها: «هشوف» — **وهو فاكر إنها كسب وقت، وهي وعد بصيغة غامضة**. ' +
      'والعضو بيسمعها **موافقة مؤجلة**.',
    misconception: 'إن «هشوف» جملة مهذبة بتكسب وقت. **دي وعد — والعضو بيسمعها موافقة.**',
  },

  /* ══ 11 · CANCELLATION — right information, wrong moment ═══════════════ */
  {
    id: 'j-cnc-01',
    moduleId: 'm2_4',
    lessonId: 'l-cancellation',
    competency: 'problemSolving',
    objective: 'يشخّص المشكلة الحقيقية قبل ما يرد على الشكوى الظاهرة.',
    assessmentType: 'certification',
    bloom: 'analyze',
    difficulty: 'hard',
    riskTier: 'high',
    scenarioCategory: 'عضو غاضب + معلومة غلط بيرددها بثقة',
    questionType: 'first_action',
    policySource: 'مهلة الإلغاء 30 يوم من تاريخ الاستحقاق. الطلب لازم يكون مسجّل — الطلب الشفهي غير المسجّل مش بيوقف المهلة.',
    reviewDate: REVIEW,
    version: 2,
    moment: {
      time: '7:15 مساءً.',
      floor: 'صوته عالي، وفيه اتنين في الطابور بيبصّوا. واحد منهم طلّع تليفونه.',
      opening: '«أنا قلت لواحد من زمايلك من شهرين إني عايز ألغي، وقالي تمام هنعملها! ودلوقتي بتقولوا فات الميعاد؟ **يعني الموضوع خلص**؟»',
    },
    pressure: { source: 'صوت عالي + حد بيصوّر', tests: 'هترد على الشكوى الظاهرة، ولا هتدوّر على المشكلة الحقيقية؟' },
    context: 'في السجل: **مفيش أي طلب إلغاء مسجّل**.',
    prompt: 'أول حاجة تعملها؟',
    options: [
      {
        text: 'توضّحله إن مهلة الـ30 يوم فاتت وإن مفيش طلب مسجّل في السجل.',
        correct: false,
        why: 'صح ومقطوع. بتقوله ضمنًا **«إنت بتتخيّل»** — وهو متأكد إنه اتكلم. الغضب هيتضاعف قدّام كاميرا.',
      },
      {
        text: 'تعتذر عن الموقف وتسأل سؤال واحد: مين الزميل وإمتى بالظبط — قبل أي كلام عن المهلة.',
        correct: true,
        why: 'الشكوى الظاهرة «المهلة»، **والمشكلة الحقيقية «أنا اتكلمت ومحدش عمل حاجة»**. التشخيص بيسبق الشرح.',
      },
      {
        text: 'تقوله إن الطلبات الشفهية مش بتتسجّل وإن المفروض كان يقدّم طلب مكتوب.',
        correct: false,
        why: '**بتحمّله المسؤولية** — «المفروض كنت عملت». دي بتحوّله لخصم في جملة واحدة.',
      },
      {
        text: 'تعتذر وتفتحله الإلغاء استثناءً — الخطأ من عندنا على الأرجح والموقف بيتصوّر.',
        correct: false,
        why: 'إقرار بغلط **مش متحقّق منه**، وقرار مش من صلاحيتك — **تحت ضغط كاميرا**. وبيخلق سابقة على النادي.',
      },
    ],
    expertThinking:
      'المحترف بيسمع الجملة الحقيقية: **هو مش زعلان من الـ30 يوم — هو زعلان إنه اتكلم ومحدش عمل حاجة**. ' +
      'فبيسأل سؤال واحد («مين وإمتى؟») بيعمل تلاتة في نفس الوقت: **بيديله إحساس إنه اتسمع**، ' +
      '**بيدّيك حقيقة تشتغل بيها**، و**مابيقرّش بغلط ومابيكذّبوش**. ' +
      'والكاميرا مش بتغيّر القرار — بتخلّي الترتيب أهم.',
    beginnerThinking:
      '**المبتدئ بيرد على آخر جملة اتقالت، مش على المشكلة.** سمع «فات الميعاد؟» فراح للمهلة. ' +
      'والمعلومة صح — **بس في اللحظة دي بتتسمع تكذيب**. ' +
      'والمبتدئ التاني بيشوف التليفون فبينهار للناحية التانية: **بيعتذر ويفتح استثناء** — ' +
      'وده مش شجاعة ولا لطف، **ده قرار اتاخد تحت ضغط كاميرا**، وهيبقى سابقة.',
    misconception: 'إن الرد الصح هو المعلومة الصح. **المعلومة الصح في الوقت الغلط بتشتغل ضدك — والتشخيص بيسبق الشرح.**',
  },
];

/**
 * One-minute pages after every five items. NOT a summary of what was asked —
 * the PATTERN underneath. Five items sharing one thinking mistake is a lesson;
 * five items reviewed one by one is a marking session.
 */
export const COUNTER_MISTAKES: readonly CounterMistakes[] = [
  {
    id: 'cm-01',
    afterItems: ['j-sep-01', 'j-sep-02', 'j-sep-03', 'j-sis-01', 'j-sis-02'],
    title: 'بتشتغل قبل ما تتأكد',
    mistake:
      'الموظف بيبدأ **ينفّذ** قبل ما يتأكد من الحاجة اللي التنفيذ كله واقف عليها. ' +
      'بيحسب قبل ما يشوف السن. بيوقّع على حساب زميله من غير ما يراجع المُدخل. بيرد على المقارنة قبل ما يعدّ الشروط.',
    whyItHappens:
      'مش كسل — **ده إحساس بالمسؤولية في اتجاه غلط**. العضو سأل، فالموظف حاسس إن شغله يجاوب بسرعة. ' +
      'والتحقق بيتحسّ «تعطيل»، خصوصًا وفيه طابور. ' +
      'والنتيجة إن الإجابة بتطلع **صح 8 مرات من 10** — والمرتين دول بيرجعوا شكاوى بفلوس.',
    whatExpertsDo:
      'بيسأل نفسه سؤال واحد قبل أي حركة: **«القرار ده واقف على إيه؟»** ' +
      'وبيروح للحاجة دي الأول — السن، المُدخل، الشرط. ' +
      'بتاخد 10 ثواني، **وبتلغي احتمال الغلط بالكامل** بدل ما تقلّله.',
    takeaway: '**اتأكد من المُدخل قبل ما تشتغل على المُخرج.** العشر ثواني دي أرخص من أي تصحيح بعدها.',
  },
  {
    id: 'cm-02',
    afterItems: ['j-doc-01', 'j-doc-02', 'j-ret-01', 'j-join-01', 'j-frz-01'],
    title: 'الحرص اللي بيتحوّل تعب على العضو',
    mistake:
      'الموظف بيراجع ورقة مش مطلوبة، أو بيرفض صيغة معتمدة لأنه مش متعوّد عليها، أو بيرفض من غير ما يقول البديل. ' +
      'وكل واحدة فيهم **حرص من جواه، وتعب على العضو من بره**.',
    whyItHappens:
      'الموظف الجديد خايف يعدّي حاجة غلط، **فبيدقّق في كل حاجة قدّامه بدل ما يحدّد المطلوب الأول**. ' +
      'والفرق دقيق: **التدقيق في المطلوب شغل؛ التدقيق في اللي مش مطلوب طلب زيادة**. ' +
      'وتكلفته مش عليه — **بتتدفع عند العضو**: زيارة تانية، ساعة طابور، وإحساس إن المكتب مش عارف عايز إيه.',
    whatExpertsDo:
      'بيحدّد **القايمة** الأول (السن بيقول المطلوب إيه)، وبعدين بيراجع المطلوب **بس**. ' +
      'ولما يرفض، بيقول **السبب + البديل** في نفس الجملة. ' +
      'وبيحكم على الورقة **باللي بتثبته** مش بشكلها.',
    takeaway: '**حدّد المطلوب قبل ما تراجع الموجود. والرفض من غير بديل مش قرار — ده وقفة.**',
  },
];

/**
 * The instincts, in the order they are earned. Each one is the residue of five
 * items — what is left after the specific cases fade and the numbers change.
 */
export const COUNTER_WISDOM: readonly CounterWisdom[] = [
  {
    id: 'cw-01',
    afterItems: ['j-sep-01', 'j-sep-02', 'j-sep-03', 'j-sis-01', 'j-sis-02'],
    // Names the force, the temptation, and exactly what must not move.
    line: 'استعجال العضو بيغيّر سرعتك — مايغيّرش ترتيبك.',
  },
  {
    id: 'cw-02',
    afterItems: ['j-doc-01', 'j-doc-02', 'j-ret-01', 'j-join-01', 'j-frz-01'],
    // Actionable in the next ten seconds: it stops your hand before it reaches.
    line: 'ما تطلبش ورقة قبل ما تعرف إنت محتاجها ليه.',
  },
];
