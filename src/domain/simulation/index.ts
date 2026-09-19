/**
 * Member archetypes and simulation dynamics.
 *
 * WHY ARCHETYPES AND NOT DIALOGUES:
 * A dialogue teaches a trainee to answer a SENTENCE. Real work hands them a
 * PERSON — and the same sentence («طب ما المكتب التاني عملها») means something
 * different coming from someone comparing branches than from someone negotiating.
 * Teaching lines produces an employee who is fluent until the member phrases it
 * differently. Teaching people produces one who reads the situation.
 *
 * THE STRUCTURE THAT MAKES THIS TEACHABLE:
 * Every archetype separates what the member DOES from what they actually WANT.
 * The gap between those two is where every beginner mistake lives: they answer
 * the behaviour and miss the need. «أنا عضو من زمان» is not an argument to
 * rebut — it is a request to be seen. Answer the argument and the member digs in.
 *
 * WHY STATE CHANGE IS THE SUCCESS MEASURE:
 * Saying the correct sentence to a member who leaves just as angry is not
 * success — it is compliance theatre. The trainee succeeds when the member MOVES:
 * غاضب → متفهم. That reframes the whole skill from performance to effect.
 *
 * Pure domain: no UI, no storage.
 */

/** Where a member is emotionally. Opening states and target states, one union. */
export type MemberState =
  | 'angry' | 'rushed' | 'suspicious' | 'anxious' | 'negotiating' | 'entitled' | 'comparing'
  | 'understanding' | 'reassured' | 'cooperative' | 'accepting';

export const STATE_LABEL: Record<MemberState, string> = {
  angry: 'غاضب',
  rushed: 'مستعجل',
  suspicious: 'مشكك',
  anxious: 'متوتر',
  negotiating: 'بيفاوض',
  entitled: 'شايف إن له وضع خاص',
  comparing: 'بيقارن بفرع تاني',
  understanding: 'متفهم',
  reassured: 'مطمئن',
  cooperative: 'متعاون',
  accepting: 'قابل القرار',
};

export interface MemberArchetype {
  readonly id: string;
  readonly name: string;
  /** Observable behaviour — what the trainee sees and hears. */
  readonly does: string;
  /** The need under the behaviour. Answering the behaviour instead of this is
   *  the single most common failure with this type. */
  readonly wants: string;
  /** The specific trap THIS person sets. Never the same across archetypes. */
  readonly trap: string;
  /** What actually moves them — not a sentence, a move. */
  readonly movesWhen: string;
  /** What locks them in place. */
  readonly hardensWhen: string;
  readonly opensAs: MemberState;
}

/**
 * Seven people a Membership Advisor meets every week. Each one's trap is
 * different, because the trap comes from the gap between `does` and `wants`.
 */
export const ARCHETYPES: readonly MemberArchetype[] = [
  {
    id: 'rushed',
    name: 'المستعجل',
    does: 'بيقاطعك، بيبص في ساعته، «طب بسرعة كده»، بيدّيك الورق وهو واقف على رجل.',
    wants: 'يعرف هياخد قد إيه — مش إنك تستعجل. المجهول هو اللي بيوتّره مش الوقت.',
    trap: 'بتستعجل معاه فبتراجع وإنت بتتكلم — فيطلع طلب على دفعات، وبيرجع تاني يوم أغضب.',
    movesWhen: 'تديله رقم: «دقيقتين أراجع وأقولك كل حاجة مرة واحدة».',
    hardensWhen: 'تقوله «ثانية واحدة» من غير رقم — دي بتتسمع «مش عارف».',
    opensAs: 'rushed',
  },
  {
    id: 'negotiator',
    name: 'المفاوض',
    does: 'كل رد بترد بيه، بيرد عليه بعرض تاني: «طب نص المبلغ؟» «طب لو جبت ورقة تانية؟».',
    wants: 'يحس إنه حاول ومسابش حقه — أكتر من إنه يكسب فعلاً.',
    trap: 'بترد على كل عرض بعرض مضاد، فبيتأكد إن فيه مساحة — والتفاوض بيطول لأنك فتحته.',
    movesWhen: 'القاعدة تتقال كرقم ثابت مش كموقف قابل للنقاش، ومرة واحدة.',
    hardensWhen: 'تقوله «هشوف» أو «يمكن» — أي تلميح بمرونة بيطوّل التفاوض ساعة.',
    opensAs: 'negotiating',
  },
  {
    id: 'angry',
    name: 'الغاضب',
    does: 'بيرفع صوته، بيكرّر نفس الجملة، مش بيسيبك تكمّل.',
    wants: 'يتسمع. مش عايز حل لسه — عايز يتأكد إن حد فاهم إنه اتظلم.',
    trap: 'بتشرح بدري. الشرح على ودن مقفولة بيزوّد الغضب — وبيأكّدله إنك مش سامعه.',
    movesWhen: 'الاعتراف يقف لوحده من غير «بس»، والصمت بعده.',
    hardensWhen: 'تقوله «خلّينا نهدى» — بتتقرا أمر، وبتضاعف التوتر.',
    opensAs: 'angry',
  },
  {
    id: 'veteran',
    name: 'العضو القديم',
    does: '«أنا عضو من زمان» · «وبرضه بتعاملوني كده؟» — بيرجّع تاريخه في كل جملة.',
    wants: 'تقدير. الجملة دي مش حجة — دي طلب إنه يتشاف.',
    trap: 'بترد على الكلام («القاعدة على الكل») بدل الرسالة — فبترد على حجة مش موجودة.',
    movesWhen: 'تعترف بالمدة **قبل** أي قاعدة، وتقول «مش استثناء على حضرتك».',
    hardensWhen: 'تقوله «اتفضل كلّم المدير» — تحدّي بيجبره يشتكي عشان يثبت نفسه.',
    opensAs: 'entitled',
  },
  {
    id: 'skeptic',
    name: 'المشكك',
    does: '«طب هو ده صح؟» · «أنا سمعت غير كده» · بيسأل نفس السؤال بصيغ مختلفة يشوف هتغيّر ردّك.',
    wants: 'مصدر يثق فيه. مش بيشك فيك إنت — بيشك في إن المعلومة ثابتة.',
    trap: 'بتزعل وبتدافع عن نفسك — فبتأكّدله إن المعلومة فعلاً مش ثابتة.',
    movesWhen: 'تديله معلومة موثّقة من السجل، ونفس الإجابة بنفس الصيغة كل مرة يسأل.',
    hardensWhen: 'تغيّر صياغتك بين المرة والتانية — بيقراها تناقض.',
    opensAs: 'suspicious',
  },
  {
    id: 'anxious',
    name: 'المتوتر',
    does: 'بيسأل نفس السؤال تلات مرات، بيتلخبط في الورق، «يعني أعمل إيه بالظبط؟».',
    wants: 'يتطمّن إنه مش هيغلط. الخوف من الغلط أكبر من المعاملة نفسها.',
    trap: 'بتديله معلومات أكتر عشان توضّح — فبيتوه أكتر. الزيادة عنده ضوضاء مش وضوح.',
    movesWhen: 'تقلّل الخطوات لأقل عدد وتكتبهاله، وتقوله «الاتنين دول بس».',
    hardensWhen: 'تشرح كل الاحتمالات والاستثناءات — كل احتمال زيادة بيضاعف قلقه.',
    opensAs: 'anxious',
  },
  {
    id: 'comparer',
    name: 'اللي بيقارن',
    does: '«طب ما المكتب التاني عملها» · «صاحبي ضم أخته الشهر اللي فات».',
    wants: 'يتأكد إنه مش مظلوم — إن القاعدة واحدة مش مزاج موظف.',
    trap: 'بتهاجم المكتب التاني أو بتقول «مش عارف» — الاتنين بيأكّدوا إن الموضوع مزاج.',
    movesWhen: 'ترجّع الحوار للشروط: «شروط حالته اتحققت غالبًا — نراجع حالتك بالشروط».',
    hardensWhen: 'تقوله «كل حالة ليها ظروفها» — دي بتأكّد شكّه بالظبط.',
    opensAs: 'comparing',
  },
];

export const archetypeById = (id: string): MemberArchetype | undefined =>
  ARCHETYPES.find(a => a.id === id);

/**
 * The arc. Success is not "said the right thing" — it is that the member MOVED.
 * A trainee who delivers a flawless refusal to someone who leaves just as angry
 * has performed, not succeeded.
 */
export interface StateArc {
  readonly opensAs: MemberState;
  readonly targetState: MemberState;
  /** Observable signs the member actually shifted — not a feeling. */
  readonly signsOfShift: readonly string[];
}

/**
 * Interruptions arrive DURING the encounter, not before it. A skill that only
 * holds in a quiet room is not a skill — the counter is never a quiet room.
 * Staged: one early, one mid, one late, so pressure accumulates the way a real
 * bad morning does.
 */
export interface Distractor {
  readonly at: 'opening' | 'mid' | 'closing';
  readonly event: string;
  /** What this actually probes — every interruption tests a different thing. */
  readonly tests: string;
}

export const DISTRACTOR_BANK: readonly Distractor[] = [
  { at: 'opening', event: 'طفل بيعيّط جنب الكاونتر والعضو بيتلفت له كل شوية.', tests: 'هتفضل مركّز، ولا هتسرّع عشان تخلّص؟' },
  { at: 'opening', event: 'التليفون بيرن قدّامك وإنت في نص الكلام.', tests: 'هتسيب العضو، ولا هتقفل الجملة الأول؟' },
  { at: 'mid', event: 'زميل بيقاطعك يسأل عن ملف تاني.', tests: 'هتحوّل انتباهك، ولا هتديله إشارة وتكمّل؟' },
  { at: 'mid', event: 'النظام بقى بطيء والشاشة واقفة على «جاري التحميل».', tests: 'هتقول «النظام واقع»، ولا هتشغّل الوقت في حاجة مفيدة؟' },
  { at: 'closing', event: 'وراه اتنين مستنيين وبيبصّوا في ساعتهم.', tests: 'هتقفل بخطوة، ولا هتنهي بسرعة من غير ما تتأكد إنه فهم؟' },
  { at: 'closing', event: 'العضو بيرجع يسأل نفس السؤال تاني وإنت خلصت.', tests: 'هتضايق، ولا هتفهم إنه ده معناه إنه مطمنّش؟' },
];

/** A behavioural reflection — never a knowledge check. */
export function isBehaviouralReflection(q: string): boolean {
  // Knowledge questions ask about the world. Behavioural ones ask about YOU:
  // «في أنهي لحظة حسّيت…» — the trainee has to inspect their own conduct.
  const knowledgeOpeners = ['إيه هي', 'يعني إيه', 'عرّف', 'اذكر', 'أنهي قاعدة'];
  if (knowledgeOpeners.some(k => q.trim().startsWith(k))) return false;
  return /إنت|نفسك|حسّي?ت|شعرت|قلت|عملت|كنت/.test(q);
}
