// Playwright E2E: drives a real browser against the headless Node host serving the REAL
// exported web bundle (Phase 1A §4.1, QA-002). The host is the same embedded-server logic
// the native host runs, so a green browser run exercises the production serving path.
//
// Pre-req: the bundle must be exported first (`npm run embed:web`). CI does this in the
// web-e2e job (Task 10); locally, run it once before `npm run e2e`.
import {defineConfig, devices} from '@playwright/test';
import * as path from 'path';


const PORT = Number(process.env.E2E_PORT ?? 8099);
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: __dirname,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run harness:start -- --port ${PORT} --dist dist-embedded`,
    cwd: path.join(__dirname, '..'),
    url: `${BASE}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
  ],
});
