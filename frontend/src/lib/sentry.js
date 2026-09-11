import * as Sentry from '@sentry/react'

/**
 * Initialise Sentry when a DSN is configured via `VITE_SENTRY_DSN`.
 * Called once from `main.jsx` before React renders.
 *
 * Free tier caveats:
 * - `tracesSampleRate` is 0.1 in production and 0 in dev to stay under the quota.
 * - `replaysSessionSampleRate` is 0 by default; enable per-env with
 *   `VITE_SENTRY_REPLAYS` if el equipo compra el add-on de session replay.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    return
  }

  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE

  Sentry.init({
    dsn,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
    ],
    tracesSampleRate: environment === 'production' ? 0.1 : 0,
    profilesSampleRate: environment === 'production' ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Drop obvious dev noise (e.g., HMR errors) so the free quota lasts.
      if (environment === 'development' && event.exception?.values?.some((e) => e.value?.includes('HMR'))) {
        return null
      }
      return event
    },
  })
}
