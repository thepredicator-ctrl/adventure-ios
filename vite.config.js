import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repo at /Adventure/, so all asset URLs must be
// prefixed with that base. For local dev, `npm run dev` still works on /.
export default defineConfig({
  base: '/Adventure/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 1200
  },
  server: {
    port: 5173,
    open: true
  }
});
