// @vitest-environment jsdom
/**
 * An overlay rides in the route's query (#/manager?file=menna.k): the screen
 * underneath is still the route, and the overlay is one param of it. Back,
 * Forward and the phone gesture are covered in a real browser by
 * e2e/phone-back.e2e.ts; these pin the URL arithmetic both depend on.
 */
import { describe, it, expect } from 'vitest';
import { parseHash, toHash } from '../router';
import { overlayParams, withParam } from '../overlayHistory';

describe('overlay query', () => {
  it('the route ignores the overlay riding on it', () => {
    expect(parseHash('#/manager?file=menna.k')).toEqual({ kind: 'manager' });
    expect(parseHash('#/roadmap?phase=p3')).toEqual({ kind: 'roadmap' });
    expect(parseHash('#/readiness-report/menna.k?panel=profile')).toEqual({ kind: 'readiness_report', employeeId: 'menna.k' });
    expect(toHash(parseHash('#/admin?user=manager.nabil'))).toBe('#/admin');
  });

  it('a param is set, replaced and removed without touching the route or other params', () => {
    expect(withParam('#/manager', 'file', 'menna.k')).toBe('#/manager?file=menna.k');
    expect(withParam('#/manager?file=menna.k', 'file', 'omar.h')).toBe('#/manager?file=omar.h');
    expect(withParam('#/manager?file=menna.k&panel=profile', 'file', null)).toBe('#/manager?panel=profile');
    expect(withParam('#/manager?file=menna.k', 'file', null)).toBe('#/manager');
    expect(withParam('', 'panel', 'profile')).toBe('#/?panel=profile');
    expect(overlayParams('#/roadmap?phase=p2').get('phase')).toBe('p2');
    expect(overlayParams('#/roadmap').get('phase')).toBeNull();
  });
});
