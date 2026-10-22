/**
 * Counting things in Arabic — and English — correctly.
 *
 * «1 موظفون» and «7 يوم» came from templates that glued a number to one fixed
 * word. Arabic picks the noun by the count: one (موظف واحد), two (موظفين
 * اتنين), three to ten (٣ موظفين — the plural), eleven and up (١١ موظف — the
 * singular again). The product speaks Egyptian Arabic, so the forms below are
 * the spoken ones. Numbers are bidi-isolated (iso) like every other figure.
 */
import { iso, t, tf, type Lang } from './i18n';

/**
 * The four Arabic forms; `{n}` is replaced with the isolated number. `zero`
 * is for a phrase that says «مفيش …» rather than «0 …».
 */
export interface ArabicForms { readonly zero?: string; readonly one: string; readonly two: string; readonly few: string; readonly many: string }
export interface EnglishForms { readonly zero?: string; readonly one: string; readonly other: string }

export function arabicCount(n: number, f: ArabicForms): string {
  const k = Math.abs(n) % 100;
  const form = n === 0 && f.zero ? f.zero : n === 1 ? f.one : n === 2 ? f.two : k >= 3 && k <= 10 ? f.few : f.many;
  return form.replace('{n}', iso(n));
}

export function englishCount(n: number, f: EnglishForms): string {
  return (n === 0 && f.zero ? f.zero : n === 1 ? f.one : f.other).replace('{n}', iso(n));
}

export const count = (n: number, lang: Lang, ar: ArabicForms, en: EnglishForms): string =>
  lang === 'ar' ? arabicCount(n, ar) : englishCount(n, en);

/* The nouns the product counts. */
export const staffCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'موظف واحد', two: 'موظفين اتنين', few: '{n} موظفين', many: '{n} موظف' },
  { one: 'one person', other: '{n} staff' });

export const trainerCount = (n: number, lang: Lang) => count(n, lang,
  { zero: 'من غير مدربين', one: 'مدرب واحد', two: 'مدربين اتنين', few: '{n} مدربين', many: '{n} مدرب' },
  { zero: 'no trainers', one: 'one trainer', other: '{n} trainers' });

export const branchCount = (n: number, lang: Lang) => count(n, lang,
  { zero: 'من غير فروع', one: 'فرع واحد', two: 'فرعين', few: '{n} فروع', many: '{n} فرع' },
  { zero: 'no branches', one: 'one branch', other: '{n} branches' });

export const needInterventionCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'موظف واحد محتاج تدخّل', two: 'موظفين اتنين محتاجين تدخّل', few: '{n} موظفين محتاجين تدخّل', many: '{n} موظف محتاجين تدخّل' },
  { one: 'one needs intervention', other: '{n} need intervention' });

export const changeCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'تغيير واحد', two: 'تغييرين', few: '{n} تغييرات', many: '{n} تغيير' },
  { one: 'one change', other: '{n} changes' });

/** «من يومين», «من 3 أيام»; today and yesterday by name. */
export const daysAgo = (days: number, lang: Lang): string =>
  days <= 0 ? t('mg.today', lang) : days === 1 ? t('mg.yesterday', lang) : tf('time.daysago', { days: dayCount(days, lang) }, lang);

export const dayCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'يوم واحد', two: 'يومين', few: '{n} أيام', many: '{n} يوم' },
  { one: 'one day', other: '{n} days' });

export const traineeCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'متدرب واحد', two: 'متدربين اتنين', few: '{n} متدربين', many: '{n} متدرب' },
  { one: 'one trainee', other: '{n} trainees' });

export const stationCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'محطة واحدة', two: 'محطتين', few: '{n} محطات', many: '{n} محطة' },
  { one: 'one station', other: '{n} stations' });

export const skillCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'مهارة واحدة', two: 'مهارتين', few: '{n} مهارات', many: '{n} مهارة' },
  { one: 'one skill', other: '{n} skills' });

export const lessonCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'درس واحد', two: 'درسين', few: '{n} دروس', many: '{n} درس' },
  { one: 'one lesson', other: '{n} lessons' });

export const unitCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'وحدة واحدة', two: 'وحدتين', few: '{n} وحدات', many: '{n} وحدة' },
  { one: 'one unit', other: '{n} units' });

export const phaseCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'مرحلة واحدة', two: 'مرحلتين', few: '{n} مراحل', many: '{n} مرحلة' },
  { one: 'one phase', other: '{n} phases' });

export const attemptCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'محاولة واحدة', two: 'محاولتين', few: '{n} محاولات', many: '{n} محاولة' },
  { one: 'one attempt', other: '{n} attempts' });

export const eventCount = (n: number, lang: Lang) => count(n, lang,
  { one: 'حدث واحد', two: 'حدثين', few: '{n} أحداث', many: '{n} حدث' },
  { one: 'one event', other: '{n} events' });

/*
 * Whole phrases, where the adjective agrees with the count too
 * («وحدتين مستنيين» but «٣ وحدات مستنية») — a counted noun alone is not enough.
 */
export const unitsAwaitingYou = (n: number, lang: Lang) => count(n, lang,
  { zero: 'مفيش وحدات مستنية تقييمك', one: 'وحدة واحدة مستنية تقييمك', two: 'وحدتين مستنيين تقييمك', few: '{n} وحدات مستنية تقييمك', many: '{n} وحدة مستنية تقييمك' },
  { zero: 'no units waiting for you', one: 'one unit waiting for you', other: '{n} units waiting for you' });

export const reviewsAwaitingYou = (n: number, lang: Lang) => count(n, lang,
  { one: 'مراجعة واحدة مستنية تعليقك', two: 'مراجعتين مستنيين تعليقك', few: '{n} مراجعات مستنية تعليقك', many: '{n} مراجعة مستنية تعليقك' },
  { one: 'one review waiting for your comment', other: '{n} reviews waiting for your comment' });

export const improvingCount = (n: number, lang: Lang) => count(n, lang,
  { zero: 'مفيش حد في تمديد', one: 'واحد بيتحسّن', two: 'اتنين بيتحسّنوا', few: '{n} بيتحسّنوا', many: '{n} بيتحسّنوا' },
  { zero: 'nobody extended', one: 'one improving', other: '{n} improving' });

export const itemsNeedYou = (n: number, lang: Lang) => count(n, lang,
  { one: 'حاجة واحدة محتاجة انتباهك', two: 'حاجتين محتاجين انتباهك', few: '{n} حاجات محتاجة انتباهك', many: '{n} حاجة محتاجة انتباهك' },
  { one: 'One item needs your attention', other: '{n} items need your attention' });

export const issuesNeedAction = (n: number, lang: Lang) => count(n, lang,
  { one: 'مشكلة تشغيلية واحدة محتاجة تدخّل', two: 'مشكلتين تشغيليتين محتاجين تدخّل', few: '{n} مشاكل تشغيلية محتاجة تدخّل', many: '{n} مشكلة تشغيلية محتاجة تدخّل' },
  { one: 'One operational issue needs action', other: '{n} operational issues need action' });
