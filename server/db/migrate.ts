/**
 * Migrations: numbered SQL files, applied in order, recorded in a table.
 *
 * No framework. The whole contract is: run every file in `migrations/` whose
 * name sorts after the last one applied, inside a transaction, and remember it.
 * A migration engine earns its weight when migrations branch, squash and roll
 * back across environments; at pilot size it would be a dependency standing in
 * front of eleven lines.
 *
 * Safely repeatable in two independent ways, because "we ran it twice" is a
 * real Tuesday: the ledger skips files already applied, and every statement in
 * 001 is itself `IF NOT EXISTS`. Running this against a fully migrated database
 * changes nothing and exits 0.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Sql } from './client';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export interface MigrationResult {
  readonly applied: readonly string[];
  readonly skipped: readonly string[];
}

/** Every migration file, in lexical order — 001, 002, … so order is the name. */
export const migrationFiles = (): string[] =>
  readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

export async function migrate(sql: Sql): Promise<MigrationResult> {
  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  const done = new Set<string>(
    (await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map(r => r.name),
  );

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const name of migrationFiles()) {
    if (done.has(name)) { skipped.push(name); continue; }
    const body = readFileSync(join(MIGRATIONS_DIR, name), 'utf-8');
    // One transaction per file: a half-applied migration is the one state that
    // cannot be reasoned about later.
    await sql.begin(async tx => {
      await tx.unsafe(body);
      await tx`INSERT INTO schema_migrations (name) VALUES (${name})`;
    });
    applied.push(name);
  }

  return { applied, skipped };
}
