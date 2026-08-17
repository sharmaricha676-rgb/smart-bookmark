import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Standalone build.
 *
 * Produces one classic-script bundle with no code splitting, which
 * `scripts/inline-build.mjs` then folds into a single HTML file. The point is a
 * file you can double-click: ES modules are blocked over `file://`, so the
 * output deliberately avoids `type="module"` and dynamic imports.
 *
 *   npm run build:single   ->  dist-single/smart-bookmark.html
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-single',
    target: 'es2020',
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        chunkFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
});
