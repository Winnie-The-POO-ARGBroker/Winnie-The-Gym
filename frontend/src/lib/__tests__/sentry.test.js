import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as Sentry from '@sentry/react'
import { initSentry } from '../sentry'

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  browserProfilingIntegration: vi.fn(() => ({})),
}))

const VALID_DSN = 'https://abc123@o123.ingest.sentry.io/456'

describe('initSentry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['sin definir', ''],
    ['solo comillas (valor cargado como "" en Vercel)', '""'],
    ['solo espacios', '   '],
    ['un texto que no es una URL', 'not-a-dsn'],
  ])('no inicializa Sentry con un DSN %s', (_label, dsn) => {
    vi.stubEnv('VITE_SENTRY_DSN', dsn)

    initSentry()

    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('inicializa Sentry con un DSN válido', () => {
    vi.stubEnv('VITE_SENTRY_DSN', VALID_DSN)

    initSentry()

    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: VALID_DSN }))
  })

  it('quita las comillas y los espacios que rodean al DSN', () => {
    vi.stubEnv('VITE_SENTRY_DSN', `  "${VALID_DSN}"  `)

    initSentry()

    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: VALID_DSN }))
  })
})
