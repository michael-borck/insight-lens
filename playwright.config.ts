/**
 * Playwright end-to-end tests for the InsightLens Electron app.
 *
 * PREREQUISITE: the app must already be built. Run `npm run build` first
 * (compiles the main process to dist/main and the renderer to dist/renderer);
 * then run `npm run test:e2e`. The config deliberately does not auto-build so
 * test runs are fast and always exercise exactly the build you produced.
 *
 * The tests launch the real Electron binary production-style (`electron .`)
 * with a throwaway userData directory and a seeded SQLite database — see
 * tests/e2e/helpers.ts. Trace capture (retain-on-failure semantics) is also
 * handled there, because the Electron BrowserContext is created manually
 * rather than by Playwright's built-in browser fixtures.
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  // Electron app instances all point at the same build and bind real OS
  // windows — run them strictly one at a time.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
});
