/**
 * The database connection, behind one small interface.
 *
 * `Sql` is the slice of postgres.js the server actually uses: a tagged template
 * for parameterised queries, `unsafe` for whole migration files, `begin` for a
 * transaction, `end` to close. Tests bind the same interface to PGlite — real
 * Postgres compiled to WASM — so migrations, constraints and sequences are
 * exercised against a real engine rather than a mock that agrees with us.
 *
 * Parameterisation is not optional here: every value reaches the database
 * through the tagged template, never through string concatenation.
 */
export interface Sql {
  <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  unsafe(query: string, params?: unknown[]): Promise<unknown>;
  begin<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
  end(): Promise<void>;
}

/**
 * Connects using DATABASE_URL. Throws when it is missing — a server that starts
 * without a database and discovers it on the first request fails somewhere far
 * from the cause.
 */
export async function connect(url = process.env.DATABASE_URL): Promise<Sql> {
  if (!url) throw new Error('DATABASE_URL is not set');
  const { default: postgres } = await import('postgres');
  return postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    // The pilot runs against a managed instance; TLS is the default there and
    // must not be silently disabled by a connection string that omits it.
    ssl: process.env.DB_SSL === 'disable' ? false : 'prefer',
  }) as unknown as Sql;
}
