/**
 * Business-rules layer — public barrel.
 * Everything financial/procedural is exported from here so the UI imports rules
 * from a single, stable path: `import { separationPenalty } from '@/domain/rules'`.
 */
export * from './renewal';
export * from './separation';
export * from './childJoining';

/**
 * POLICY: Cancellation  (الإلغاء) — approved 30-day rule, modelled as data.
 * Non-numeric policies live as structured constants (not prose in a component)
 * so lessons render them and they stay editable in one place.
 */
export const CANCELLATION_POLICY = {
  noReasonWindowDays: 30,
  afterWindow: {
    requiresOfficialDocs: true,
    acceptedReasons: ['المرض', 'الهجرة', 'الوفاة', 'التعثّر المالي', 'أي حالة يعتمدها مجلس الإدارة'],
    refundNote: 'المبالغ المستردة أو الخصومات بتتحسب حسب اللوائح وقرارات مجلس الإدارة السارية وقت التنفيذ.',
  },
} as const;

/**
 * POLICY: Global Scan  (سياسة الـScan العامة) — referenced, never repeated.
 * Any transaction that creates/modifies/replaces official docs must be scanned
 * before it is considered complete, keeping physical and digital files identical.
 */
export const SCAN_POLICY = {
  appliesTo: ['التسجيل', 'الانضمام', 'الترقية', 'التجميد', 'إعادة التفعيل', 'تحديث البيانات', 'أي معاملة فيها إقرارات أو ورق رسمي جديد'],
  purpose: 'إن الملف الورقي والملف الرقمي يفضلوا متطابقين دايمًا.',
} as const;

/**
 * POLICY: Archive update  (تحديث الأرشيف) — after any data-affecting transaction,
 * the membership's archive page is updated to match the latest status.
 */
export const ARCHIVE_POLICY = {
  rule: 'بعد أي معاملة بتأثر على بيانات العضوية، لازم الموظف يحدّث صفحة الأرشيف الخاصة بالعضوية عشان تطابق آخر حالة.',
} as const;

/**
 * NOTE: Prices disclaimer — surfaced anywhere a financial example appears.
 * Kept as data so the wording is identical everywhere.
 */
export const PRICES_DISCLAIMER =
  'كل الأسعار في الأكاديمية لشرح طريقة الحساب والأمثلة العملية بس — مش أسعار رسمية. ' +
  'الأسعار الرسمية بيحددها مجلس الإدارة وممكن تتغير. الأكاديمية بتعلّم طريقة الحساب، مش حفظ الأسعار.';
