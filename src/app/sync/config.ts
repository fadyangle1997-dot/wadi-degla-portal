/**
 * Backend selection — ADR-003. One flag decides local vs remote. Everything
 * above reads adapters through the stores, which read this. Production switch
 * is literally: set mode='remote' and provide the API base URL.
 */
export interface BackendConfig {
  readonly mode: 'local' | 'remote';
  readonly apiBaseUrl?: string;
}

/** Default: local (prototype). Production config injected at deploy time. */
export const BACKEND_CONFIG: BackendConfig = { mode: 'local' };
