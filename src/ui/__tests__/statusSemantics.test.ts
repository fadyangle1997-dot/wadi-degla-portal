/**
 * Status semantics — one meaning per colour, held by test.
 *
 * The audit found the same 83% green for a branch manager and orange for the
 * general manager, blue used for «on track», a category chip and a count, and
 * gold on statuses. Every state now maps onto a documented role in
 * ui/statusSemantics; these keep screens from picking colours themselves.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  TONE, FOLLOW_UP, FORMAL_READINESS, UNIT_REVIEW, ENGINE_DECISION, GAP, SEVERITY, EXAM, PHASE, type Semantic,
} from '../statusSemantics';

const SRC = join(__dirname, '../..');
const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  if (f === '__tests__' || f === 'node_modules') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const features = walk(join(SRC, 'features')).filter(f => f.endsWith('.tsx'));

describe('the semantic roles', () => {
  it('five roles, each drawn by its own tone — never blue, never gold', () => {
    expect(Object.keys(TONE).sort()).toEqual(['neutral', 'pending', 'positive', 'risk', 'warning']);
    for (const t of Object.values(TONE)) expect(['info', 'gold']).not.toContain(t);
    expect(new Set(Object.values(TONE)).size).toBe(5);
  });

  it('every product state maps onto a role', () => {
    const roles = new Set<Semantic>(['positive', 'warning', 'risk', 'pending', 'neutral']);
    for (const table of [FOLLOW_UP, FORMAL_READINESS, UNIT_REVIEW, ENGINE_DECISION, GAP, SEVERITY, EXAM, PHASE]) {
      for (const s of Object.values(table)) expect(roles.has(s)).toBe(true);
    }
  });

  it('the same meaning gets the same role across concepts', () => {
    // Approved, certified, passed, strong — goals met.
    expect([UNIT_REVIEW.ready, FORMAL_READINESS.certified, EXAM.passed, FOLLOW_UP.strong, PHASE.completed]).toEqual(Array(5).fill('positive'));
    // Waiting on someone else.
    expect([UNIT_REVIEW.waiting, FORMAL_READINESS.awaiting_decision, FORMAL_READINESS.in_progress, PHASE.waiting_trainer]).toEqual(Array(4).fill('pending'));
    // Blocked or failing.
    expect([UNIT_REVIEW.not_ready, FORMAL_READINESS.not_ready, EXAM.failed, GAP.critical, FOLLOW_UP.needs_immediate_attention, SEVERITY.critical]).toEqual(Array(6).fill('risk'));
    // An unopened assessment is not a judgement.
    expect(FORMAL_READINESS.not_open).toBe('neutral');
  });
});

describe('screens do not pick status colours themselves', () => {
  it('no feature uses the blue tone for a status', () => {
    const offenders = features.filter(f => /tone(=|:\s*)["']info["']|'info' as const/.test(readFileSync(f, 'utf-8')))
      .map(f => f.slice(SRC.length));
    expect(offenders).toEqual([]);
  });

  it('no status dot is gold', () => {
    const offenders = features.filter(f => /<Status tone="gold"|<Status tone=\{'gold'\}/.test(readFileSync(f, 'utf-8')))
      .map(f => f.slice(SRC.length));
    expect(offenders).toEqual([]);
  });

  it('performance meters are a quantity, not a status: no status tone on them', () => {
    for (const f of ['features/manager/EmployeeRoster.tsx', 'features/manager/NeedsAttention.tsx']) {
      expect(readFileSync(join(SRC, f), 'utf-8'), f).not.toMatch(/<Meter[^>]*tone=/);
    }
  });
});
