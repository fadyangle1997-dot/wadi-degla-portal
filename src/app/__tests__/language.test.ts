/**
 * Language integrity — the audit's language findings, held by test.
 *
 * «1 موظفين», internal codes (M2.3) on trainee screens, «راجع مهاراتك من
 * فوق» on a layout with no «فوق», English sentences with Arabic titles glued
 * in, and a unit's authored timeline that could say different days from the
 * programme. Each of those is a rule here, not a one-off fix.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { arabicCount, staffCount, dayCount, unitsAwaitingYou, lessonCount, skillCount } from '../plural';
import { t } from '../i18n';
import { MODULES } from '../../content/registry';
import { PROGRAM, unitPlace, phaseOfModule } from '../../domain/journey/program';
import { displayNameOf } from '../../domain/identity';
import { LEVEL_NAME, RUBRIC_LEVELS } from '../../domain/rubric';

const SRC = join(__dirname, '../..');
const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  if (f === '__tests__') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const screens = [...walk(join(SRC, 'features')), ...walk(join(SRC, 'ui'))].filter(f => f.endsWith('.tsx'));
const strip = (s: string) => s.replace(/[⁨⁩]/g, '');

describe('Arabic counts agree with their number', () => {
  it('one, two, three-to-ten and eleven-up each take their own form', () => {
    expect(strip(staffCount(1, 'ar'))).toBe('موظف واحد');
    expect(strip(staffCount(2, 'ar'))).toBe('موظفين اتنين');
    expect(strip(staffCount(7, 'ar'))).toBe('7 موظفين');
    expect(strip(staffCount(12, 'ar'))).toBe('12 موظف');
    expect(strip(dayCount(2, 'ar'))).toBe('يومين');
    expect(strip(dayCount(5, 'ar'))).toBe('5 أيام');
    expect(strip(lessonCount(3, 'ar'))).toBe('3 دروس');
    expect(strip(skillCount(23, 'ar'))).toBe('23 مهارة');
  });

  it('the adjective agrees too, and zero says «مفيش»', () => {
    expect(strip(unitsAwaitingYou(0, 'ar'))).toBe('مفيش وحدات مستنية تقييمك');
    expect(strip(unitsAwaitingYou(2, 'ar'))).toBe('وحدتين مستنيين تقييمك');
    expect(strip(unitsAwaitingYou(4, 'ar'))).toBe('4 وحدات مستنية تقييمك');
    expect(strip(unitsAwaitingYou(1, 'en'))).toBe('one unit waiting for you');
  });

  it('103 counts like 3, 111 like 11 — the rule is on the last two digits', () => {
    const f = { one: 'a', two: 'b', few: 'few', many: 'many' };
    expect(arabicCount(103, f)).toBe('few');
    expect(arabicCount(111, f)).toBe('many');
  });

  it('no dictionary entry glues a variable count to a fixed Arabic noun', () => {
    // A {placeholder} directly followed by a counted noun is a «1 موظفين».
    const glued = /\{(n|q|w|c|d|count)\}\s+(يوم|أيام|موظف|موظفين|وحدة|وحدات|درس|دروس|مهارة|مهارات|مراجعة|مراجعات|حاجة|مشاكل|حدث)/;
    const src = readFileSync(join(SRC, 'app/i18n.ts'), 'utf-8');
    expect(src.split('\n').filter(l => glued.test(l))).toEqual([]);
  });
});

describe('screens say positions, not internal codes', () => {
  it('no screen renders a unit\'s internal code (M1, M2.3)', () => {
    const offenders = screens.filter(f => /\{\s*[\w.]*(module|m|mod)\.code\s*\}/.test(readFileSync(f, 'utf-8')))
      .map(f => f.slice(SRC.length));
    expect(offenders).toEqual([]);
  });

  it('a unit\'s place is its order in the programme', () => {
    const order = PROGRAM.flatMap(p => p.moduleIds);
    order.forEach((id, i) => expect(unitPlace(id)).toMatchObject({ n: i + 1, total: order.length }));
  });

  it('every unit\'s authored timeline names its own phase\'s days — content cannot drift from the programme', () => {
    for (const m of MODULES) {
      const ph = phaseOfModule(m.id)!;
      const days = (m.timeline.match(/\d+/g) ?? []).map(Number);
      expect(days, m.id).toEqual([ph.dayStart, ph.dayEnd]);
    }
  });
});

describe('copy points at things that exist', () => {
  it('nothing tells a trainee to look «up» — the navigation is a side rail and a bottom bar', () => {
    const src = readFileSync(join(SRC, 'app/i18n.ts'), 'utf-8');
    expect(src).not.toMatch(/من فوق/);
  });

  it('the «meanwhile» line names Skills as a link, not a direction', () => {
    expect(t('db.meanwhile', 'ar')).toContain('{skills}');
    expect(readFileSync(join(SRC, 'features/journey/MissionBrief.tsx'), 'utf-8')).toMatch(/db\.meanwhile', \{ skills: <a href="#\/skills">/);
  });
});

describe('assessment vocabulary is translated, and the Arabic is the rubric\'s own', () => {
  it('each rubric level name in the interface matches domain/rubric', () => {
    for (const l of RUBRIC_LEVELS) expect(t(`rb.level${l}`, 'ar')).toBe(LEVEL_NAME[l]);
    for (const l of RUBRIC_LEVELS) expect(t(`rb.level${l}`, 'en')).not.toMatch(/[\u0600-\u06FF]/);
  });
});

describe('display names', () => {
  it('shows the owner\'s own spelling for the interface language, else the name as entered', () => {
    const u = { name: 'كريم سمير', displayName: { en: 'Karim Samir' } };
    expect(displayNameOf(u, 'en')).toBe('Karim Samir');
    expect(displayNameOf(u, 'ar')).toBe('كريم سمير');
    expect(displayNameOf({ name: 'كريم سمير' }, 'en')).toBe('كريم سمير'); // never transliterated
    expect(displayNameOf({ name: 'Nabil', displayName: { en: '  ' } }, 'en')).toBe('Nabil');
  });
});
