import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// The web package's own version (kept in sync with desktop releases). Read at
// build time from ./package.json — relative to this file so it resolves inside
// the Docker build context (./web), not the absent repo root.
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string };

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /insight-lens/, so build with that base by default.
  // The Docker image overrides with BASE_URL=/ (self-host serves a root domain).
  base: process.env.BASE_URL ?? '/insight-lens/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // During `npm run dev` the AI server runs separately (npm run dev:server on
  // :8080). Proxy /api so the browser hits it same-origin.
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
});
