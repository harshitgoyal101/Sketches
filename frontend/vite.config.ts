import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage } from 'node:http'
import type { ClientRequest } from 'node:http'
import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))
const spaBase = process.env.VITE_SPA_BASE || '/'

/** Forward the browser's public host so Django build_absolute_uri works via tunnels. */
function forwardPublicHost(proxyReq: ClientRequest, req: IncomingMessage) {
  const host = req.headers.host
  if (!host) return
  proxyReq.setHeader('X-Forwarded-Host', host)
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  proxyReq.setHeader('X-Forwarded-Proto', isLocal ? 'http' : 'https')
}

const djangoProxy: ProxyOptions = {
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
  configure(proxy) {
    proxy.on('proxyReq', forwardPublicHost)
  },
}

export default defineConfig({
  plugins: [react()],
  base: spaBase,
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
    },
  },
  server: {
    host: true, // expose on LAN: http://<your-ip>:5173
    port: 5173,
    // Quick tunnels rotate hostnames; allow the whole domains.
    allowedHosts: [
      '.trycloudflare.com',
      '.inc1.devtunnels.ms',
      '.devtunnels.ms',
    ],
    proxy: {
      '/api': djangoProxy,
      '/accounts': djangoProxy,
      '/sketches': djangoProxy,
      '/static': djangoProxy,
      '/media': djangoProxy,
    },
  },
  build: {
    // Served by Django at /app/ (see sketches/views_spa.py)
    outDir: path.resolve(root, '../sketches/static/spa'),
    emptyOutDir: true,
  },
})
