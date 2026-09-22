/**
 * Shared test-utils factory for Vitest + RTL tests.
 *
 * Provides:
 *   createTestQueryClient   — fresh QueryClient per call (retry=false, gcTime=0)
 *   renderWithProviders     — renders UI inside QueryClientProvider + MemoryRouter
 *   renderHookWithProviders — wraps renderHook with the same providers
 *   seedAuthStore           — sets deterministic auth state via Zustand setState
 *   resetAllStores          — clears localStorage + resets every Zustand store
 *   makeAuthedUser          — convenience user object factory
 *
 * Design: §1.1–§1.6 of speckit/frontend-coverage-and-walkthrough/design.md
 */

import { render, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import useAuthStore from '../stores/authStore'

// ─── Auth initial state (mirrors authStore.js initial shape) ───────────────────
const AUTH_INITIAL_STATE = {
  user: null,
  accessToken: null,
  refreshToken: null,
}

// ─── QueryClient factory ───────────────────────────────────────────────────────

/**
 * Returns a fresh QueryClient with retries and caching disabled so tests are
 * deterministic and isolated from each other.
 *
 * @param {Object} [overrides] - merged into defaultOptions for edge-case tests
 */
export function createTestQueryClient(overrides = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        ...overrides,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// ─── Provider wrapper ──────────────────────────────────────────────────────────

function TestProviders({ children, queryClient, route = '/', routerProps = {} }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]} {...routerProps}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/**
 * Renders `ui` inside QueryClientProvider + MemoryRouter.
 *
 * @param {React.ReactElement} ui
 * @param {Object} [options]
 * @param {string}       [options.route='/']       - initial router entry
 * @param {Object}       [options.routerProps={}]  - extra MemoryRouter props
 * @param {QueryClient}  [options.queryClient]     - use a pre-built client (created fresh if omitted)
 * @param {Object}       [options.authState]       - if provided, seeds auth store before render
 * @returns RTL render result plus { queryClient }
 */
export function renderWithProviders(ui, options = {}) {
  const {
    route = '/',
    routerProps = {},
    queryClient = createTestQueryClient(),
    authState,
    ...rtlOptions
  } = options

  if (authState !== undefined) {
    seedAuthStore(authState)
  }

  const result = render(
    <TestProviders queryClient={queryClient} route={route} routerProps={routerProps}>
      {ui}
    </TestProviders>,
    rtlOptions,
  )

  return { ...result, queryClient }
}

/**
 * Wraps RTL's renderHook with QueryClientProvider + MemoryRouter.
 *
 * @param {Function} hook
 * @param {Object} [options]
 * @param {QueryClient} [options.queryClient]
 * @param {Object}      [options.authState]
 * @param {string}      [options.route='/']
 * @param {*}           [options.initialProps]
 */
export function renderHookWithProviders(hook, options = {}) {
  const {
    queryClient = createTestQueryClient(),
    authState,
    route = '/',
    routerProps = {},
    ...rest
  } = options

  if (authState !== undefined) {
    seedAuthStore(authState)
  }

  return renderHook(hook, {
    wrapper: ({ children }) => (
      <TestProviders queryClient={queryClient} route={route} routerProps={routerProps}>
        {children}
      </TestProviders>
    ),
    ...rest,
  })
}

// ─── Store helpers ─────────────────────────────────────────────────────────────

/**
 * Seeds the auth store with a partial state for deterministic auth in tests.
 * Merges defaults with the provided partial state.
 *
 * @param {Object} [partialState={}]
 */
export function seedAuthStore(partialState = {}) {
  useAuthStore.setState({ ...AUTH_INITIAL_STATE, ...partialState })
}

/**
 * Resets all Zustand stores to their declared initial state.
 *
 * IMPORTANT: localStorage.clear() MUST run before setState to prevent the
 * persist middleware from rehydrating the old token on the next store read.
 * See design §1.5, §8.2.
 */
export function resetAllStores() {
  localStorage.clear()
  useAuthStore.setState(AUTH_INITIAL_STATE, true)
}

// ─── User factory ──────────────────────────────────────────────────────────────

const USER_DEFAULTS = {
  socio: {
    id: 1,
    email: 'socio.activo@winnie.local',
    nombre: 'Juan',
    apellido: 'Pérez',
    rol: 'socio',
  },
  admin: {
    id: 2,
    email: 'admin@winnie.local',
    nombre: 'Admin',
    apellido: 'Winnie',
    rol: 'administrador',
  },
  recepcion: {
    id: 3,
    email: 'recepcion@winnie.local',
    nombre: 'Recep',
    apellido: 'Gym',
    rol: 'recepcionista',
  },
}

/**
 * Returns a plausible user object for the given role.
 *
 * @param {'socio'|'admin'|'recepcion'} [role='socio']
 * @param {Object} [overrides={}]
 */
export function makeAuthedUser(role = 'socio', overrides = {}) {
  return { ...(USER_DEFAULTS[role] ?? USER_DEFAULTS.socio), ...overrides }
}
