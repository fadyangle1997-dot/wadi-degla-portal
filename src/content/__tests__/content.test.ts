import { describe, it, expect } from 'vitest';
import { MODULES, BOSS_BATTLES, curriculumStats } from '../registry';
import { SKILLS } from '../skills';
import { READINESS_WEIGHTS } from '../../domain/policy';
import { ALL_CONDUCT_CHECKS, conductPassed } from '../../domain/evaluation';

describe('content integrity', () => {
  it('every module has a bigQuestion and lessons', () => {
    for (const m of MODULES) { expect(m.bigQuestion.length).toBeGreaterThan(0); expect(m.lessons.length).toBeGreaterThan(0); }
  });
  it('every lesson answers one employee question', () => {
    for (const m of MODULES) for (const l of m.lessons) expect(l.employeeQuestion.length).toBeGreaterThan(0);
  });
  it('every quiz question has exactly one correct option', () => {
    const all = MODULES.flatMap(m => [...m.lessons.flatMap(l => l.quickQuiz), ...m.unitExam]);
    for (const q of all) expect(q.options.filter(o => o.correct).length, q.prompt).toBe(1);
  });
  it('every review pointer targets a real lesson', () => {
    const ids = new Set(MODULES.flatMap(m => m.lessons.map(l => l.id)));
    const qs = MODULES.flatMap(m => [...m.lessons.flatMap(l => l.quickQuiz), ...m.unitExam]);
    for (const q of qs) if (q.reviewLessonId) expect(ids.has(q.reviewLessonId)).toBe(true);
  });
  it('every boss battle step has exactly one correct option', () => {
    for (const b of BOSS_BATTLES) for (const s of b.steps) expect(s.options.filter(o => o.correct).length).toBe(1);
  });
  it('every boss battle has at least one decision (the challenge screen needs one to open on)', () => {
    for (const b of BOSS_BATTLES) expect(b.steps.length, b.id).toBeGreaterThan(0);
  });

  it('every lesson has objective, ≥1 skill, an example, and a prediction beat', () => {
    for (const m of MODULES) for (const l of m.lessons) {
      expect(l.objective.startsWith('بعد الدرس ده'), l.id).toBe(true);
      expect(l.skills.length).toBeGreaterThanOrEqual(1);
      expect(l.example.length).toBeGreaterThan(0);
      expect(l.prediction.options.filter(o => o.correct).length).toBe(1);
    }
  });
  it('every module declares skills and an unlock rule', () => {
    for (const m of MODULES) {
      expect(m.skills.length).toBeGreaterThanOrEqual(1);
      expect(m.unlock).toBeDefined();
    }
  });
  it('every skill referenced by a lesson exists in the skill catalogue', () => {
    const catalogue = new Set(Object.keys(SKILLS));
    for (const m of MODULES) for (const l of m.lessons) for (const t of l.skills) {
      expect(catalogue.has(t.skill), `${l.id} → ${t.skill}`).toBe(true);
    }
  });


  it('CONTRACT: every lesson has at least 1 quick-quiz question (assessment model)', () => {
    for (const m of MODULES) for (const l of m.lessons) {
      expect(l.quickQuiz.length, `${m.code} / ${l.id}`).toBeGreaterThanOrEqual(1);
    }
  });
  it('CONTRACT: every unit exam has at least 8 questions (approved depth)', () => {
    for (const m of MODULES) {
      expect(m.unitExam.length, m.code).toBeGreaterThanOrEqual(8);
    }
  });
  it('CONTRACT: every lesson has an explicit canNow achievement', () => {
    for (const m of MODULES) for (const l of m.lessons) {
      expect(l.canNow.length, l.id).toBeGreaterThan(0);
      expect(l.canNow.startsWith('بعد الدرس')).toBe(false);
    }
  });

  it('curriculum has meaningful volume', () => {
    const s = curriculumStats();
    expect(s.units).toBeGreaterThanOrEqual(3); expect(s.lessons).toBeGreaterThanOrEqual(10); expect(s.quickChecks).toBeGreaterThanOrEqual(10);
  });
});

describe('LAYER 1 — the identity anchor must stay on day 1', () => {
  it('«إنت صوت النادي» lives in the FIRST unit, not a later one', () => {
    // The placement IS the design: taught before any rule it forms identity;
    // taught in week 4 it becomes a topic. This test stops it drifting later.
    const m1 = MODULES.find(m => m.id === 'm1')!;
    expect(m1.timeline).toContain('1');
    expect(m1.lessons.some(l => l.id === 'l3-club-voice')).toBe(true);
  });

  it('no LATER unit introduces clubVoice — the anchor cannot move', () => {
    for (const m of MODULES.filter(m => m.id !== 'm1')) {
      const introduces = m.lessons.some(l =>
        l.skills?.some(s => s.skill === 'clubVoice' && s.level === 'introduced'));
      expect(introduces, `${m.id} must not introduce clubVoice`).toBe(false);
    }
  });

  it('the anchor teaches the never-say list with a reason for each', () => {
    const lesson = MODULES.find(m => m.id === 'm1')!.lessons.find(l => l.id === 'l3-club-voice')!;
    const text = JSON.stringify(lesson);
    // Every forbidden sentence from the direction document is covered.
    for (const phrase of ['دي سياسة وخلاص', 'مش ذنبي', 'النظام واقع', 'هظبّطهالك', 'المكتب التاني']) {
      expect(text, phrase).toContain(phrase);
    }
  });
});

describe('EVALUATION — the engine scores the programme the club actually runs', () => {
  it('the seven KPI weights match the official guide and sum to 1', () => {
    expect(READINESS_WEIGHTS).toEqual({
      docReview: 0.25, ruleCompliance: 0.20, accuracy: 0.15,
      memberService: 0.15, systemUsage: 0.10, problemSolving: 0.10, teamwork: 0.05,
    });
    const sum = Object.values(READINESS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });

  it('conduct is observable and binary — never an opinion', () => {
    // "Sounds professional" cannot be graded consistently; these can.
    expect(ALL_CONDUCT_CHECKS).toHaveLength(4);
    expect(conductPassed({ refusalTiedToRule: true, noOutOfPolicyPromise: true,
                           closedWithNextStep: true, noBlameShifting: true })).toBe(true);
    // Fail-closed: one unseen behaviour is a fail, and a missing answer is not a pass.
    expect(conductPassed({ refusalTiedToRule: true, noOutOfPolicyPromise: false,
                           closedWithNextStep: true, noBlameShifting: true })).toBe(false);
    expect(conductPassed({ refusalTiedToRule: true })).toBe(false);
    expect(conductPassed({})).toBe(false);
  });
});

describe('LAYER 2 — knowledge and communication are inseparable', () => {
  const M2 = MODULES.filter(m => m.id.startsWith('m2'));

  it('EVERY operational lesson in Module 2 carries a communication insight', () => {
    // The rule the layer exists to enforce: a trainee never learns a regulation
    // without learning the delivery risk attached to it.
    for (const m of M2) {
      for (const l of m.lessons) {
        expect(l.comms, `${m.id}/${l.id} has no comms insight`).toBeDefined();
        expect(l.comms!.risk.length).toBeGreaterThan(10);
        expect(l.comms!.why.length).toBeGreaterThan(20);
        expect(l.comms!.instead.length).toBeGreaterThan(10);
      }
    }
  });

  it('🔴 NO TEMPLATES — every risk in Module 2 is distinct', () => {
    // Identical advice repeated 18 times would produce memorisation, which is
    // exactly what the layer is designed to prevent.
    const risks = M2.flatMap(m => m.lessons.map(l => l.comms!.risk));
    expect(new Set(risks).size).toBe(risks.length);
  });

  it('the "instead" guidance is distinct too — not one principle reworded', () => {
    const instead = M2.flatMap(m => m.lessons.map(l => l.comms!.instead));
    expect(new Set(instead).size).toBe(instead.length);
  });

  it('🔴 REGISTRATION talks to SALES — never to a member', () => {
    // The applicant is Sales' customer. Membership reviews the file and returns
    // it through Sales. Inventing a counter conversation would teach a workflow
    // that does not exist.
    const m2_1 = MODULES.find(m => m.id === 'm2_1')!;
    for (const l of m2_1.lessons) {
      expect(l.comms!.audience, `${l.id}`).toBe('sales');
    }
  });

  it('joining, separation and transactions talk to the MEMBER', () => {
    // Real member interaction begins once the applicant is a member.
    for (const id of ['m2_2', 'm2_3', 'm2_4']) {
      const m = MODULES.find(x => x.id === id)!;
      for (const l of m.lessons) expect(l.comms!.audience, `${id}/${l.id}`).toBe('member');
    }
  });

  it('no registration lesson stages the applicant at the counter', () => {
    // Guards the operational correction against regression.
    const m2_1 = JSON.stringify(MODULES.find(m => m.id === 'm2_1')!);
    for (const wrong of ['جاية تسجّل', 'تطلب منها', 'تطلب منه']) {
      expect(m2_1, `staging error: ${wrong}`).not.toContain(wrong);
    }
  });
});

describe('⭐ الأفضل — a principle, never a script', () => {
  const M2 = MODULES.filter(m => m.id.startsWith('m2'));

  it('no best-practice hands the trainee a sentence to memorise', () => {
    // A quoted full sentence («…») inside the guidance is a script. Short
    // quoted fragments are fine — they name a phrase, they do not supply one.
    for (const m of M2) {
      for (const l of m.lessons) {
        for (const quoted of l.comms!.instead.match(/«[^»]*»/g) ?? []) {
          expect(quoted.length, `${m.id}/${l.id}: scripted line ${quoted}`).toBeLessThan(30);
        }
      }
    }
  });

  it('every best-practice states a BEHAVIOUR and why it works', () => {
    for (const m of M2) {
      for (const l of m.lessons) {
        // The principle is always emphasised — the "why" that outlives the case.
        expect(l.comms!.instead, `${m.id}/${l.id}`).toContain('**');
        expect(l.comms!.instead.length).toBeGreaterThan(40);
      }
    }
  });

  it('🔴 all 18 best-practices are distinct — no copy/paste across regulations', () => {
    const best = M2.flatMap(m => m.lessons.map(l => l.comms!.instead));
    expect(best).toHaveLength(18);
    expect(new Set(best).size).toBe(18);
  });

  it('the trap and the best-practice are never the same text', () => {
    for (const m of M2) {
      for (const l of m.lessons) {
        expect(l.comms!.instead).not.toBe(l.comms!.risk);
      }
    }
  });
});

describe('LAYER 3 — تمثيل وادي دجلة', () => {
  const m3 = () => MODULES.find(m => m.id === 'm3')!;

  it('the module is named for the STANCE, not the reaction', () => {
    // «التعامل مع الأعضاء» describes something happening TO you — it switches on
    // only for an angry member. «تمثيل وادي دجلة» is carried in every interaction.
    expect(m3().title).toBe('تمثيل وادي دجلة');
  });

  it('has exactly six lessons ordered normal → difficult', () => {
    const ids = m3().lessons.map(l => l.id);
    expect(ids).toEqual([
      'l1-explain-rule',        // the ordinary 90%
      'l2-request-documents',
      'l3-professional-refusal',
      'l4-listen-acknowledge',  // the difficult 10%
      'l5-diagnose-next-step',
      'l6-right-under-pressure',
    ]);
  });

  it('🔴 the ordinary 90% comes FIRST — de-escalation is never taught before explanation', () => {
    // The previous version taught four lessons about the angry member and
    // skipped the ordinary question. This freezes the corrected order.
    const ids = m3().lessons.map(l => l.id);
    expect(ids.indexOf('l1-explain-rule')).toBeLessThan(ids.indexOf('l4-listen-acknowledge'));
    expect(ids.indexOf('l3-professional-refusal')).toBeLessThan(ids.indexOf('l4-listen-acknowledge'));
  });

  it('every lesson carries a wrong AND a right conversation, each explained', () => {
    for (const l of m3().lessons) {
      expect(l.dialogue, `${l.id} has no dialogue`).toBeDefined();
      expect(l.dialogue!.wrong.length).toBeGreaterThanOrEqual(2);
      expect(l.dialogue!.right.length).toBeGreaterThanOrEqual(2);
      expect(l.dialogue!.whyWrongFails.length).toBeGreaterThan(30);
      expect(l.dialogue!.whyRightWorks.length).toBeGreaterThan(30);
      expect(l.dialogue!.setup.length).toBeGreaterThan(10);
    }
  });

  it('🔴 both versions answer the SAME member — only delivery differs', () => {
    // If the wrong version never lets the member speak, it is a strawman, not a
    // lesson. The point is that the rule was never the problem.
    for (const l of m3().lessons) {
      expect(l.dialogue!.wrong.some(d => d.speaker === 'member'), l.id).toBe(true);
      expect(l.dialogue!.right.some(d => d.speaker === 'member'), l.id).toBe(true);
      expect(l.dialogue!.wrong.some(d => d.speaker === 'staff'), l.id).toBe(true);
      expect(l.dialogue!.right.some(d => d.speaker === 'staff'), l.id).toBe(true);
    }
  });

  it('every objective states BOTH an operational and a professional aim', () => {
    for (const l of m3().lessons) {
      expect(l.objective, l.id).toContain('تشغيليًا');
      expect(l.objective, l.id).toContain('مهنيًا');
    }
  });

  it('🔴 does NOT re-teach the m1 identity anchor — learning is cumulative', () => {
    // The old lesson «العضو مش بيحكم على اللائحة» is gone: m1 owns that on day 1.
    for (const l of m3().lessons) {
      expect(l.skills.some(s => s.skill === 'clubVoice' && s.level === 'introduced'), l.id).toBe(false);
    }
  });

  it('builds the six representation competencies', () => {
    const skills = new Set(m3().lessons.flatMap(l => l.skills.map(s => s.skill)));
    for (const s of ['ruleExplanation', 'documentRequest', 'professionalRefusal',
                     'memberHandling', 'problemDiagnosis', 'pressureComposure']) {
      expect(skills.has(s), s).toBe(true);
    }
  });
});

describe('PRODUCTION — the trainee makes the sentence, never picks it', () => {
  const m3 = () => MODULES.find(m => m.id === 'm3')!;

  it('🔴 every representation lesson ends in production, not recognition', () => {
    // The audit found 169 assessment moments and every one was multiple choice:
    // a trainee could finish the module that teaches HOW TO SPEAK without ever
    // speaking, and would say the sentence first in front of a real member.
    for (const l of m3().lessons) {
      expect(l.production, `${l.id} has no production stage`).toBeDefined();
      expect(l.production!.task.length).toBeGreaterThan(40);
    }
  });

  it('production happens out loud or with a person — not on a keyboard', () => {
    for (const l of m3().lessons) {
      expect(['speak', 'roleplay'], l.id).toContain(l.production!.mode);
    }
  });

  it('every production carries criteria — a retry without criteria is a re-guess', () => {
    for (const l of m3().lessons) {
      expect(l.production!.criteria.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.production!.commonMisses.length, l.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('criteria are observable acts the trainee can self-check', () => {
    for (const l of m3().lessons) {
      for (const c of l.production!.criteria) expect(c.length, `${l.id}: ${c}`).toBeGreaterThan(15);
    }
  });

  it('🔴 the tasks are all different — no template production stage', () => {
    const tasks = m3().lessons.map(l => l.production!.task);
    expect(new Set(tasks).size).toBe(tasks.length);
  });
});

describe('DIALOGUE — real counter Egyptian, not textbook Arabic', () => {
  it('members speak the way members actually speak', () => {
    // Lines a Membership Advisor hears every week. If none of these appear
    // anywhere, the dialogues drifted back into written Arabic.
    const all = JSON.stringify(MODULES.find(m => m.id === 'm3')!);
    const real = ['طب ليه', 'طب أنا مالي', 'طب هو كل مرة', 'أنا عضو من زمان',
                  'طب أكلم مين', 'طب مفيش استثناء', 'ما المكتب التاني', 'يعني الموضوع خلص'];
    const found = real.filter(p => all.includes(p));
    expect(found.length, `only found: ${found.join(' · ')}`).toBeGreaterThanOrEqual(6);
  });
});

describe('🚫 NEVER hardcode a birth year — content must not rot on 1 January', () => {
  it('no lesson, exam or scenario ties a rule to a year of birth', () => {
    // «25 سنة» is «مواليد 2001» during one calendar year and then silently
    // false — while the platform keeps teaching it with full confidence. Every
    // tier is keyed on age at execution; the prose must say the same.
    const content = JSON.stringify(MODULES);
    expect(content, 'a birth year leaked back into content').not.toMatch(/مواليد\s*\d{4}/);
  });

  it('no age is annotated with the year it corresponds to', () => {
    // Catches «26 سنة (2000)» — the same rot wearing brackets.
    const content = JSON.stringify(MODULES);
    expect(content).not.toMatch(/\d{2}\s*سنة\s*\(\s*(19|20)\d{2}\s*\)/);
  });

  it('age-based tiers are still taught — the rule itself is intact', () => {
    const sep = JSON.stringify(MODULES.find(m => m.id === 'm2_3')!);
    for (const age of ['25 سنة', '26 سنة', '27 سنة', '28 سنة']) {
      expect(sep, age).toContain(age);
    }
  });
});
