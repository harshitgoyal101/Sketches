import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))
const spaBase = process.env.VITE_SPA_BASE || '/'

export default defineConfig({
  plugins: [react()],
  base: spaBase,
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/accounts': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/sketches': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Served by Django at /app/ (see sketches/views_spa.py)
    outDir: path.resolve(root, '../sketches/static/spa'),
    emptyOutDir: true,
  },
})
