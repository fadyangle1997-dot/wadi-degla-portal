/**
 * Skill catalogue — the reusable competencies the academy builds.
 * Skills are tracked ACROSS units (introduced → practiced → mastered), so the
 * platform can say "the employee has mastered document verification" rather
 * than "finished 3 lessons". This is the backbone of Skill Progression.
 */
import type { Skill } from '../domain/types/content';

export const SKILLS = {
  docBasics: {
    id: 'docBasics',
    name: 'المستندات الأساسية',
    description: 'معرفة الورق الأساسي المطلوب في أي عضوية وشرط اكتماله قبل الإدخال.',
  },
  socialStatus: {
    id: 'socialStatus',
    name: 'قراءة الحالة الاجتماعية',
    description: 'تحديد المستند المطلوب حسب حالة العميل ومتى يُطلب أصلاً.',
  },
  ageRules: {
    id: 'ageRules',
    name: 'ضوابط أعمار الأبناء',
    description: 'تطبيق حدود 16 / 21 / 25 وتحديد مستند كل فئة.',
  },
  docValidity: {
    id: 'docValidity',
    name: 'فحص صلاحية المستند',
    description: 'التمييز بين المستند الساري والمنتهي، وقاعدة الكارنيه وختم النسر.',
  },
  fileCompleteness: {
    id: 'fileCompleteness',
    name: 'اكتمال الملف قبل الإصدار',
    description: 'اكتشاف أي نقص في الملف قبل إصدار رقم العضوية.',
  },
  eligibility: {
    id: 'eligibility',
    name: 'تقييم أحقية الإضافة',
    description: 'تحديد من يحق ضمه ومتى يُرفض (المنتسبين، الأخت، المربية).',
  },
  relationshipProof: {
    id: 'relationshipProof',
    name: 'إثبات صلة القرابة',
    description: 'معرفة متى تُطلب شهادة الميلاد لإثبات القرابة.',
  },
  financialMethod: {
    id: 'financialMethod',
    name: 'فهم طريقة الحساب المالي',
    description: 'فهم كيف يحسب النظام الغرامات والفروق ليشرحها للعميل ويلقط الخطأ.',
  },
  separationCalc: {
    id: 'separationCalc',
    name: 'حساب الانفصال',
    description: 'تحديد سن الفصل، استبعاد الضريبة، وتطبيق شريحة الغرامة الصحيحة.',
  },
  separationEligibility: {
    id: 'separationEligibility',
    name: 'قواعد الفصل',
    description: 'معرفة متى الفصل إجباري، وإن الابن 25+ لا يُضاف نهائيًا، ومتى نرجع للإدارة.',
  },
  proMindset: {
    id: 'proMindset',
    name: 'العقلية المهنية',
    description: 'فهم الدور وحدوده، وقاعدة التصعيد، وسلسلة أثر الدقة في شغل المكتب.',
  },
  clubVoice: {
    id: 'clubVoice',
    name: 'إنت صوت النادي',
    description: 'إدراك إن كلامك موقف النادي الرسمي مش رأيك الشخصي — وإن كل جملة بتبني ثقة أو بتهدّها.',
  },
  ruleExplanation: {
    id: 'ruleExplanation',
    name: 'شرح القاعدة',
    description: 'تقول القاعدة كقاعدة النادي — باللي بتثبته وليه موجودة والخطوة الجاية — مش كطلب شخصي.',
  },
  documentRequest: {
    id: 'documentRequest',
    name: 'طلب المستندات',
    description: 'مراجعة كاملة قبل أي طلب، وطلب واحد كامل بدل دفعات بترجّع العضو.',
  },
  professionalRefusal: {
    id: 'professionalRefusal',
    name: 'الرفض المهني',
    description: 'قاعدة ← الشرط المكسور ← البديل المتاح. الرفض بيتربط باللائحة مش بشخصك.',
  },
  pressureComposure: {
    id: 'pressureComposure',
    name: 'الثبات تحت الضغط',
    description: 'تفضل محترف وإنت معاك حق — بلا جدال وبلا استسلام وبلا دفاع عن النفس.',
  },
  memberHandling: {
    id: 'memberHandling',
    name: 'التعامل مع العضو',
    description: 'تهدئة الموقف قبل الحل: تسمع، تعترف بالمشاعر، وتوصّل قرار صح من غير ما تخسر العضو.',
  },
  problemDiagnosis: {
    id: 'problemDiagnosis',
    name: 'تشخيص المشكلة الحقيقية',
    description: 'التفرقة بين المشكلة الظاهرة (اللي بيقولها) والمشكلة الحقيقية (اللي بيحسها).',
  },
  objectionHandling: {
    id: 'objectionHandling',
    name: 'الاعتراض والضغط',
    description: 'الرد على طلب الاستثناء والضغط الإداري باحترام، بلا جدال وبلا وعود، مع الالتزام باللائحة.',
  },
  grayCaseJudgment: {
    id: 'grayCaseJudgment',
    name: 'الحكم في الحالة الرمادية',
    description: 'تشخيص أي حالة مش ماشية بالكتاب: ناقص ولا مكسور، شرط واحد ولا متقاطع — والوصول لواحد من 4 قرارات.',
  },
  escalationJudgment: {
    id: 'escalationJudgment',
    name: 'قرار: أسأل ولا أصعّد',
    description: 'التمييز بين فجوة معرفة (تتحل بسؤال) وفجوة صلاحية (لازم تصعيد) وموقف تعرفه فعلاً.',
  },
  selfReview: {
    id: 'selfReview',
    name: 'المراجعة الذاتية قبل التسليم',
    description: 'مراجعة شغلك بنفسك قبل ما المدرب يراجعه — أساس الاستقلال الآمن.',
  },
  journeyMap: {
    id: 'journeyMap',
    name: 'خريطة رحلة الملف',
    description: 'معرفة مراحل رحلة ملف العضوية ومين مسؤول عن إيه وفين دورك.',
  },
} satisfies Record<string, Skill>;
