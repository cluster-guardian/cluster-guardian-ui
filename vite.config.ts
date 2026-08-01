/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The SPA is served from the root of its own origin. In dev, /api and /metrics
// are proxied to a running `cluster-guardian serve` so the browser never sees
// a cross-origin request (the Go server sends no CORS headers).
//
// CG_URL points at that backend; `serve --fixture` on :8099 is the zero-cluster
// default used by the e2e suite and by `npm run dev` on a laptop.
const backend = process.env.CG_URL ?? 'http://127.0.0.1:8099';

// `/` is deliberately not proxied: it belongs to the SPA. Only the backend's
// own routes are forwarded, which is the same split an ingress applies in
// production.
const proxy = {
  '/api': { target: backend, changeOrigin: true },
  '/healthz': { target: backend, changeOrigin: true },
  '/metrics': { target: backend, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  // `vite preview` needs the same proxy, so the e2e suite can drive the
  // production bundle rather than the dev-server variant. Bind explicitly to
  // 127.0.0.1: the default resolves to ::1 only, which the e2e baseURL and
  // Playwright's readiness probe cannot reach.
  preview: { host: '127.0.0.1', port: 4173, proxy },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Charts are only needed on the cluster view; keeping recharts out of
        // the entry chunk keeps the fleet overview's first paint small.
        manualChunks: (id) => (id.includes('node_modules/recharts') ? 'charts' : undefined),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
