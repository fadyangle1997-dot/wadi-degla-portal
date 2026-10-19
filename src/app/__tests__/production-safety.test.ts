/**
 * Production-safety contracts. Each one guards a blocker that, once it slips
 * back in, is invisible until an enterprise security review finds it — or worse,
 * until someone opens DevTools.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../../', import.meta.url).pathname;

const files = (dir: string): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'node_modules') out.push(...files(full)); }
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.test.ts') && !e.name.endsWith('.test.tsx')) out.push(full);
  }
  return out;
};

describe('🔴 C1 — no screen reads a shared trainee record', () => {
  it('LOCAL_TRAINEE_ID is gone from the production path', () => {
    // A single shared record meant a trainer opening Mariam's file read Ahmed's
    // work, and approving one approved both. Identity now comes from the session.
    for (const f of files(SRC)) {
      const src = readFileSync(f, 'utf-8');
      // Comments may reference the old name to explain the fix; code may not use it.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
      expect(code, `${f} still uses LOCAL_TRAINEE_ID`).not.toMatch(/\bLOCAL_TRAINEE_ID\b/);
      expect(code, `${f} hardcodes 'local-trainee'`).not.toContain("'local-trainee'");
    }
  });
});

describe('🔴 C2 — no readable demo password in shipped code', () => {
  it('the demo account table stores hashes, never passwords', () => {
    // The showcase build signs in with these accounts, so the module ships.
    // What must never ship is a password someone could read in DevTools.
    const accounts = readFileSync(join(SRC, 'app/demo/credentials.ts'), 'utf-8');
    const code = accounts.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    expect(code).not.toMatch(/\bpassword:\s*'/);
    expect(code).not.toContain('Welcome@123');
    expect(code).not.toContain('Admin@2026');
    const hashes = [...code.matchAll(/passwordHash: '([^']*)'/g)];
    expect(hashes.length).toBeGreaterThan(0);
    for (const m of hashes) expect(m[1]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('the only plaintext demo credentials sit behind import.meta.env.DEV', () => {
    // The login screen's dev switcher fills credentials for developers. It is
    // rendered only when import.meta.env.DEV is true, which Vite replaces with
    // false in a production build, so the strings are dropped with it.
    for (const f of files(SRC)) {
      const src = readFileSync(f, 'utf-8');
      if (!src.includes('Welcome@123') && !src.includes('Admin@2026')) continue;
      expect(f.replace(SRC, ''), 'plaintext demo password outside the dev switcher').toBe('features/login/LoginView.tsx');
      expect(src).toContain('{import.meta.env.DEV && <DevPanel');
    }
  });

  it('the identity store seeds from a credential-FREE directory', () => {
    // DEMO_USERS must come from demoDirectory (names + roles, no secrets), never
    // from the module that also exports passwords.
    const store = readFileSync(join(SRC, 'app/identity/identityStore.ts'), 'utf-8');
    expect(store).toContain("from './demoDirectory'");
    expect(store).not.toMatch(/DEMO_USERS.*from.*demoAccounts/);

    const dir = readFileSync(join(SRC, 'app/identity/demoDirectory.ts'), 'utf-8');
    const dirCode = dir.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    expect(dirCode, 'the directory must not contain passwords').not.toContain('password');
    expect(dirCode).not.toContain('Welcome@123');
  });

  it('pure display helpers do not live beside credentials', () => {
    // initialsOf runs on every page via the shell. If it sits in the demo module,
    // every page pulls the passwords in.
    const display = readFileSync(join(SRC, 'domain/identity/display.ts'), 'utf-8');
    expect(display).toContain('export function initialsOf');
    const displayCode = display.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    expect(displayCode).not.toContain('password');
  });
});

describe('🔴 C3 — every trainee is assigned to a trainer', () => {
  it('the directory links each employee to a trainer', () => {
    // Without the link, scopeOf() correctly returns {kind:assigned} and finds
    // nobody — every trainer sees an empty platform.
    const dir = readFileSync(join(SRC, 'app/identity/demoDirectory.ts'), 'utf-8');
    const employees = dir.match(/roleId: 'employee'/g) ?? [];
    const links = dir.match(/trainerId: 'trainer\./g) ?? [];
    expect(links.length, 'some trainees have no trainer').toBe(employees.length);
  });
});
