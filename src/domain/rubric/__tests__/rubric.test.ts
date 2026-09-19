import { describe, it, expect } from 'vitest';
import { RUBRIC, RUBRIC_LEVELS, LEVEL_SCORE, LEVEL_NAME, scoreOf, levelOf, needsCalibration } from '../index';
import { ALL_DIMENSIONS } from '../../evaluation';
import { READINESS_FLOORS, CRITICAL_DIMENSIONS } from '../../readiness';

describe('every number the engine consumes has a behaviour behind it', () => {
  it('🔴 all seven KPIs are described at all four levels — no undefined score', () => {
    // The engine blocked certification below 70 while nothing defined 70.
    for (const d of ALL_DIMENSIONS) {
      for (const l of RUBRIC_LEVELS) {
        expect(RUBRIC[d]?.[l], `${d} L${l}`).toBeTruthy();
        expect(RUBRIC[d][l].length, `${d} L${l}`).toBeGreaterThan(20);
      }
    }
  });

  it('every descriptor is an observable act — never an impression', () => {
    const banned = ['يبان', 'شكله', 'محترف بشكل عام', 'واثق بشكل'];
    for (const d of ALL_DIMENSIONS) {
      for (const l of RUBRIC_LEVELS) {
        for (const b of banned) expect(RUBRIC[d][l], `${d} L${l}`).not.toContain(b);
      }
    }
  });

  it('descriptors are distinct across levels within a dimension', () => {
    for (const d of ALL_DIMENSIONS) {
      expect(new Set(RUBRIC_LEVELS.map(l => RUBRIC[d][l])).size, d).toBe(4);
    }
  });

  it('descriptors are distinct ACROSS dimensions — no copy/paste rubric', () => {
    const all = ALL_DIMENSIONS.flatMap(d => RUBRIC_LEVELS.map(l => RUBRIC[d][l]));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('levels map onto the floors the engine already enforces', () => {
  it('🔴 Level 3 is the first level that clears a CRITICAL floor', () => {
    for (const d of CRITICAL_DIMENSIONS) {
      expect(scoreOf(3), d).toBeGreaterThanOrEqual(READINESS_FLOORS[d]);
      expect(scoreOf(2), d).toBeLessThan(READINESS_FLOORS[d]);
    }
  });

  it('Level 1 never clears any floor', () => {
    for (const d of ALL_DIMENSIONS) expect(scoreOf(1), d).toBeLessThan(READINESS_FLOORS[d]);
  });

  it('scores rise with level, and every level is named', () => {
    expect(LEVEL_SCORE).toEqual({ 1: 25, 2: 50, 3: 75, 4: 100 });
    for (const l of RUBRIC_LEVELS) expect(LEVEL_NAME[l]).toBeTruthy();
  });

  it('levelOf round-trips scoreOf', () => {
    for (const l of RUBRIC_LEVELS) expect(levelOf(scoreOf(l))).toBe(l);
  });
});

describe('calibration — a floor must measure the trainee, not the assessor', () => {
  it('agreement within one level is normal', () => {
    expect(needsCalibration(3, 3)).toBe(false);
    expect(needsCalibration(3, 4)).toBe(false);
  });

  it('🔴 a two-level gap between trainers means the scores are not comparable', () => {
    expect(needsCalibration(1, 3)).toBe(true);
    expect(needsCalibration(4, 2)).toBe(true);
  });
});
