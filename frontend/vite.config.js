import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './setupTests.js',
    forbidOnly: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1,
        execArgv: ['--max-old-space-size=4096'],
      },
    },
    isolate: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      // Coverage gates reinstated after Vitest 4 / v8 upgrade investigation (issue #119).
      // Baseline metrics post-upgrade: lines ~78.9%, branches ~71.6%, functions ~72.3%, statements ~78.0%.
      // Thresholds set to baseline - safe margin (absorbs minor branch variance across PRs):
      // lines: 68, branches: 68, functions: 65, statements: 68.
      thresholds: {
        lines: 68,
        branches: 68,
        functions: 65,
        statements: 68,
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
