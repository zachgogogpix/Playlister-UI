import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://147.182.133.219:8000',
      '/clips': 'http://147.182.133.219:8000',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
