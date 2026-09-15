import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './setupTests.js',
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
    // Vite blocks requests whose Host header is not listed here. The ngrok
    // tunnel forwards its own hostname, so it must be allowed explicitly.
    allowedHosts: ['.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
