/**
 * @vitest-environment node
 *
 * The boundary that keeps the two sides honest.
 *
 * `server/` may import `src/domain/` — that is the whole point, one set of
 * rules on both sides. It may NOT import `src/app/` or `src/features/`: those
 * carry React, stores and localStorage, and the moment one slips in, the server
 * has a second, browser-shaped idea of the truth.
 *
 * This is the twin of `src/domain/__tests__/node-importable.test.ts`: that one
 * proves the domain CAN cross the line, this one proves nothing else does.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The server's own source. Its tests are excluded: this file names the very
 *  patterns it forbids, and a rule that flags its own statement is noise. */
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : files(full);
    return /\.ts$/.test(e.name) ? [full] : [];
  });

describe('server boundary', () => {
  const sources = files(SERVER).map(f => ({ f, src: readFileSync(f, 'utf-8') }));

  it('imports nothing from src/app or src/features', () => {
    const offenders = sources
      .filter(({ src }) => /from ['"][^'"]*src\/(app|features)\//.test(src)
        || /from ['"]\.\.\/\.\.\/src\/(app|features)\//.test(src))
      .map(({ f }) => f.replace(SERVER, 'server'));
    expect(offenders).toEqual([]);
  });

  it('imports no UI library', () => {
    const offenders = sources
      .filter(({ src }) => /from ['"](react|react-dom|motion|lucide-react)['"]/.test(src))
      .map(({ f }) => f.replace(SERVER, 'server'));
    expect(offenders).toEqual([]);
  });

  it('touches no browser API', () => {
    const offenders = sources
      .filter(({ src }) => /\b(localStorage|sessionStorage|window\.|document\.)/.test(
        src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''),
      ))
      .map(({ f }) => f.replace(SERVER, 'server'));
    expect(offenders).toEqual([]);
  });

  it('🔴 hardcodes no secret, credential or connection string', () => {
    // Phase 1 ships before authentication exists; this test is what keeps a
    // "temporary" password out of the repository while it is being added.
    const patterns = [/postgres(ql)?:\/\/[^'"\s]*:[^'"@\s]+@/i, /password\s*[:=]\s*['"][^'"]+['"]/i, /secret\s*[:=]\s*['"][^'"]{8,}['"]/i];
    const offenders: string[] = [];
    for (const { f, src } of sources) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      if (patterns.some(p => p.test(code))) offenders.push(f.replace(SERVER, 'server'));
    }
    expect(offenders).toEqual([]);
  });
});
