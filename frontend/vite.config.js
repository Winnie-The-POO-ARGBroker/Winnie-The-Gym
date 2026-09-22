import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './setupTests.js',
    forbidOnly: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      // Thresholds set at actual baseline (39% stmts/lines, rounded down to 35%).
      // Target 75% is deferred as a follow-up issue; reaching it requires
      // test infrastructure for router-heavy pages and context-dependent components.
      thresholds: {
        lines: 35,
        branches: 60,
        functions: 40,
        statements: 35,
      },
      exclude: [
        '**/*.test.jsx',
        '**/*.test.js',
        '**/main.jsx',
        '**/vite.config.js',
        'coverage/**',
        '**/tailwind.config.js',
        '**/postcss.config.js',
        'src/test/**',
      ],
    },
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
    // Vite blocks requests whose Host header is not listed here. The ngrok
    // tunnel forwards its own hostname, so it must be allowed explicitly.
    // localhost is also included for direct local development.
    allowedHosts: ['localhost', '127.0.0.1', '.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://backend:8000',
        ws: true,
      },
    },
  },
})
