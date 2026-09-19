/**
 * `/health` — the one endpoint Phase 1 exposes.
 *
 * It answers a single question honestly: can this instance serve requests that
 * need the database? A health check that returns 200 while the database is
 * unreachable is worse than none — the load balancer keeps sending traffic to
 * an instance that cannot do anything, and the RUNBOOK's first alert never
 * fires.
 *
 * 200 = process up AND database answering. 503 = process up, database not.
 * The body names which, so an operator reading the alert knows where to look.
 */
import type { FastifyInstance } from 'fastify';
import type { Sql } from '../db/client';
import { config } from '../config';

export interface HealthDeps {
  /** Left undefined when the server starts with no database configured. */
  readonly sql?: Sql;
}

export function registerHealth(app: FastifyInstance, deps: HealthDeps): void {
  app.get('/health', async (_req, reply) => {
    const startedAt = Date.now();
    let database: 'up' | 'down' = 'down';
    let error: string | undefined;

    if (deps.sql) {
      try {
        await deps.sql`SELECT 1`;
        database = 'up';
      } catch (e) {
        // The message is logged in full; the response says only that it failed.
        // A connection error can carry a host, a user, sometimes a password.
        app.log.error({ err: e }, 'health: database check failed');
        error = 'database_unreachable';
      }
    } else {
      error = 'database_not_configured';
    }

    const body = {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'wda-api',
      env: config.env,
      build: config.buildSha,
      database,
      checkedInMs: Date.now() - startedAt,
      ...(error ? { error } : {}),
    };

    return reply.code(database === 'up' ? 200 : 503).send(body);
  });
}
