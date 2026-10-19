import { describe, it, expect } from 'vitest';
import { JUDGMENT_BANK_1, COUNTER_MISTAKES, COUNTER_WISDOM } from '../judgmentBank1';
import { ALL_DIMENSIONS } from '../../../domain/evaluation';

const B = JUDGMENT_BANK_1;

describe('🔴 the learner is STANDING at the counter, not reading an exam', () => {
  it('every item opens with a time, a floor and the member\'s own words', () => {
    // Facts are how an examiner describes a situation. A real one arrives as a
    // time, a room, and a sentence — and the whole point is the first 5 seconds.
    for (const q of B) {
      expect(q.moment.time, q.id).toMatch(/\d/);
      expect(q.moment.floor.length, q.id).toBeGreaterThan(20);
      expect(q.moment.opening.startsWith('«'), `${q.id}: opening must be the member speaking`).toBe(true);
    }
  });

  it('🚫 no item opens with exam narration', () => {
    for (const q of B) {
      for (const banned of ['يرغب العميل', 'لا يجوز', 'هذا مخالف', 'أحمد يريد']) {
        expect(JSON.stringify(q.moment), q.id).not.toContain(banned);
      }
    }
  });

  it('every floor is operationally different — not decoration reshuffled', () => {
    expect(new Set(B.map(q => q.moment.floor)).size).toBe(B.length);
  });
});

describe('🔴 pressure is never random — each source tests ONE behaviour', () => {
  it('every pressure names what it probes', () => {
    // A crying child that tests nothing is drama, and drama teaches the learner
    // to skim the setup.
    for (const q of B) {
      expect(q.pressure.source.length, q.id).toBeGreaterThan(8);
      expect(q.pressure.tests.length, q.id).toBeGreaterThan(25);
      expect(q.pressure.tests, `${q.id}: must pose a behavioural question`).toContain('؟');
    }
  });

  it('pressure sources vary across the bank', () => {
    expect(new Set(B.map(q => q.pressure.source)).size).toBeGreaterThanOrEqual(B.length - 1);
  });

  it('at least one item has NO operational pressure — judgment must hold when calm', () => {
    // If every item is loud, the learner learns that calm means safe.
    expect(B.some(q => /مفيش ضغط/.test(q.pressure.source))).toBe(true);
  });
});

describe('🔴 teach thinking — never «لأن اللائحة بتقول»', () => {
  it('every item explains the BEGINNER\'S thinking mistake', () => {
    for (const q of B) {
      expect(q.beginnerThinking.length, q.id).toBeGreaterThan(120);
      // It must describe a mental process, not restate the rule.
      expect(q.beginnerThinking, `${q.id}: names the person, not the policy`).toMatch(/المبتدئ|الموظف/);
    }
  });

  it('🚫 no beginner explanation hides behind the policy', () => {
    for (const q of B) {
      expect(q.beginnerThinking, q.id).not.toMatch(/^لأن اللائحة/);
    }
  });

  it('every item explains what the expert does differently', () => {
    for (const q of B) {
      expect(q.expertThinking.length, q.id).toBeGreaterThan(100);
      expect(q.expertThinking, q.id).toContain('المحترف');
    }
  });
});

describe('🔴 workflow over outcome — the first action is the competence', () => {
  it('most items ask about sequence, not the final decision', () => {
    const workflow = B.filter(q =>
      ['first_action', 'next_step', 'prioritization', 'must_not_assume'].includes(q.questionType));
    expect(workflow.length / B.length).toBeGreaterThanOrEqual(0.5);
  });

  it('formats vary — no single template', () => {
    expect(new Set(B.map(q => q.questionType)).size).toBeGreaterThanOrEqual(5);
  });
});

describe('wrong answers are real mistakes, never jokes', () => {
  it('four options, exactly one correct', () => {
    for (const q of B) {
      expect(q.options, q.id).toHaveLength(4);
      expect(q.options.filter(o => o.correct), q.id).toHaveLength(1);
    }
  });

  it('🔴 every wrong option explains why a beginner would believe it', () => {
    for (const q of B) {
      for (const o of q.options.filter(x => !x.correct)) {
        expect(o.why.length, `${q.id}: ${o.text.slice(0, 30)}`).toBeGreaterThan(40);
      }
    }
  });
});

describe('🚫 hard NEVER means remembering a number', () => {
  it('no hard prompt asks for a figure', () => {
    for (const q of B.filter(x => x.difficulty === 'hard')) {
      expect(q.prompt, q.id).not.toMatch(/كام\s*(جنيه|%)/);
      expect(q.prompt, q.id).not.toContain('احسب');
    }
  });

  it('hard items turn on judgment — what to verify, which document, what order', () => {
    for (const q of B.filter(x => x.difficulty === 'hard')) {
      expect(['must_not_assume', 'first_action', 'find_mistake', 'prioritization'], q.id)
        .toContain(q.questionType);
    }
  });
});

describe('🚫 never measure memory or communication', () => {
  it('no definition or counting prompts', () => {
    for (const q of B) {
      for (const banned of ['ما هو', 'كم عدد', 'اختر التعريف', 'عرّف ']) {
        expect(q.prompt, q.id).not.toContain(banned);
      }
    }
  });

  it('no item measures tone or empathy — those belong to Production', () => {
    for (const q of B) {
      expect(q.moduleId, q.id).not.toBe('m3');
      for (const banned of ['نبرة', 'تعاطف', 'أسلوب الكلام']) {
        expect(q.prompt, q.id).not.toContain(banned);
      }
    }
  });
});

describe('traceability', () => {
  it('every item names its policy and its review date', () => {
    for (const q of B) {
      expect(q.policySource.length, q.id).toBeGreaterThan(30);
      expect(q.reviewDate, q.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ALL_DIMENSIONS, q.id).toContain(q.competency);
    }
  });

  it('🚫 no birth year anywhere', () => {
    const all = JSON.stringify(B);
    expect(all).not.toMatch(/مواليد\s*\d{4}/);
    expect(all).not.toMatch(/\d{2}\s*سنة\s*\(\s*(19|20)\d{2}\s*\)/);
  });

  it('ids unique · 70% high risk', () => {
    expect(new Set(B.map(q => q.id)).size).toBe(B.length);
    expect(B.filter(q => q.riskTier === 'high').length / B.length).toBeGreaterThanOrEqual(0.7);
  });

  it('real counter language across the bank', () => {
    const all = JSON.stringify(B);
    const real = ['طب بسرعة', 'ما المكتب التاني عملها', 'أنا عضو من زمان',
                  'يعني الموضوع خلص', 'طب استثناء المرة دي', 'ضيّعت ساعة', 'مش بطلب حاجة خاصة'];
    expect(real.filter(p => all.includes(p)).length).toBeGreaterThanOrEqual(6);
  });
});

describe('Common Counter Mistakes — a pattern, not a summary', () => {
  it('one page per five items', () => {
    for (const cm of COUNTER_MISTAKES) expect(cm.afterItems, cm.id).toHaveLength(5);
  });

  it('every page names the mistake, why it happens, and what experts do', () => {
    for (const cm of COUNTER_MISTAKES) {
      expect(cm.mistake.length, cm.id).toBeGreaterThan(80);
      expect(cm.whyItHappens.length, cm.id).toBeGreaterThan(120);
      expect(cm.whatExpertsDo.length, cm.id).toBeGreaterThan(80);
      expect(cm.takeaway.length, cm.id).toBeGreaterThan(25);
    }
  });

  it('🔴 stays under a minute — a long page is not a one-minute page', () => {
    // ~200 Arabic words a minute. Past that it stops being read.
    for (const cm of COUNTER_MISTAKES) {
      const words = [cm.mistake, cm.whyItHappens, cm.whatExpertsDo, cm.takeaway]
        .join(' ').split(/\s+/).length;
      expect(words, `${cm.id}: ${words} words`).toBeLessThan(200);
    }
  });

  it('every referenced item exists', () => {
    const ids = new Set(B.map(q => q.id));
    for (const cm of COUNTER_MISTAKES) {
      for (const i of cm.afterItems) expect(ids.has(i), `${cm.id} → ${i}`).toBe(true);
    }
  });

  it('🚫 no page repeats another\'s takeaway', () => {
    const t = COUNTER_MISTAKES.map(c => c.takeaway);
    expect(new Set(t).size).toBe(t.length);
  });
});

describe('COUNTER WISDOM — an instinct, not a poster', () => {
  it('one line per five items, and every item it covers exists', () => {
    const ids = new Set(B.map(q => q.id));
    for (const w of COUNTER_WISDOM) {
      expect(w.afterItems, w.id).toHaveLength(5);
      for (const i of w.afterItems) expect(ids.has(i), `${w.id} → ${i}`).toBe(true);
    }
  });

  it('🔴 ONE sentence — an instinct you have to unpack is not an instinct', () => {
    for (const w of COUNTER_WISDOM) {
      // Two clauses at most («X — بس Y»). Anything longer is a paragraph.
      const enders = (w.line.match(/[.؟!]/g) ?? []).length;
      expect(enders, `${w.id}: ${w.line}`).toBeLessThanOrEqual(2);
      expect(w.line.split(/\s+/).length, `${w.id}: too long to stick`).toBeLessThan(14);
    }
  });

  it('🔴 NEVER motivational — feeling professional is not being professional', () => {
    // The line that only makes you feel good changes nothing about the next
    // five seconds at the counter.
    const poster = ['بحب', 'طموح', 'تميّز', 'إبداع', 'آمن بنفسك', 'النجاح', 'اسعى', 'كن الأفضل', 'شغف'];
    for (const w of COUNTER_WISDOM) {
      for (const p of poster) expect(w.line, `${w.id}: motivational — "${p}"`).not.toContain(p);
    }
  });

  it('🔴 NEVER philosophical — it must be actionable in ten seconds', () => {
    // The test: does it tell you what to DO or hold, right now? A line about
    // what things "mean" is philosophy and belongs in the bin.
    const philosophy = ['الحياة', 'معنى', 'جوهر', 'قيمة الإنسان', 'في النهاية', 'دايمًا افتكر'];
    for (const w of COUNTER_WISDOM) {
      for (const p of philosophy) expect(w.line, `${w.id}: philosophical — "${p}"`).not.toContain(p);
      // Must name a concrete counter act or force — never an abstraction alone.
      expect(w.line, `${w.id}: no operational verb`).toMatch(/تطلب|تتأكد|تحسب|تقول|ترتيب|تشتغل|تراجع|سرعتك|ورقة|رقم|قرار/);
    }
  });

  it('🚫 wisdom is NOT policy — no numbers, no rule names', () => {
    // The moment it carries a figure it rots with the manual. These lines must
    // outlive every fee in the club.
    for (const w of COUNTER_WISDOM) {
      expect(w.line, `${w.id}: carries a number`).not.toMatch(/\d/);
      for (const rule of ['اللائحة بتقول', 'المادة', 'البند']) {
        expect(w.line, `${w.id}: quotes policy`).not.toContain(rule);
      }
    }
  });

  it('🚫 wisdom never repeats a takeaway — they do different jobs', () => {
    // The takeaway closes five cases. The wisdom outlives them.
    const takeaways = new Set(COUNTER_MISTAKES.map(c => c.takeaway));
    for (const w of COUNTER_WISDOM) expect(takeaways.has(w.line), w.id).toBe(false);
  });

  it('every line is distinct', () => {
    const lines = COUNTER_WISDOM.map(w => w.line);
    expect(new Set(lines).size).toBe(lines.length);
  });
});
