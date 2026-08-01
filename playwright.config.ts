import { defineConfig, devices } from '@playwright/test';

/**
 * The e2e suite drives the real SPA against a real cluster-guardian, with no
 * Kubernetes cluster involved: `serve --fixture` replays canned reports, and
 * two of them light up the trend chart and the run-over-run diff.
 *
 * CG_BIN points at the binary (CI downloads a release; locally, build the
 * backend repo and pass its path). Vite's dev server proxies /api to it, so
 * the browser sees one origin — the same shape as a production deployment
 * behind an ingress.
 */
const bin = process.env.CG_BIN ?? '../cluster-guardian/cluster-guardian';
const backendPort = process.env.CG_PORT ?? '8099';
const uiPort = 4173;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${uiPort}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Guards the responsive rules: the toolbar unsticks and the controls go
    // full-width below 640px.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // Auth is on so the suite can drive every role by setting request
      // headers. Trusting any peer is correct *here* and nowhere else: there
      // is no proxy in front of a test server, and the alternative is having
      // no coverage of the RBAC rendering at all.
      command: [
        bin,
        'serve',
        '--fixture e2e/fixtures/run1.json',
        '--fixture e2e/fixtures/run2.json',
        `--listen 127.0.0.1:${backendPort}`,
        '--auth-mode=proxy',
        '--auth-trusted-proxies=any',
        '--auth-group-role=platform=admin',
        '--auth-group-role=sre=operator',
        '--auth-default-role=viewer',
        '--auth-anonymous-role=viewer',
      ].join(' '),
      url: `http://127.0.0.1:${backendPort}/healthz`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
    },
    {
      // `vite preview` serves the production build, so the suite exercises the
      // bundle that actually ships rather than the dev-server variant.
      command: `npx vite preview --port ${uiPort} --strictPort`,
      url: `http://127.0.0.1:${uiPort}/`,
      reuseExistingServer: !process.env.CI,
      env: { CG_URL: `http://127.0.0.1:${backendPort}` },
    },
  ],
});
