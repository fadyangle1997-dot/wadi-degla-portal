/**
 * Configuration and logging.
 *
 * Everything that differs between staging and production is an environment
 * variable, read once, here. Nothing is defaulted to a production value: a
 * missing DATABASE_URL must stop the server, not point it somewhere plausible.
 *
 * Secrets never appear in this file, in the repository, or in a log line — the
 * logger redacts the fields that could carry one even by accident.
 */
import pino from 'pino';

export interface ServerConfig {
  readonly env: 'development' | 'staging' | 'production' | 'test';
  readonly port: number;
  readonly host: string;
  readonly databaseUrl: string | undefined;
  readonly logLevel: string;
  readonly buildSha: string;
}

export const config: ServerConfig = {
  env: (process.env.NODE_ENV as ServerConfig['env']) ?? 'development',
  port: Number(process.env.PORT ?? 8080),
  // 0.0.0.0 because a container's health check reaches it from outside.
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL,
  logLevel: process.env.LOG_LEVEL ?? 'info',
  buildSha: process.env.BUILD_SHA ?? 'dev',
};

/**
 * Structured JSON to stdout — the RUNBOOK's monitoring list needs fields, not
 * prose. `redact` covers the headers and body keys that carry credentials, so
 * a token cannot reach a log through a future `log.info({ req })`.
 */
export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'token',
      '*.token',
      'accessToken',
      'refreshToken',
    ],
    censor: '[redacted]',
  },
  base: { service: 'wda-api', env: config.env, build: config.buildSha },
});
