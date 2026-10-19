import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Wadi Degla Operations Academy — build config.
// base:'./' keeps asset paths relative so the dist can be dropped onto any static host (Vercel/Netlify).
// Chunking is left to the bundler: route-level lazy() and LazyMotion decide
// what loads first, and a hand-written manualChunks rule would pull lazy code
// back into the initial download.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
