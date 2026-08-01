import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      host: process.env.CODESPACE_NAME
        ? `${process.env.CODESPACE_NAME}-${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
        : undefined,
      protocol: process.env.CODESPACE_NAME ? 'wss' : 'ws',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
}))
