import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Wadi Degla Operations Academy — build config.
// base:'./' keeps asset paths relative so the dist can be dropped onto any static host (Vercel/Netlify).
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { 'vendor-motion': ['motion'] },
      },
    },
  },
});
