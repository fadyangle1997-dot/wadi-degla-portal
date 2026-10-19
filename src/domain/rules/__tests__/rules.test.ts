/**
 * Rules-engine tests. These encode the APPROVED worked examples as executable
 * assertions — so a future change that breaks a real number fails loudly.
 */
import { describe, it, expect } from 'vitest';
import { childJoiningPenalty, childAdditionEligibility } from '../childJoining';
import { separationPenalty } from '../separation';
import { renewalPenaltyWithinYear, renewalPenaltyAfterYear } from '../renewal';

describe('childJoiningPenalty', () => {
  it('approved example: born 2013, created 2018, added 2026 → 1342', () => {
    const r = childJoiningPenalty({ birthYear: 2013, membershipCreationYear: 2018, additionYear: 2026 });
    // 2019..2025 = 147+165+185+185+210+210+240
    expect(r.total).toBe(1342);
  });

  it('no penalty when addition happens the same year the child turned >6', () => {
    // born 2013 → trigger year 2019; add in 2019 ⇒ endYear 2018 < startYear 2019
    const r = childJoiningPenalty({ birthYear: 2013, membershipCreationYear: 2018, additionYear: 2019 });
    expect(r.total).toBe(0);
  });

  it('child >6 at creation accrues from the creation year', () => {
    const r = childJoiningPenalty({ birthYear: 2010, membershipCreationYear: 2018, additionYear: 2020 });
    // ageAtCreation 8 → 2018..2019 = 138 + 147
    expect(r.total).toBe(285);
  });
});

describe('childAdditionEligibility — FINAL rule: 25+ never added', () => {
  it('age 24 → allowed', () => {
    expect(childAdditionEligibility({ age: 24 }).allowed).toBe(true);
  });
  it('age 25 → rejected, no exceptions', () => {
    const r = childAdditionEligibility({ age: 25 });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('نهائيًا');
  });
  it('age 27 → rejected', () => {
    expect(childAdditionEligibility({ age: 27 }).allowed).toBe(false);
  });
  it('job printed on ID → rejected even under 25', () => {
    expect(childAdditionEligibility({ age: 23, jobOnId: true }).allowed).toBe(false);
  });
});

describe('separationPenalty', () => {
  it('VAT-stripped base is 6500', () => {
    const r = separationPenalty({ age: 27 }); // 100% of 6500
    expect(r.total).toBe(6500);
  });
  it('age 26 → 50% of 6500 = 3250', () => {
    expect(separationPenalty({ age: 26 }).total).toBe(3250);
  });
  it('age 28 → 200% of 6500 = 13000', () => {
    expect(separationPenalty({ age: 28 }).total).toBe(13000);
  });
  it('age 25 → 0', () => {
    expect(separationPenalty({ age: 25 }).total).toBe(0);
  });
  it('older than 28 → 10% of current value + VAT on the 10%', () => {
    const r = separationPenalty({ age: 30, currentMembershipValue: 50000 });
    // 10% = 5000, VAT 14% = 700, total 5700
    expect(r.total).toBe(5700);
  });
});

describe('renewal — phase 1 (within year)', () => {
  it('grace window (month ≤ 3) → 0', () => {
    expect(renewalPenaltyWithinYear({ renewalValuePerMember: 1000, memberCount: 3, currentMonth: 2 }).total).toBe(0);
  });
  it('month 5 (2 months late), 1000/member, 3 members → 5%*2*1000*3 = 300', () => {
    const r = renewalPenaltyWithinYear({ renewalValuePerMember: 1000, memberCount: 3, currentMonth: 5 });
    expect(r.total).toBe(300);
  });
});

describe('renewal — phase 2 (after year end)', () => {
  it('year 1 → 50% of the unrenewed-year value', () => {
    expect(renewalPenaltyAfterYear({ unrenewedYearRenewalValue: 2000, yearsUnrenewed: 1 }).total).toBe(1000);
  });
  it('year 4 → 300%', () => {
    expect(renewalPenaltyAfterYear({ unrenewedYearRenewalValue: 2000, yearsUnrenewed: 4 }).total).toBe(6000);
  });
  it('5 years unrenewed → dropped (total 0, explained)', () => {
    const r = renewalPenaltyAfterYear({ unrenewedYearRenewalValue: 2000, yearsUnrenewed: 5 });
    expect(r.total).toBe(0);
    expect(r.explanation).toContain('ساقطة');
  });
});
