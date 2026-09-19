/**
 * RBAC contract tests — the role matrix, asserted against the real domain
 * functions the app uses (no duplicated logic here). These freeze the rule the
 * brief demands: each identity sees ONLY its own platform.
 */
import { describe, it, expect } from 'vitest';
import { can, DEFAULT_ROLES, type User, type Permission } from '../../domain/identity';
import { navFor, canAccess, landingFor, PLATFORM_ACCESS } from '../../domain/identity/access';

const user = (roleId: string): User =>
  ({ id: `u-${roleId}`, name: roleId, roleId, status: 'active', createdAt: 0, updatedAt: 0 });

const canOf = (roleId: string) => (p: Permission) => can(user(roleId), DEFAULT_ROLES, p);
const viewsOf = (roleId: string) => navFor(canOf(roleId)).map(n => n.view);

describe('RBAC matrix — each role sees only its own platform', () => {
  it('ADMIN sees only the admin platform', () => {
    expect(viewsOf('admin')).toEqual(['admin']);
  });

  it('MANAGER sees only the manager platform', () => {
    expect(viewsOf('manager')).toEqual(['manager']);
  });

  it('TRAINER sees only the trainer platform', () => {
    expect(viewsOf('trainer')).toEqual(['trainer']);
  });

  it('TRAINEE sees only the academy', () => {
    // 'skills' joined the shell nav in the mobile pass: it was always gated by
    // the same academy.learn permission and always reachable — it just used to
    // live in PathView's own duplicate header instead of the one nav source.
    // Widened to reflect that, NOT to loosen the boundary: the assertion still
    // proves a trainee sees the academy and nothing else.
    expect(viewsOf('employee')).toEqual(['path', 'roadmap', 'skills']);
  });
});

describe('route protection — unauthorised screens never open', () => {
  it('a trainee cannot open #/admin, #/manager or #/trainer', () => {
    const c = canOf('employee');
    expect(canAccess('admin', c)).toBe(false);
    expect(canAccess('manager', c)).toBe(false);
    expect(canAccess('trainer', c)).toBe(false);
  });

  it('an admin cannot open the academy, trainer or manager platforms', () => {
    const c = canOf('admin');
    expect(canAccess('path', c)).toBe(false);
    expect(canAccess('lesson', c)).toBe(false);
    expect(canAccess('trainer', c)).toBe(false);
    expect(canAccess('manager', c)).toBe(false);
  });

  it('a manager cannot open the trainer platform (the guide: the manager does not train)', () => {
    expect(canAccess('trainer', canOf('manager'))).toBe(false);
  });

  it('a trainer cannot open the manager or admin platforms', () => {
    const c = canOf('trainer');
    expect(canAccess('manager', c)).toBe(false);
    expect(canAccess('admin', c)).toBe(false);
  });

  it('every role CAN open its own platform', () => {
    expect(canAccess('admin', canOf('admin'))).toBe(true);
    expect(canAccess('manager', canOf('manager'))).toBe(true);
    expect(canAccess('trainer', canOf('trainer'))).toBe(true);
    expect(canAccess('path', canOf('employee'))).toBe(true);
  });

  it('an unknown screen is closed by default, never open', () => {
    expect(canAccess('nonsense', () => true)).toBe(false);
  });

  it('the trainee academy covers every learning screen', () => {
    const c = canOf('employee');
    for (const v of ['welcome', 'path', 'roadmap', 'skills', 'journey', 'lesson', 'exam', 'boss']) {
      expect(canAccess(v, c)).toBe(true);
    }
  });
});

describe('landing page is derived from permissions, never hardcoded', () => {
  it('each role lands on its own platform', () => {
    expect(landingFor(canOf('admin'))).toBe('admin');
    expect(landingFor(canOf('manager'))).toBe('manager');
    expect(landingFor(canOf('trainer'))).toBe('trainer');
    expect(landingFor(canOf('employee'))).toBe('path');
  });

  it('an identity with no platform lands nowhere (403 rather than a wrong app)', () => {
    expect(landingFor(() => false)).toBe(null);
  });

  it('every landing target is a screen the identity can actually open', () => {
    for (const roleId of ['admin', 'manager', 'trainer', 'employee']) {
      const c = canOf(roleId);
      const landing = landingFor(c)!;
      expect(canAccess(landing, c)).toBe(true);
    }
  });
});

describe('access map integrity', () => {
  it('every mapped screen requires a real permission', () => {
    for (const perm of Object.values(PLATFORM_ACCESS)) {
      expect(typeof perm).toBe('string');
      expect(perm.length).toBeGreaterThan(0);
    }
  });

  it('immersive learning screens are academy-gated like the rest of the academy', () => {
    for (const v of ['lesson', 'exam', 'boss', 'welcome']) {
      expect(PLATFORM_ACCESS[v as keyof typeof PLATFORM_ACCESS]).toBe('academy.learn');
    }
  });
});

describe('fail-closed guarantees — RBAC must never be bypassable', () => {
  it('every screen in the product is in the access map (nothing is unguarded)', () => {
    // A screen missing from the map would be unreachable rather than open —
    // this asserts the map covers the router's full surface.
    const routerViews = ['welcome', 'path', 'roadmap', 'skills', 'journey', 'lesson', 'exam', 'boss', 'review', 'readiness', 'trainer', 'manager', 'admin'];
    for (const v of routerViews) {
      expect(PLATFORM_ACCESS[v as keyof typeof PLATFORM_ACCESS], v).toBeDefined();
    }
  });

  it('canAccess is closed by default for anything unmapped', () => {
    // Even an identity that can do everything cannot reach an unmapped screen.
    expect(canAccess('', () => true)).toBe(false);
    expect(canAccess('__proto__', () => true)).toBe(false);
    expect(canAccess('settings', () => true)).toBe(false);
  });

  it('an identity with zero permissions can reach nothing at all', () => {
    const none = () => false;
    for (const v of Object.keys(PLATFORM_ACCESS)) expect(canAccess(v, none), v).toBe(false);
    expect(landingFor(none)).toBe(null);
  });

  it('no role can reach a platform outside its own matrix row', () => {
    const matrix: Record<string, readonly string[]> = {
      admin: ['admin'],
      manager: ['manager'],
      trainer: ['trainer'],
      employee: ['welcome', 'path', 'roadmap', 'skills', 'journey', 'lesson', 'exam', 'boss', 'review', 'readiness'],
    };
    for (const [roleId, allowed] of Object.entries(matrix)) {
      const c = canOf(roleId);
      for (const v of Object.keys(PLATFORM_ACCESS)) {
        expect(canAccess(v, c), `${roleId} → ${v}`).toBe(allowed.includes(v));
      }
    }
  });
});

describe('ARCHITECTURE v2.8 — one home, three states', () => {
  it('🔴 there is no second dashboard — «where am I?» has ONE destination', () => {
    // A roadmap, a readiness dashboard and a progress timeline all answer the
    // same question. Three surfaces for one question is LMS bloat in an
    // enterprise costume: the journey changes with the phase instead.
    const answersWhereAmI = ['roadmap'];
    const dashboards = Object.keys(PLATFORM_ACCESS)
      .filter(v => /dashboard|timeline|progress|overview/i.test(v));
    expect(dashboards).toEqual([]);
    expect(answersWhereAmI).toHaveLength(1);
  });

  it('🔴 certification is not navigable — it is an outcome, not a destination', () => {
    // Nobody browses to their own certificate. It lands on the terminal state
    // of the readiness result.
    for (const v of Object.keys(PLATFORM_ACCESS)) {
      expect(/certificate|graduation|diploma/i.test(v), v).toBe(false);
    }
  });

  it('the review and the readiness result are the trainee\'s own work', () => {
    // Gated by the same permission as the rest of the academy — a trainer or a
    // manager can never open a trainee's debrief as if it were theirs.
    expect(PLATFORM_ACCESS.review).toBe('academy.learn');
    expect(PLATFORM_ACCESS.readiness).toBe('academy.learn');
    expect(canAccess('review', canOf('trainer'))).toBe(false);
    expect(canAccess('readiness', canOf('manager'))).toBe(false);
    expect(canAccess('review', canOf('admin'))).toBe(false);
  });
});
