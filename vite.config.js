import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Local dev and `npm run preview` serve from the root. GitHub Pages serves a
  // project site from /<repo>/, so CI sets VITE_BASE to that prefix.
  base: process.env.VITE_BASE || '/',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
