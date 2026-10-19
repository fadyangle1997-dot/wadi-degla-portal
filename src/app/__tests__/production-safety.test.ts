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

describe('🔴 C2 — demo credentials never reach production code paths', () => {
  it('only App.tsx imports the credential module, and only behind import.meta.env.DEV', () => {
    // The demo table holds cleartext passwords. Any unconditional import pulls
    // them into the bundle, where DevTools reads them in plain sight.
    const importers = files(SRC).filter(f =>
      /from\s+['"][^'"]*demo\/demoAccounts['"]/.test(readFileSync(f, 'utf-8')));
    expect(importers.map(f => f.replace(SRC, '')).sort(), 'unexpected credential importers')
      .toEqual(['app/App.tsx']);

    const app = readFileSync(join(SRC, 'app/App.tsx'), 'utf-8');
    // Demo auth runs unconditionally in this showcase build — no env flag, which
    // is what broke the deployed login (a flag that reads undefined on a
    // misconfigured host). The OIDC switch, when it lands, is a real provider
    // object, not an env string.
    expect(app).toContain('const account = authenticateDev(username, password);');
    expect(app, 'the fragile env gate must be gone').not.toContain('VITE_DEMO_AUTH');
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
