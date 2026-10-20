import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Preloads the one display-face file the first screen needs (Alexandria Arabic
 * 600, ~13 KB), so the sign-in title is set in its own face without waiting for
 * the stylesheet to discover it. The file name is hashed at build time, so the
 * link is written into index.html from the bundle. Every other face loads on
 * demand through its unicode-range.
 */
const preloadDisplayFace = (): Plugin => ({
  name: 'preload-display-face',
  transformIndexHtml: {
    order: 'post',
    handler(_html, ctx) {
      const file = Object.keys(ctx.bundle ?? {}).find(f => /alexandria-arabic-600-normal-[\w-]+\.woff2$/.test(f));
      return file
        ? [{ tag: 'link', attrs: { rel: 'preload', href: `./${file}`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' }]
        : [];
    },
  },
});

// Wadi Degla Operations Academy — build config.
// base:'./' keeps asset paths relative so the dist can be dropped onto any static host (Vercel/Netlify).
// Chunking is left to the bundler: route-level lazy() and LazyMotion decide
// what loads first, and a hand-written manualChunks rule would pull lazy code
// back into the initial download.
export default defineConfig({
  base: './',
  plugins: [react(), preloadDisplayFace()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
