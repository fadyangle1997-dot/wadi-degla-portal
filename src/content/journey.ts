/**
 * CONTENT: Membership File Journey — the 11-stage road map, as data.
 * Answers ONE question: "رحلة الملف ماشية إزاي؟" — the big picture only.
 * Details (which documents, which rules) live in the units; the journey never
 * repeats them (zero duplication). Terminology follows the approved corrections:
 * «المقابلة» (إدارة المقابلات) · «إصدار رقم العضوية» · «تحويل العميل إلى عضو».
 */
import type { JourneyStage } from '../domain/types/content';

export const JOURNEY_STAGES: readonly JourneyStage[] = [
  {
    n: 1, title: 'المبيعات', owner: 'external', department: 'قسم المبيعات',
    points: ['بيع العضوية', 'تجهيز الملف المبدئي', 'العروض والخصومات'],
    note: 'مش مسؤولية مكتب العضويات — بس اعرف اللي قبلك.',
  },
  {
    n: 2, title: 'استلام الأصول + Scan مبدئي', owner: 'membership', department: 'مكتب العضويات',
    points: ['استلام أصول الأوراق من العميل أو المبيعات', 'فحص المتطلبات', 'إنشاء ملف التسجيل', 'Scan مبدئي للأصول (Hold ← السنة ← الشهر ← اليوم ← اسم العضو)'],
    note: 'هنا بيبدأ دور مكتب العضويات.',
  },
  {
    n: 3, title: 'المقابلة', owner: 'external', department: 'إدارة المقابلات',
    points: ['إجراء المقابلة', 'التحقق من المتقدم', 'الموافقة أو الرفض'],
  },
  {
    n: 4, title: 'الدفع', owner: 'external', department: 'إدارة الحسابات',
    points: ['المقدم', 'الشيكات', 'الأقساط', 'المراجعة المالية'],
    note: 'قسم خارجي — إحنا بنتأكد إن قسم المقدم والشيكات صحيح.',
  },
  {
    n: 5, title: 'فحص العضوية قبل الإصدار', owner: 'membership', department: 'مكتب العضويات',
    points: ['السعر · المقدم · الأقساط · الشيكات', 'الخصومات · العروض', 'الأصول · سريان الأوراق', 'الإقرارات'],
  },
  {
    n: 6, title: 'إصدار رقم العضوية', owner: 'membership', department: 'مكتب العضويات',
    points: ['التحقق من الشيكات (مسؤولية موظف الحسابات)', 'إصدار رقم العضوية', 'تحويل العميل إلى عضو'],
  },
  {
    n: 7, title: 'الملف الرسمي كامل + Scan', owner: 'membership', department: 'مكتب العضويات',
    points: ['تكوين الملف النهائي', 'Application النادي + Form اليدوي', 'صور الأصول + الإقرارات', 'Cover اللوجستيك + Cover Sales', 'مستندات الدفع + إقرار الترشيح + Cover المتابعة', 'الحفظ باسم رقم العضوية'],
  },
  {
    n: 8, title: 'مراجعة الأرشيف', owner: 'archive', department: 'موظف الأرشيف',
    points: ['مراجعة الملف بعد إصدار الرقم', 'أي صورة ناقصة بتتطبع وتتكمّل'],
    note: 'مفيش أرشفة قبل مراجعة كاملة.',
  },
  {
    n: 9, title: 'الكتابة في الدفتر', owner: 'archive', department: 'موظف الأرشيف',
    points: ['تسجيل العضوية في دفتر الأرشيف', 'مطابقة البيانات مع الملف'],
  },
  {
    n: 10, title: 'الحفظ الدائم', owner: 'archive', department: 'الأرشيف الداخلي بالفرع',
    points: ['حفظ الملف الورقي في مكانه الدائم', 'الأرشيف داخلي في كل فرع'],
  },
  {
    n: 11, title: 'تسليم الكارنيه + عالم المعاملات', owner: 'membership', department: 'مكتب العضويات',
    points: ['طباعة الكارنيه عند حضور العضو + عمل الـencoding', 'من هنا تبدأ المعاملات: تجديد · ترقية · انفصال · إلغاء · تجميد · بدل فاقد · تحديث بيانات'],
  },
];
