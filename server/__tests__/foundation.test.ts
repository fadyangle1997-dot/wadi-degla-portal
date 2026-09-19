/**
 * @vitest-environment node
 *
 * Phase 1 contracts. Each one guards a property the later phases assume and
 * would otherwise discover in production:
 *  - the migration applies to an empty database and is safe to re-run
 *  - `seq` is monotonic per log under concurrency (the sync cursor)
 *  - the same `event_id` twice is ONE row (idempotency, Phase 4's retry path)
 *  - `/health` tells the truth about the database
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createTestDb, type TestDb } from './pglite';
import { migrate, migrationFiles } from '../db/migrate';
import { buildServer } from '../index';
import type { Sql } from '../db/client';

let db: TestDb | undefined;
afterEach(async () => { await db?.close(); db = undefined; });

const fresh = async () => {
  db = await createTestDb();
  return db.sql;
};

/** Appends one event the way Phase 4's route will: seq from the log's sequence. */
const append = (sql: Sql, log: string, eventId: string, type: string, actor = 'u1') =>
  sql`
    INSERT INTO events (log, seq, event_id, actor_id, subject_id, type, payload, occurred_at)
    VALUES (${log}, nextval(${'events_' + log + '_seq'}), ${eventId}::uuid, ${actor}, ${actor}, ${type}, '{}'::jsonb, now())
    RETURNING seq`;

describe('migrations', () => {
  it('applies cleanly to an empty database', async () => {
    const sql = await fresh();
    const result = await migrate(sql);
    expect(result.applied).toEqual(migrationFiles());
    expect(result.applied).toContain('001_init.sql');

    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const names = tables.map(t => t.table_name);
    for (const t of ['organizations', 'areas', 'branches', 'roles', 'users', 'enrolments', 'events', 'audit_events']) {
      expect(names, `missing table ${t}`).toContain(t);
    }
  });

  it('is safely repeatable — a second run applies nothing and changes nothing', async () => {
    const sql = await fresh();
    await migrate(sql);
    const second = await migrate(sql);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual(migrationFiles());
  });

  it('records what it applied, so a half-run is visible', async () => {
    const sql = await fresh();
    await migrate(sql);
    const rows = await sql<{ name: string }[]>`SELECT name FROM schema_migrations ORDER BY name`;
    expect(rows.map(r => r.name)).toEqual(migrationFiles());
  });
});

describe('event log constraints', () => {
  it('assigns a monotonic seq per log, independently', async () => {
    const sql = await fresh();
    await migrate(sql);

    const a = await append(sql, 'progress', '11111111-1111-4111-8111-111111111111', 'LESSON_COMPLETED');
    const b = await append(sql, 'progress', '22222222-2222-4222-8222-222222222222', 'LESSON_COMPLETED');
    const t = await append(sql, 'training', '33333333-3333-4333-8333-333333333333', 'UNIT_SUBMITTED_FOR_REVIEW');

    expect(Number((b as { seq: string }[])[0]!.seq)).toBeGreaterThan(Number((a as { seq: string }[])[0]!.seq));
    // a separate log has its own counter — logs do not share a cursor
    expect(Number((t as { seq: string }[])[0]!.seq)).toBe(1);
  });

  it('🔴 refuses the same event_id twice in a log — idempotency, not duplication', async () => {
    const sql = await fresh();
    await migrate(sql);
    const id = '44444444-4444-4444-8444-444444444444';
    await append(sql, 'progress', id, 'COMMITMENT_MADE');
    await expect(append(sql, 'progress', id, 'COMMITMENT_MADE')).rejects.toThrow();
  });

  it('the same event_id in a DIFFERENT log is allowed', async () => {
    const sql = await fresh();
    await migrate(sql);
    const id = '55555555-5555-4555-8555-555555555555';
    await append(sql, 'progress', id, 'LESSON_COMPLETED');
    await expect(append(sql, 'training', id, 'EVALUATION_RECORDED')).resolves.toBeDefined();
  });

  it('refuses an unknown log name', async () => {
    const sql = await fresh();
    await migrate(sql);
    await expect(sql`
      INSERT INTO events (log, seq, event_id, actor_id, type, occurred_at)
      VALUES ('analytics', 1, '66666666-6666-4666-8666-666666666666'::uuid, 'u1', 'X', now())`)
      .rejects.toThrow();
  });
});

describe('/health', () => {
  it('returns 200 and reports the database up when it answers', async () => {
    const sql = await fresh();
    await migrate(sql);
    const app = buildServer({ sql });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('up');
    await app.close();
  });

  it('🔴 returns 503 when the database is unreachable — never 200', async () => {
    const broken: Sql = Object.assign(
      (async () => { throw new Error('connection refused'); }) as unknown as Sql,
      { unsafe: async () => { throw new Error('x'); }, begin: async () => { throw new Error('x'); }, end: async () => {} },
    );
    const app = buildServer({ sql: broken });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json().database).toBe('down');
    expect(res.json().error).toBe('database_unreachable');
    await app.close();
  });

  it('returns 503 when no database is configured at all', async () => {
    const app = buildServer({});
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('database_not_configured');
    await app.close();
  });

  it('leaks no connection detail in the response body', async () => {
    const broken: Sql = Object.assign(
      (async () => { throw new Error('password=hunter2 host=db.internal'); }) as unknown as Sql,
      { unsafe: async () => { throw new Error('x'); }, begin: async () => { throw new Error('x'); }, end: async () => {} },
    );
    const app = buildServer({ sql: broken });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.body).not.toContain('hunter2');
    expect(res.body).not.toContain('db.internal');
    await app.close();
  });

  it('Phase 1 exposes no other route', async () => {
    const app = buildServer({});
    for (const url of ['/users', '/events/progress', '/auth/session']) {
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404);
    }
    await app.close();
  });
});
