/**
 * Platform access — the single source of truth for "who may see what".
 *
 * This extends the existing identity domain rather than adding a parallel
 * /domain/auth module: PERMISSIONS, DEFAULT_ROLES and can() already live here,
 * and duplicating them would create two authorities that can disagree.
 *
 * Nothing outside asks about roles. Screens and navigation ask about
 * PERMISSIONS, and the map below is the only place a platform is tied to one.
 */
import type { Permission } from './index';

/** Every screen in the product → the permission that unlocks it. */
export const PLATFORM_ACCESS = {
  // Trainee academy — the learning experience.
  welcome: 'academy.learn',
  path: 'academy.learn',
  roadmap: 'academy.learn',
  skills: 'academy.learn',
  journey: 'academy.learn',
  review: 'academy.learn',
  readiness: 'academy.learn',
  lesson: 'academy.learn',
  exam: 'academy.learn',
  boss: 'academy.learn',
  // Staff platforms.
  trainer: 'training.review',
  manager: 'reports.view',
  admin: 'operations.view',
} as const satisfies Record<string, Permission>;

export type PlatformView = keyof typeof PLATFORM_ACCESS;

export type Can = (p: Permission) => boolean;

/**
 * Route guard: may this identity open this screen at all?
 *
 * SECURITY: the lookup uses Object.hasOwn, not truthiness. A plain object
 * lookup returns inherited members — `PLATFORM_ACCESS['__proto__']` yields
 * Object.prototype, which is truthy, so a screen named `__proto__`,
 * `constructor` or `toString` would have slipped past a `if (!needed)` check
 * and been granted. Own-property only: unknown screens are always closed.
 */
export function canAccess(view: string, can: Can): boolean {
  // (Object.hasOwn needs ES2022; prototype-safe call works on the current target.)
  if (!Object.prototype.hasOwnProperty.call(PLATFORM_ACCESS, view)) return false;
  const needed = PLATFORM_ACCESS[view as PlatformView];
  if (typeof needed !== 'string') return false;   // belt and braces
  return can(needed);
}

/** Top-level destinations, in the order they appear in navigation. */
const NAV_ORDER: readonly { readonly view: PlatformView; readonly label: string }[] = [
  { view: 'path', label: 'nav.academy' },
  { view: 'roadmap', label: 'nav.journey' },
  { view: 'skills', label: 'nav.skills' },
  { view: 'trainer', label: 'nav.trainer' },
  { view: 'manager', label: 'nav.manager' },
  { view: 'admin', label: 'nav.admin' },
];

/** Navigation is BUILT from permissions — never hardcoded per role. */
export function navFor(can: Can): readonly { readonly view: PlatformView; readonly label: string }[] {
  return NAV_ORDER.filter(item => can(PLATFORM_ACCESS[item.view]));
}

/**
 * Where this identity lands after signing in — derived, not configured, so a
 * role change can never send someone to a platform they cannot open.
 * Staff land on their platform; trainees land in the academy.
 */
export function landingFor(can: Can): PlatformView | null {
  const order: readonly PlatformView[] = ['admin', 'manager', 'trainer', 'path'];
  return order.find(v => can(PLATFORM_ACCESS[v])) ?? null;
}
