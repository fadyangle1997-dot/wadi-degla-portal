/**
 * The product language system (docs/voice-and-language.md), held by test.
 *
 * The trainee's journey speaks professional Egyptian Arabic and natural
 * English: no bureaucratic MSA, no slang, one word per concept and per
 * control, nothing described by its colour or its place, and every key in
 * both languages. The journey is read from its own files, so a new screen or
 * a new string is checked the day it is written.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { t, type Key } from '../i18n';

const SRC = join(__dirname, '../..');
const read = (f: string) => readFileSync(join(SRC, f), 'utf-8');

/** The Phase 1 focus journey: sign-in to completion, and the shell around it. */
const JOURNEY = [
  'features/login/LoginView.tsx', 'features/welcome/WelcomeView.tsx', 'features/path/PathView.tsx',
  'features/journey/MissionBrief.tsx', 'features/journey/TodayRetrieval.tsx',
  'features/lesson/LessonFlow.tsx', 'features/lesson/PredictStage.tsx', 'features/lesson/QuizStage.tsx',
  'features/lesson/PracticeStage.tsx', 'features/lesson/ProductionStage.tsx', 'features/lesson/lessonBlocks.tsx',
  'features/lesson/ruleRenderers.tsx', 'features/exam/ExamView.tsx', 'features/boss/BossView.tsx',
  'features/review/DecisionReview.tsx', 'features/review/MyReviews.tsx', 'ui/primitives/index.tsx',
  'ui/AppShell.tsx', 'app/App.tsx', 'domain/training/statusWording.ts', 'domain/review/index.ts',
];

const DICT_SRC = read('app/i18n.ts');
const BODY = DICT_SRC.slice(DICT_SRC.indexOf('const DICT = {'), DICT_SRC.indexOf('} as const'));
const ENTRY = /'([a-z0-9_.]+)':\s*\{\s*ar:\s*(['"`])((?:\\.|(?!\2).)*)\2\s*,\s*en:\s*(['"`])((?:\\.|(?!\4).)*)\4\s*\}/gs;
const DICT = new Map<string, { ar: string; en: string }>();
for (const m of BODY.matchAll(ENTRY)) DICT.set(m[1]!, { ar: m[3]!.replace(/\\'/g, "'"), en: m[5]!.replace(/\\'/g, "'") });

/** Code without comments: the rules are about what a reader sees. */
const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const AR = /[؀-ۿ]/;
/** Every Arabic string a journey file writes itself: literals and JSX text. */
const literals = (f: string): string[] => {
  const src = code(f);
  const out: string[] = [];
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    const s = m[1] ?? m[2] ?? m[3] ?? '';
    if (AR.test(s)) out.push(s);
  }
  for (const m of src.matchAll(/>([^<>{}]*[؀-ۿ][^<>{}]*)</g)) out.push(m[1]!.trim());
  return out;
};
/** The dictionary keys the journey renders. */
const journeyKeys = [...new Set(JOURNEY.flatMap(f => [...code(f).matchAll(/\b(?:t|tf|tr|tx)\('([a-z0-9_.]+)'/g)].map(m => m[1]!)))];
const journeyArabic = [
  ...JOURNEY.flatMap(f => literals(f).map(s => ({ where: f, s }))),
  ...journeyKeys.filter(k => DICT.has(k)).map(k => ({ where: k, s: DICT.get(k)!.ar })),
];

describe('the journey is read whole', () => {
  it('finds its keys and its strings (the scan is not empty)', () => {
    expect(journeyKeys.length).toBeGreaterThan(150);
    expect(journeyArabic.length).toBeGreaterThan(300);
    for (const k of journeyKeys) expect(DICT.has(k), `${k} is used but not in the dictionary`).toBe(true);
  });
});

describe('voice: professional Egyptian, not MSA and not slang', () => {
  const RULES: Array<[string, RegExp]> = [
    ['bureaucratic MSA', /يرجى|الرجاء|يتعين|يجب عليك|(^|\s)قم ب|جاري\s|لم يتم|لا يوجد|لا توجد|(^|\s)قيد\s|سوف\s|الخاص بك|(^|\s)بلا\s|أثناء|تُفتح|المحددة/],
    ['«تم» + a verbal noun', /(^|\s)تم\s+\S/],
    ['slang', /زغلل|في جيبك|(^|\s)دوس|(^|\s)يلا(\s|$)|جامد|الدنيا تمام|إنت كده تمام/],
    ['colour or place as the only pointer', /الحمرا|الخضرا|اللي فوق|من فوق|اللي تحت|على الشمال|على اليمين/],
    ['«أنت» or «انت» instead of «إنت»', /(^|[\s«])(أنت|انت)([\s،.؟»]|$)/],
    ['«النهاردة» instead of «النهارده»', /النهاردة/],
    ['negation glued to the verb (write «ما … ش»)', /(^|\s)مت[ء-ي]{2,}ش(\s|$|[،.])/],
    ['emoji in interface text', /[\u{1F300}-\u{1FAFF}]|❌|✅|⚠|⭐|️/u],
  ];
  for (const [name, rx] of RULES) {
    it(`no ${name}`, () => {
      expect(journeyArabic.filter(({ s }) => rx.test(s)).map(({ where, s }) => `${where}: ${s.slice(0, 60)}`)).toEqual([]);
    });
  }

  it('the rest of the dictionary only gets better (MSA left outside the journey may not grow)', () => {
    // Admin, organisation and trainer messages still say «تم …», «قيد …»,
    // «بلا …»: they are fixed with each screen's migration. 25 at Phase 1.1.
    const msa = /(^|\s)تم\s|قيد\s|يرجى|الرجاء|لم يتم|لا يوجد|لا توجد|جاري\s|يتعين|سوف\s|(^|\s)بلا\s|أثناء|(^|\s)أنت(\s|$)/;
    expect([...DICT.values()].filter(v => msa.test(v.ar)).length).toBeLessThanOrEqual(25);
  });
});

describe('one word per concept', () => {
  const lesson = code('features/lesson/LessonFlow.tsx');
  it('the lesson\'s check is «أسئلة سريعة», its exercise «تمرين»: «اختبار» is not a journey word', () => {
    expect(lesson).toMatch(/quiz: 'أسئلة سريعة'/);
    expect(lesson).toMatch(/practice: 'تمرين'/);
    expect(journeyArabic.filter(({ s }) => /اختبار/.test(s)).map(({ where }) => where)).toEqual([]);
  });
  it('the exam is «امتحان الوحدة», the boss is «التحدّي», the debrief is «مراجعة اليوم»', () => {
    expect(t('sh.unitexam', 'ar')).toBe('امتحان الوحدة');
    expect(t('as.boss', 'ar')).toBe('التحدّي');
    expect(t('rv.mode', 'ar')).toBe('مراجعة اليوم');
    expect(t('jr.reviewtitle', 'ar')).toBe('مراجعة اليوم');
    expect(journeyArabic.filter(({ s }) => /محاكاة تشغيلية|مراجعة القرار المهني/.test(s)).map(({ where }) => where)).toEqual([]);
  });
  it('«جاهز» is kept for certification: the lesson says how ready it is to use, not «ready»', () => {
    expect(lesson).not.toMatch(/'جاهز'/);
    expect(t('wc.readybody', 'ar')).toMatch(/تقييم الجاهزية/);
    expect(t('wc.readybody', 'ar')).not.toMatch(/عملاء حقيقيين/);
  });
  it('the administrator is «مسؤول النظام» everywhere a trainee meets one', () => {
    for (const k of ['door.err.noaccess', 'door.forgothelp', 'sh.noaccessbody'] as Key[]) expect(t(k, 'ar')).toMatch(/مسؤول النظام/);
  });
  it('the academy has one name', () => {
    expect(journeyArabic.filter(({ s }) => /أكاديمية عمليات العضوية(?!ات)/.test(s)).map(({ where }) => where)).toEqual([]);
  });
});

describe('controls: one word per action', () => {
  it('the control words are the system\'s', () => {
    const want: Array<[Key, string, string]> = [
      ['flow.done', 'تم', 'Done'], ['rt.donetoday', 'تم', 'Done'], ['as.exit', 'خروج', 'Exit'],
      ['dlg.close', 'إغلاق', 'Close'], ['dlg.cancel', 'إلغاء', 'Cancel'], ['mr.back', 'رجوع', 'Back'],
      ['rt.next', 'التالي', 'Next'], ['ex.retry', 'جرّب تاني', 'Try again'], ['err.retry', 'جرّب تاني', 'Try again'],
    ];
    for (const [k, ar, en] of want) { expect(t(k, 'ar'), k).toBe(ar); expect(t(k, 'en'), k).toBe(en); }
  });
  it('a step forward inside a flow is «التالي» — «كمّل» resumes something paused', () => {
    for (const f of ['features/lesson/LessonFlow.tsx', 'features/lesson/PracticeStage.tsx', 'features/lesson/ProductionStage.tsx', 'features/review/DecisionReview.tsx']) {
      expect(code(f), f).not.toMatch(/>\s*كمّل\s*<(Icon|ArrowRight)/);
    }
  });
  it('sending for review is «ابعت»; nothing is «قدّم» or «سجّل» for review', () => {
    expect(t('db.submitrev', 'ar')).toMatch(/^ابعت/);
    expect(code('features/review/DecisionReview.tsx')).toMatch(/'ابعت المراجعة'/);
    expect(journeyArabic.filter(({ s }) => /قدّم للمراجعة|سجّل المراجعة/.test(s)).map(({ where }) => where)).toEqual([]);
  });
  it('the way out of a flow names the place the navigation names', () => {
    expect(t('nav.academy', 'ar')).toBe('الأكاديمية');
    expect(t('ex.backtopath', 'ar')).toBe('ارجع للأكاديمية');
  });
});

describe('both languages, every key', () => {
  // The language switch speaks the language it switches to.
  const CROSS = new Set(['lang.switch', 'lang.aria', 'ref.placeholder']);
  // No words to translate: a dash, a template.
  const SYMBOLS = new Set(['us.assignnone', 'ref.found']);
  // Known debt outside the journey: trainer and manager «من {n} أيام» glued
  // from parts, English half empty. Fixed with those screens; listed, not hidden.
  const GLUED = new Set(['tn.daysago', 'mg.dayssince']);
  it('every entry has Arabic and English, and each is in its own script', () => {
    const bad: string[] = [];
    for (const [k, v] of DICT) {
      if (GLUED.has(k)) continue;
      if (!v.ar.trim() || !v.en.trim()) bad.push(`${k}: empty`);
      if (CROSS.has(k) || SYMBOLS.has(k)) continue;
      if (!AR.test(v.ar)) bad.push(`${k}: Arabic side has no Arabic`);
      if (AR.test(v.en)) bad.push(`${k}: English side has Arabic`);
    }
    expect(bad).toEqual([]);
  });
  it('the journey\'s English is sentence case, with one apostrophe', () => {
    const PROPER = /Wadi Degla|Membership Operations Academy|Membership/g;
    const offenders = journeyKeys.filter(k => DICT.has(k) && !CROSS.has(k)).filter(k => {
      const en = DICT.get(k)!.en.replace(PROPER, 'x');
      return /\b[A-Z][a-z]+ [A-Z][a-z]+/.test(en) || en.includes("'");
    });
    expect(offenders).toEqual([]);
  });
});

describe('states say what happened and what is next', () => {
  it('pending review: it is with the trainer, and nothing is needed from you', () => {
    expect(t('db.waiting', 'ar')).toMatch(/مستنية مراجعته/);
    expect(t('db.waiting', 'ar')).toMatch(/مش مطلوب منك حاجة دلوقتي/);
    expect(t('ex.toreview', 'ar')).toBe('الوحدة اتبعتت لمدربك للمراجعة. اللي بعدها بتتفتح لما يعتمدها.');
  });
  it('a missed exam is another attempt, never a verdict on the trainee', () => {
    expect(t('as.notyet', 'ar')).toBe('محتاج محاولة تانية');
    expect(t('as.notyet', 'en')).toBe('Another attempt needed');
  });
  it('a save error says what is safe and what to do', () => {
    expect(t('err.save', 'ar')).toBe('ما اتحفظش. جرّب تاني، واللي كتبته لسه هنا.');
  });
  it('rework names who asked and where to start', () => {
    expect(t('pv.rejectedbody', 'ar')).toMatch(/مدربك .* وطلب تحسين/);
    expect(t('path.needswork', 'ar')).toMatch(/ابدأ من الدروس اللي مدربك حدّدها/);
  });
});
