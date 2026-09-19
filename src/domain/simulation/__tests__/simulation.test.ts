import { describe, it, expect } from 'vitest';
import { ARCHETYPES, archetypeById, STATE_LABEL, DISTRACTOR_BANK, isBehaviouralReflection } from '../index';
import { MODULES } from '../../../content/registry';

describe('ARCHETYPES — you face a person, not a line', () => {
  it('covers the seven people an advisor actually meets', () => {
    expect(ARCHETYPES.map(a => a.id).sort()).toEqual(
      ['angry', 'anxious', 'comparer', 'negotiator', 'rushed', 'skeptic', 'veteran']);
  });

  it('🔴 every archetype separates what they DO from what they WANT', () => {
    // The gap between the two is where every beginner mistake lives: they
    // answer the behaviour and miss the need.
    for (const a of ARCHETYPES) {
      expect(a.does.length, a.id).toBeGreaterThan(20);
      expect(a.wants.length, a.id).toBeGreaterThan(20);
      expect(a.wants, a.id).not.toBe(a.does);
    }
  });

  it('🔴 every trap is DIFFERENT — the trap comes from that person, not a template', () => {
    const traps = ARCHETYPES.map(a => a.trap);
    expect(new Set(traps).size).toBe(traps.length);
    for (const t of traps) expect(t.length).toBeGreaterThan(30);
  });

  it('each names what moves them AND what hardens them', () => {
    for (const a of ARCHETYPES) {
      expect(a.movesWhen.length, a.id).toBeGreaterThan(20);
      expect(a.hardensWhen.length, a.id).toBeGreaterThan(20);
      expect(a.movesWhen).not.toBe(a.hardensWhen);
    }
  });

  it('every opening state has a label', () => {
    for (const a of ARCHETYPES) expect(STATE_LABEL[a.opensAs], a.id).toBeTruthy();
  });
});

describe('STATE ARC — success is the member moving, not you performing', () => {
  const m3 = () => MODULES.find(m => m.id === 'm3')!;

  it('🔴 every simulation starts in one state and targets another', () => {
    // Saying a flawless refusal to someone who leaves just as angry is
    // performance, not success.
    for (const l of m3().lessons) {
      const arc = l.production!.arc;
      expect(arc, `${l.id} has no arc`).toBeDefined();
      expect(arc!.opensAs).not.toBe(arc!.targetState);
    }
  });

  it('the shift is proven by observable signs, not by a feeling', () => {
    for (const l of m3().lessons) {
      expect(l.production!.arc!.signsOfShift.length, l.id).toBeGreaterThanOrEqual(2);
      for (const s of l.production!.arc!.signsOfShift) expect(s.length).toBeGreaterThan(15);
    }
  });

  it('every arc state is a known state', () => {
    for (const l of m3().lessons) {
      const arc = l.production!.arc!;
      expect(STATE_LABEL[arc.opensAs as keyof typeof STATE_LABEL], l.id).toBeTruthy();
      expect(STATE_LABEL[arc.targetState as keyof typeof STATE_LABEL], l.id).toBeTruthy();
    }
  });
});

describe('the six lessons face six DIFFERENT people', () => {
  it('🔴 no archetype is reused — the trainee meets a new person each time', () => {
    const used = MODULES.find(m => m.id === 'm3')!.lessons.map(l => l.production!.archetypeId);
    expect(new Set(used).size).toBe(used.length);
    for (const id of used) expect(archetypeById(id!), id).toBeDefined();
  });
});

describe('DISTRACTORS — the counter is never a quiet room', () => {
  const m3 = () => MODULES.find(m => m.id === 'm3')!;

  it('every simulation is interrupted during the encounter', () => {
    for (const l of m3().lessons) {
      expect(l.production!.distractors!.length, l.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('every interruption probes something specific — not just noise', () => {
    for (const l of m3().lessons) {
      for (const d of l.production!.distractors!) {
        expect(d.event.length, l.id).toBeGreaterThan(15);
        expect(d.tests.length, l.id).toBeGreaterThan(20);
      }
    }
  });

  it('pressure accumulates — the bank staggers opening, mid and closing', () => {
    const stages = new Set(DISTRACTOR_BANK.map(d => d.at));
    expect(stages).toEqual(new Set(['opening', 'mid', 'closing']));
  });
});

describe('REFLECTION — one question, about your own conduct', () => {
  const m3 = () => MODULES.find(m => m.id === 'm3')!;

  it('🔴 every simulation ends with exactly ONE reflection', () => {
    for (const l of m3().lessons) {
      expect(l.production!.reflection, l.id).toBeDefined();
      expect(l.production!.reflection!.split('؟').filter(Boolean).length, l.id).toBe(1);
    }
  });

  it('🔴 reflections are behavioural — never knowledge checks', () => {
    // «إيه هي شروط الأخت؟» measures the wrong thing at the wrong moment.
    for (const l of m3().lessons) {
      expect(isBehaviouralReflection(l.production!.reflection!), `${l.id}: ${l.production!.reflection}`).toBe(true);
    }
  });

  it('all six reflections are distinct', () => {
    const rs = m3().lessons.map(l => l.production!.reflection);
    expect(new Set(rs).size).toBe(6);
  });

  it('the detector rejects a knowledge question', () => {
    expect(isBehaviouralReflection('إيه هي شروط ضم الأخت؟')).toBe(false);
    expect(isBehaviouralReflection('يعني إيه غرامة وجوب الضم؟')).toBe(false);
    expect(isBehaviouralReflection('في أنهي لحظة حسّيت إنك هتوعده بحاجة مش في إيدك؟')).toBe(true);
  });
});

describe('PRINCIPLES, not one right sentence', () => {
  it('🔴 criteria judge what the trainee DID — never which words they used', () => {
    // Two trainees can pass with completely different wording. A criterion that
    // quotes a sentence would be a script in disguise.
    for (const l of MODULES.find(m => m.id === 'm3')!.lessons) {
      for (const c of l.production!.criteria) {
        for (const quoted of c.match(/«[^»]*»/g) ?? []) {
          expect(quoted.length, `${l.id}: scripted criterion ${quoted}`).toBeLessThan(32);
        }
      }
    }
  });
});
