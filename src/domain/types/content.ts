/**
 * Content domain types — "content as data" + Learning Architecture.
 *
 * The compiler now ENFORCES the Content Rules (docs/content-rules.md): a lesson
 * cannot exist without a learning objective, an employee question, a prediction
 * beat and a quick quiz; a unit cannot exist without skills and unlock rules.
 * This is what turns "a pile of lessons" into a learning SYSTEM.
 */

export type Role = 'trainee' | 'trainer' | 'manager' | 'admin';
export type RuleRef = string;

/** A trackable skill. Skills progress across lessons/units toward mastery. */
export interface Skill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}
/** How far a lesson moves a skill. */
export type SkillLevel = 'introduced' | 'practiced' | 'mastered';
export interface SkillTouch {
  readonly skill: string; // Skill id
  readonly level: SkillLevel;
}

export interface LessonPoint {
  readonly text: string;
  readonly rule?: RuleRef;
}

export interface QuizOption {
  readonly text: string;
  readonly correct: boolean;
}
export interface QuizQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly QuizOption[];
  readonly explanation: string;
  readonly reviewLessonId?: string;
}

/** A prediction beat during the explanation — the learner commits to an answer
 *  BEFORE the rule is revealed (Active Recall → far stronger retention). */
export interface Prediction {
  readonly prompt: string;
  readonly options: readonly QuizOption[];
  readonly reveal: string; // the rule/answer revealed after they choose
}

/**
 * LAYER 2 — the communication companion.
 *
 * Every operational rule carries its OWN delivery risk, so this is never a
 * template: the risk in the late-joining fine is surprise, in the sister's
 * conditions it is a generic refusal, in the cancellation deadline it is a
 * promise. Same shape, different content every time — a trainee cannot
 * memorise a pattern that changes with each rule.
 *
 * `audience` exists because registration has no member conversation: the file
 * comes from Sales and goes back to Sales. Inventing a counter dialogue there
 * would teach a workflow that does not exist.
 */
export interface CommsInsight {
  /** ⚠️ فخ احترافي — the professional mistake THIS rule invites. */
  readonly risk: string;
  /** What the member (or colleague) actually experiences when it happens. */
  readonly why: string;
  /** ⭐ الأفضل — how a professional BEHAVES. A principle, never a script. */
  readonly instead: string;
  readonly audience: 'member' | 'sales';
}

/**
 * A real counter exchange, structured rather than prose.
 *
 * The wrong and the right version answer the SAME member with the SAME
 * decision — only the delivery differs. That is the whole lesson: the trainee
 * sees that the rule was never the problem. Structuring it (instead of writing
 * a paragraph) lets a contract enforce that every representation lesson carries
 * both versions and both explanations, and lets the UI render it as dialogue.
 *
 * These are EXAMPLES, never scripts. The `principle` is what transfers.
 */
export interface DialogueLine {
  readonly speaker: 'member' | 'staff';
  readonly line: string;
}

export interface Dialogue {
  /** The situation both versions face. */
  readonly setup: string;
  readonly wrong: readonly DialogueLine[];
  /** What the member experiences — why this version creates conflict. */
  readonly whyWrongFails: string;
  readonly right: readonly DialogueLine[];
  /** Why this version protects the employee AND the club. */
  readonly whyRightWorks: string;
}

/**
 * PRODUCTION — the trainee makes the sentence, they do not pick it.
 *
 * WHY THIS EXISTS: the curriculum audit found 169 assessment moments and every
 * one of them was recognition — pick the right option. A trainee could finish
 * the whole representation unit, the unit that teaches HOW TO SPEAK, without
 * ever speaking. Recognition is a far easier task than free production under
 * pressure, so we were measuring the easy thing and claiming the hard one. The
 * graduate would say the sentence for the first time in front of a real member.
 *
 * Ritz-Carlton does not offer four options for a greeting. You say it, someone
 * listens, and you go again.
 *
 * THE LOOP IS: attempt → feedback → retry → pass. Never attempt → answer → next.
 * `criteria` is what makes the retry meaningful: without stated criteria a
 * second attempt is just a second guess.
 *
 * `criteria` also closes a gap the audit found — the four observable conduct
 * behaviours were graded from day 33 but never shown to the trainee. Here they
 * are the trainee's OWN self-check, from the moment the skill is taught. You
 * cannot hold someone to a standard you never showed them.
 */
export interface Production {
  /** What the trainee must actually do — out loud, to a person where possible. */
  readonly task: string;
  readonly mode: 'speak' | 'roleplay' | 'write';
  /** Observable, binary, self-checkable. This is the feedback in the loop. */
  readonly criteria: readonly string[];
  /** What goes wrong on the first attempt — named, so the retry is targeted. */
  readonly commonMisses: readonly string[];
  /** Who the trainee faces. A person, not a line — see domain/simulation. */
  readonly archetypeId?: string;
  /** Where the member starts and where success moves them. Saying the right
   *  sentence to someone who leaves just as angry is not success. */
  readonly arc?: { readonly opensAs: string; readonly targetState: string; readonly signsOfShift: readonly string[] };
  /** Interruptions that arrive DURING the encounter — the counter is never quiet. */
  readonly distractors?: readonly { readonly at: 'opening' | 'mid' | 'closing'; readonly event: string; readonly tests: string }[];
  /** ONE question, about the trainee's own conduct — never about the rules. */
  readonly reflection?: string;
}

export interface Practice {
  readonly kind: 'checklist' | 'pick';
  readonly prompt: string;
  readonly items: readonly { readonly text: string; readonly correct: boolean; readonly feedback: string }[];
}

/**
 * Professional-training enrichment — the layer that turns a lesson into
 * workplace readiness. Optional so existing lessons stay valid; authored from
 * REAL lesson content and the official guide, never invented. Where a concrete
 * office/CMS procedure isn't in the source, the office task defers to the
 * trainer ("المدرب يحدد المهمة حسب إجراءات الفرع الحالية").
 *
 * The governing test for every block: if the trainee finishes this lesson
 * today, what EXACTLY can they do tomorrow in the branch — observable by the
 * trainer? That answer is `tomorrowInBranch`.
 */
export interface WeeklyTrainerReview {
  /** ما يلاحظه المدرب أثناء العمل الحقيقي. */
  readonly observation: readonly string[];
  /** علامات الإتقان. */
  readonly strengths: readonly string[];
  /** علامات تحتاج متابعة. */
  readonly needsWork: readonly string[];
}

export interface ProTraining {
  /** THE governing answer: what the trainee can DO in the branch tomorrow. */
  readonly tomorrowInBranch: string;
  /** 0 · تحدّي الافتتاح — موقف واقعي يخلق فضولًا قبل أي شرح. */
  readonly openingChallenge: string;
  /** 8 · منظور العضو — إحساسه، توقّعه، وإيه اللي بيبني الثقة أو بيهدّها. */
  readonly customerPerspective?: string;
  /** 10 · أسئلة للمدرب — أمان نفسي: المتدرب يسأل بدل ما يخمّن. */
  readonly trainerQuestions?: readonly string[];
  /** 11 · نقاش أسبوعي — سؤال المدرب يفتح بيه حوار (ليه؟ اشرح تفكيرك)، مش تقييم. */
  readonly weeklyDiscussion?: string;
  /** 7 · التفكير المهني — كيف يفكّر المحترف، لا ما يفعله فقط. اختياري أثناء التحويل التدريجي. */
  readonly professionalThinking?: string;
  /** 8 · عقلية الملكية وحل المشكلة — «المشكلة مسؤوليتي حتى أعرف صاحبها»، بلا تجاوز للصلاحية. */
  readonly ownershipMindset?: string;
  /** القاعدة الذهبية — جملة واحدة تفضل في دماغ المتدرب سنين. سطر واحد بحد أقصى. */
  readonly goldenRule?: string;
  /** الالتزام — «هركّز على إيه بكرة؟» يختار واحدة بس. */
  readonly commitmentOptions?: readonly string[];
  /** عادة صغيرة جدًا (أقل من دقيقة) يعملها المتدرب بكرة — العادات بتصنع المحترف. */
  readonly dailyHabit?: string;
  /** 13 · سؤال ختامي يفكّر فيه المتدرب وهو راجع البيت. */
  readonly closingReflection?: string;
  /** 5 · سؤال تأمّلي (لا اختبار) — يفكّر قبل ما يكمّل. */
  readonly reflectiveQuestion: string;
  /** 1 · لماذا هذا الدرس مهم — أثره على الأداء وعلى العضو. */
  readonly whyMatters: string;
  /** 2 · السياق المهني — أين تُستخدم هذه المعرفة في يوم العمل. */
  readonly professionalContext: string;
  /** 3 · سيناريو من المكتب — موقف واقعي غير مبالغ فيه. */
  readonly officeScenario: string;
  /** 4 · الأخطاء الشائعة — من منطق الدرس فقط. */
  readonly commonMistakes: readonly string[];
  /** 5 · معايير النجاح — قابلة للملاحظة. */
  readonly successCriteria: readonly string[];
  /** 6 · مراجعة المدرب الأسبوعية (لا يومية). */
  readonly weeklyReview: WeeklyTrainerReview;
  /** 7 · مهمة المكتب — أو تفويض للمدرب، أو لا توجد. */
  readonly officeTask: string;
  /** 8 · المهارات المهنية (2–5) — من المصفوفة الموجودة. */
  readonly skillsDeveloped: readonly string[];
  /** 9 · أثر الجاهزية للعمل — كيف يساهم في موظف منتج. */
  readonly jobReadinessImpact: string;
  /** 10 · فحص الجاهزية — هل ينفّذها باستقلال؟ */
  readonly readinessCheck: { readonly level: 'YES' | 'PARTIALLY' | 'NO'; readonly why: string };
}

export interface Lesson {
  readonly id: string;
  readonly title: string;
  /** Measurable objective: "بعد الدرس ده تقدر…". */
  readonly objective: string;
  /** The achievement phrasing shown on completion («دلوقتي تقدر …») —
   *  explicit field, never derived by string surgery. */
  readonly canNow: string;
  /** The one employee question this lesson answers. */
  readonly employeeQuestion: string;
  /** Skills this lesson develops (Skill Progression). ≥1. */
  readonly skills: readonly SkillTouch[];
  readonly intro: string;
  /** A single concrete real-world example. */
  readonly example: string;
  /** Prediction beat mid-explanation (Active Recall). */
  readonly prediction: Prediction;
  readonly points: readonly LessonPoint[];
  /** Quick check right after (comprehension, not grading). */
  readonly quickQuiz: readonly QuizQuestion[];
  readonly practice?: Practice;
  /** Layer 2: the communication risk carried by this specific rule. */
  readonly comms?: CommsInsight;
  /** Layer 3: the same situation delivered wrong, then right. */
  readonly dialogue?: Dialogue;
  /** Production: the trainee says it themselves, then retries against criteria. */
  readonly production?: Production;
  /** Professional-training enrichment (workplace readiness layer). */
  readonly pro?: ProTraining;
}

export interface Scenario {
  readonly id: string;
  readonly context: string;
  readonly prompt: string;
  readonly choices: readonly { readonly text: string; readonly correct: boolean; readonly response: string }[];
}

/** How a unit unlocks — turns the curriculum into a gated progression. */
export interface UnlockRequirement {
  /** Module ids that must be completed first. Empty = open from start. */
  readonly requiresUnits: readonly string[];
  /** Minimum unit-exam score (0..1) to count the prerequisite as passed. */
  readonly minExamScore: number;
}

export interface Module {
  readonly id: string;
  readonly order: number;
  readonly code: string;
  readonly title: string;
  readonly bigQuestion: string;
  readonly timeline: string;
  /** Skills this unit is responsible for taking to mastery. */
  readonly skills: readonly Skill[];
  readonly unlock: UnlockRequirement;
  readonly lessons: readonly Lesson[];
  readonly unitExam: readonly QuizQuestion[];
  readonly scenario?: Scenario;
}

export interface JourneyStage {
  readonly n: number;
  readonly title: string;
  readonly owner: 'membership' | 'external' | 'archive';
  readonly department: string;
  readonly points: readonly string[];
  readonly note?: string;
}

export interface BossBattleStep {
  readonly actor: string;
  readonly prompt: string;
  readonly options: readonly QuizOption[];
  readonly feedback: string;
}
export interface BossBattle {
  readonly id: string;
  readonly afterUnits: readonly string[];
  /** Escalating difficulty: 1 simple · 2 full family · 3 full working day. */
  readonly level: 1 | 2 | 3;
  readonly title: string;
  readonly brief: string;
  readonly steps: readonly BossBattleStep[];
  readonly passNote: string;
}
