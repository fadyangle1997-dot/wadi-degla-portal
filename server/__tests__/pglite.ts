/**
 * A real Postgres for tests, in-process.
 *
 * PGlite is Postgres compiled to WASM: the migrations, the UNIQUE constraint on
 * `(log, event_id)` and the per-log sequences are exercised by the same engine
 * that runs in production, not by a mock that agrees with whatever we wrote.
 * The alternative — asserting against a fake — proves only that the test and
 * the code share an assumption.
 *
 * It implements the same `Sql` seam the server uses, so nothing under test
 * knows which engine it is talking to.
 */
import { PGlite } from '@electric-sql/pglite';
import type { Sql } from '../db/client';

/** Builds the parameterised query PGlite expects from a tagged template. */
const toQuery = (strings: TemplateStringsArray, values: unknown[]) => ({
  text: strings.reduce((acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ''), ''),
  params: values,
});

export interface TestDb {
  readonly sql: Sql;
  readonly raw: PGlite;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const db = new PGlite();
  await db.waitReady;

  const make = (): Sql => {
    const fn = (async <T,>(strings: TemplateStringsArray, ...values: unknown[]) => {
      const { text, params } = toQuery(strings, values);
      const res = await db.query(text, params);
      return res.rows as T;
    }) as Sql;

    fn.unsafe = async (query: string, params: unknown[] = []) => {
      // Migration files are multi-statement; exec handles them, query does not.
      if (params.length === 0) return db.exec(query);
      return db.query(query, params);
    };

    // PGlite is single-connection, so a transaction is BEGIN/COMMIT on it.
    fn.begin = async <T,>(cb: (tx: Sql) => Promise<T>): Promise<T> => {
      await db.exec('BEGIN');
      try {
        const out = await cb(make());
        await db.exec('COMMIT');
        return out;
      } catch (e) {
        await db.exec('ROLLBACK');
        throw e;
      }
    };

    fn.end = async () => { /* closed via TestDb.close */ };
    return fn;
  };

  return { sql: make(), raw: db, close: () => db.close() };
}
