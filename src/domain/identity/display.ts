/**
 * Display helpers for identities — pure, data-free, safe for any bundle.
 *
 * These used to live in demoAccounts.ts, which meant every screen that showed a
 * user's initials (the app shell, on every page) statically imported the demo
 * module — dragging DEMO_ACCOUNTS and its cleartext passwords into the
 * production bundle. A pure string function has no business sitting next to
 * credentials; moving it here breaks that import chain.
 */

/**
 * Two-letter initials from a display name: first and last word.
 * «Ahmed Mohamed» → AM. A single name yields one letter rather than a
 * fabricated second. Derived, never stored — an initials field goes stale the
 * moment a name is corrected.
 */
export function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : '';
  return (first + last).toUpperCase();
}
