/**
 * The API service — Phase 1.
 *
 * What exists: a Fastify instance, a database connection, migrations, `/health`
 * and structured logging. What deliberately does not: authentication,
 * authorization, events, and every other endpoint. Each arrives in its own
 * phase with its own tests, because a route added before the guard that
 * protects it tends to grow its own ad-hoc filter.
 *
 * `buildServer` is exported without starting anything so tests can drive the
 * app in-process, against PGlite, with no port and no network.
 */
import Fastify, { type FastifyInstance, type FastifyBaseLogger } from 'fastify';
import { config, logger } from './config';
import { registerHealth } from './routes/health';
import type { Sql } from './db/client';

export interface BuildOptions {
  /** Omitted when the server should run without a database (health reports it). */
  readonly sql?: Sql;
}

export function buildServer(opts: BuildOptions = {}): FastifyInstance {
  // The pino instance narrows Fastify's logger type parameter, and every route
  // module would otherwise have to spell that narrowing out. `loggerInstance`
  // is passed as a base logger so the app stays the plain FastifyInstance the
  // routes are written against.
  const app = Fastify({
    loggerInstance: logger as unknown as FastifyBaseLogger,
    // Fastify generates one per request; it appears on every log line for that
    // request, which is what makes a production trace followable.
    genReqId: () => crypto.randomUUID(),
    // The pilot sits behind a platform proxy; without this every client IP in
    // the logs is the proxy's.
    trustProxy: true,
    bodyLimit: 1_048_576,
  });

  registerHealth(app, { sql: opts.sql });

  app.setNotFoundHandler((req, reply) => {
    // No hint about what else might exist. Phase 1 has one route.
    reply.code(404).send({ error: 'not_found', path: req.url });
  });

  app.setErrorHandler((err: { statusCode?: number }, req, reply) => {
    app.log.error({ err, reqId: req.id }, 'unhandled error');
    // The message stays in the log; the client gets a code and its request id.
    reply.code(err.statusCode ?? 500).send({ error: 'internal_error', reqId: req.id });
  });

  return app;
}

/** Entry point: connect, migrate, listen. Any failure exits non-zero. */
export async function start(): Promise<void> {
  const { connect } = await import('./db/client');
  const { migrate } = await import('./db/migrate');

  const sql = await connect();
  const result = await migrate(sql);
  logger.info({ applied: result.applied, skipped: result.skipped.length }, 'migrations complete');

  const app = buildServer({ sql });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    await app.close();
    await sql.end();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ port: config.port, host: config.host });
  logger.info({ port: config.port, env: config.env }, 'wda-api listening');
}

// Only when run directly — importing this module in a test must not open a port.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  start().catch(err => {
    logger.error({ err }, 'failed to start');
    process.exit(1);
  });
}
