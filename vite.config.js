import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages needs /Adventure/ prefix, but Capacitor iOS loads from
// local filesystem so it must use relative paths.  Set IOS_BUILD=true
// (or the CI will do it) when building for iOS.
const iosBuild = !!process.env.IOS_BUILD;

export default defineConfig({
  base: iosBuild ? './' : '/Adventure/',
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
