import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: path.join(__dirname, 'src/renderer'),
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    // The renderer only ever runs in Electron's bundled (modern) Chromium,
    // so there's no reason to downlevel to legacy browser targets. Targeting
    // esnext also keeps esbuild off its syntax-lowering passes entirely.
    target: 'esnext'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@docs': path.resolve(__dirname, './docs')
    }
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname)]
    }
  }
});