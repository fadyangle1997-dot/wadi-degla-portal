import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    // e2e/ belongs to Playwright.
    exclude: ['**/node_modules/**', 'e2e/**', 'dist/**', 'legacy/**'],
    // The first server test in a file boots the embedded Postgres (PGlite,
    // WASM) inside its own budget; with every file running in parallel that
    // boot alone measured 5.3s, past the 5s default.
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'server/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.d.ts', 'src/main.tsx'],
      reporter: ['text-summary', 'html'],
      // Floors, not targets: CI fails if coverage drops below today's level.
      // The domain is where the money and the readiness decisions are, so it
      // is held much higher. Screens are covered by the Playwright suite.
      thresholds: {
        lines: 55, statements: 53, functions: 40, branches: 35,
        'src/domain/**': { lines: 90, statements: 88, functions: 85, branches: 78 },
      },
    },
  },
}));
