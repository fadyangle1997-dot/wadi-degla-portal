/**
 * Pilot measures (D11): counts and timestamps from the log, each one a
 * person can check against the record — no index, no averaged percentage.
 */
import { describe, it, expect } from 'vitest';
import { pilotRow, pilotSummary, pilotCsv, median, PILOT_COLUMNS } from '../pilot';
import { STATIONS } from '../../readiness';
import { ALL_CONDUCT_CHECKS } from '../../evaluation';

const DAY = 86_400_000;
const E = 'e1';
const unit = (moduleId: string, decision: string, at: number) => ({ type: 'EVALUATION_RECORDED', employeeId: E, moduleId, decision, at, scores: {} });
const stations = (at: number) => STATIONS.map(s => ({ type: 'STATION_ASSESSED', employeeId: E, stationId: s.id, scores: Object.fromEntries(s.measures.map(d => [d, 100])), observation: 'x', at }));
const conduct = (at: number) => ({ type: 'CONDUCT_OBSERVED', employeeId: E, conduct: Object.fromEntries(ALL_CONDUCT_CHECKS.map(c => [c, true])), at });
const decide = (decision: string, at: number) => ({ type: 'FINAL_READINESS_DECIDED', employeeId: E, managerId: 'm', decision, rationale: 'x', at });

describe('pilot row', () => {
  it('nothing yet: no start from the log, no certification, every count zero', () => {
    const r = pilotRow([], E, null, false);
    expect(r).toMatchObject({ startedAt: null, certifiedAt: null, daysToCertification: null, status: 'not_open', unitAssessments: 0, trainerActions: 0 });
  });

  it('time to independence runs from the first activity to the certifying decision', () => {
    const events = [unit('m1', 'ready', 2 * DAY), ...stations(40 * DAY), conduct(41 * DAY), decide('ready', 50 * DAY)];
    const r = pilotRow(events, E, 1 * DAY, true);
    expect(r).toMatchObject({ certifiedAt: 50 * DAY, daysToCertification: 49, status: 'certified' });
  });

  it('a decision that did not certify leaves time to independence open', () => {
    const r = pilotRow([unit('m1', 'ready', 1), decide('extend', 2)], E, 0, true);
    expect(r.certifiedAt).toBeNull();
    expect(r.daysToCertification).toBeNull();
  });

  it('unit history: first-time approvals, rework, extension, escalation — counted once each', () => {
    const r = pilotRow([
      unit('m1', 'ready', 1),
      unit('m2_1', 'not_ready', 2), unit('m2_1', 'ready', 3),
      unit('m2_2', 'extend', 4), unit('m2_2', 'escalate', 5),
    ], E, 0, false);
    expect(r).toMatchObject({ unitAssessments: 5, unitsAssessed: 3, approvedFirstTime: 1, sentBack: 1, extended: 1, escalated: 1 });
  });

  it('the trainer\'s and the manager\'s actions are told apart, the interview station included', () => {
    const r = pilotRow([unit('m1', 'ready', 1), ...stations(2), conduct(3), decide('ready', 4),
      { type: 'REVIEW_COACHED', employeeId: E, at: 5 }, { type: 'TRACK_ASSIGNED', employeeId: E, at: 6 }], E, 0, true);
    const managerStations = STATIONS.filter(s => s.assessor === 'manager').length;
    expect(r.trainerActions).toBe(1 + (STATIONS.length - managerStations) + 1 + 1);
    expect(r.managerActions).toBe(managerStations + 1 + 1);
  });
});

describe('pilot summary', () => {
  it('median, and ratios as counts over their denominators', () => {
    expect(median([])).toBeNull();
    expect(median([30, 60, 45])).toBe(45);
    expect(median([30, 60])).toBe(45);
    const rows = [pilotRow([unit('m1', 'ready', 1), unit('m2_1', 'not_ready', 2), unit('m2_1', 'ready', 3)], E, 0, false)];
    const s = pilotSummary(rows);
    expect(s.rework).toEqual({ count: 1, of: 3 });
    expect(s.firstTime).toEqual({ count: 1, of: 2 });
    expect(s.certified).toBe(0);
    expect(s.medianDaysToCertification).toBeNull();
  });
});

describe('pilot CSV', () => {
  it('a BOM, the documented columns, quoted cells, and empty — not zero — for «not yet»', () => {
    const csv = pilotCsv([pilotRow([], E, null, false)], () => ({ name: 'Karim', branch: 'Maadi', trainer: 'Samir' }));
    const [head, line] = csv.split('\r\n');
    expect(head).toBe('﻿' + PILOT_COLUMNS.join(','));
    const cells = line!.split(',');
    expect(cells[PILOT_COLUMNS.indexOf('certified_at')]).toBe('');
    expect(cells[PILOT_COLUMNS.indexOf('unit_assessments')]).toBe('"0"');
    // A name with a comma or a quote stays one cell.
    expect(pilotCsv([pilotRow([], E, null, false)], () => ({ name: 'Karim, "K"', branch: '', trainer: '' }))).toContain('"Karim, ""K"""');
  });
});
