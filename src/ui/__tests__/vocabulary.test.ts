/**
 * The layout vocabulary's contracts (theme.css, LAYOUT VOCABULARY). The classes
 * replaced ~430 inline style objects; these tests keep them from coming back
 * and keep the vocabulary itself closed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf-8');
const SRC = fileURLToPath(new URL('../..', import.meta.url));

/** `.name { prop:value !important; … }` rules of the vocabulary block. */
const vocabulary = (() => {
  const start = css.indexOf('LAYOUT VOCABULARY');
  const body = css.slice(css.indexOf('*/', start) + 2, css.indexOf('end of the layout vocabulary', start));
  return [...body.matchAll(/\.([a-z0-9-]+)\s*\{([^}]*)\}/g)].map(([, name, decls]) => ({
    name: name!,
    decls: decls!.split(';').map(d => d.trim()).filter(Boolean).map(d => {
      const [prop, ...rest] = d.split(':');
      return { prop: prop!.trim(), value: rest.join(':').trim() };
    }),
  }));
})();
const defined = new Set(vocabulary.map(c => c.name));

const camel = (p: string) => p.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
/** `alignItems:center` → `items-center`, from the single-declaration classes. */
const covered = new Map(vocabulary.filter(c => c.decls.length === 1).map(c => {
  const { prop, value } = c.decls[0]!;
  return [`${camel(prop)}:${value.replace(/\s*!important$/, '')}`, c.name] as const;
}));

const tsxFiles = (): string[] => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(e => {
      const full = join(dir, e.name);
      if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(full);
      return e.name.endsWith('.tsx') ? [full] : [];
    });
  return [...walk(join(SRC, 'features')), ...walk(join(SRC, 'ui')), ...walk(join(SRC, 'app')), join(SRC, 'main.tsx')];
};

const propName = (p: ts.ObjectLiteralElementLike) =>
  ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null;
const literal = (e: ts.Expression) =>
  ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isNumericLiteral(e) ? e.text : null;

describe('🔴 the layout vocabulary', () => {
  it('is closed and built only from tokens', () => {
    expect(vocabulary.length).toBeGreaterThan(40);
    for (const c of vocabulary) {
      for (const { prop, value } of c.decls) {
        // !important + top of the file is what makes a class behave like the
        // inline style it replaced (see the block's header comment).
        expect(value, `.${c.name} ${prop}`).toMatch(/!important$/);
        const v = value.replace(/\s*!important$/, '');
        expect(v, `.${c.name} ${prop}: a raw value is not on the scale`).toMatch(/^(var\(--[a-z0-9-]+\)|[a-z-]+|0|1|100%|100vh)$/);
      }
    }
  });

  it('is used instead of the inline value it covers', () => {
    // Elements whose className reaches the DOM: intrinsic tags, motion tags,
    // ArabicContent and lucide icons. A literal after the last spread is static;
    // anything before a spread can be overridden by it and has to stay inline.
    const violations: string[] = [];
    for (const file of tsxFiles()) {
      const sf = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const forwarding = new Set(['ArabicContent']);
      for (const st of sf.statements) {
        const named = ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)
          && st.moduleSpecifier.text === 'lucide-react' ? st.importClause?.namedBindings : undefined;
        if (named && ts.isNamedImports(named)) for (const el of named.elements) forwarding.add(el.name.text);
      }
      const visit = (node: ts.Node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(sf);
          const style = node.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(sf) === 'style');
          const obj = style && ts.isJsxAttribute(style) && style.initializer && ts.isJsxExpression(style.initializer)
            && style.initializer.expression && ts.isObjectLiteralExpression(style.initializer.expression)
            ? style.initializer.expression : null;
          if (obj && (/^(m\.)?[a-z][a-z0-9]*$/.test(tag) || forwarding.has(tag))) {
            let lastSpread = -1;
            obj.properties.forEach((p, i) => { if (ts.isSpreadAssignment(p)) lastSpread = i; });
            const props = obj.properties.slice(lastSpread + 1);
            for (const p of props) {
              const key = propName(p);
              const value = key && ts.isPropertyAssignment(p) ? literal(p.initializer) : null;
              const cls = key && value !== null ? covered.get(`${key}:${value}`) : undefined;
              if (cls) {
                const line = sf.getLineAndCharacterOfPosition(p.getStart(sf)).line + 1;
                violations.push(`${relative(SRC, file)}:${line} <${tag}> ${key}: ${value} → .${cls}`);
              }
            }
            const d = props.find(p => propName(p) === 'display');
            if (d && ts.isPropertyAssignment(d) && literal(d.initializer) === 'flex') {
              const line = sf.getLineAndCharacterOfPosition(d.getStart(sf)).line + 1;
              violations.push(`${relative(SRC, file)}:${line} <${tag}> display: flex → .row / .stack`);
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    expect(violations).toEqual([]);
  });

  it('has every class the code asks for', () => {
    // A misspelt or off-scale utility (gap-10, mt-12, c-gold) fails silently in
    // the browser, so it fails here.
    const shaped = /^(gap|mt|mb)-\d+$|^c-[a-z0-9]+$|^(items|justify)-[a-z]+$/;
    const missing = new Set<string>();
    for (const file of tsxFiles()) {
      const src = readFileSync(file, 'utf-8');
      for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        for (const cls of (m[1] ?? m[2] ?? '').replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) {
          if (shaped.test(cls) && !defined.has(cls)) missing.add(`${relative(SRC, file)}: ${cls}`);
        }
      }
    }
    expect([...missing]).toEqual([]);
  });
});
