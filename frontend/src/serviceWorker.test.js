/**
 * Service worker behaviour tests.
 *
 * The worker used to answer "/" and "/index.html" cache-first from a cache that
 * was never invalidated, so every returning visitor kept running the bundle from
 * the day they first opened the app, no matter how many deploys followed. These
 * tests run the real file against fakes of the worker globals.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import vm from 'vm'

const here = dirname(fileURLToPath(import.meta.url))
const SOURCE = readFileSync(resolve(here, '../public/service-worker.js'), 'utf-8')
const ORIGIN = 'https://gym.test'

const response = (body, { status = 200, type = 'basic' } = {}) => ({
  body,
  status,
  type,
  clone() {
    return { ...this }
  },
})

const request = (path, { method = 'GET', mode = 'cors', origin = ORIGIN } = {}) => ({
  url: `${origin}${path}`,
  method,
  mode,
})

function loadWorker({ fetchImpl, stored = {} } = {}) {
  const stores = new Map(Object.entries(stored).map(([name, entries]) => [name, new Map(Object.entries(entries))]))
  const handlers = {}
  const keyOf = (req) => (typeof req === 'string' ? req : new URL(req.url).pathname)

  const caches = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)
      return {
        put: async (req, res) => store.set(keyOf(req), res),
        addAll: async (urls) => urls.forEach((u) => store.set(u, response(`precached ${u}`))),
      }
    },
    match: async (req) => {
      for (const store of stores.values()) {
        if (store.has(keyOf(req))) return store.get(keyOf(req))
      }
      return undefined
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
  }

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => {
      handlers[type] = fn
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  }
  const fetchMock = vi.fn(fetchImpl ?? (async () => response('network')))

  vm.runInNewContext(SOURCE, {
    self,
    caches,
    fetch: fetchMock,
    URL,
    Promise,
    console,
    Response: { error: () => ({ type: 'error', status: 0 }) },
  })

  const dispatch = async (req) => {
    let answer
    handlers.fetch({ request: req, respondWith: (p) => { answer = p } })
    return answer === undefined ? undefined : await answer
  }
  const activate = async () => {
    let work
    handlers.activate({ waitUntil: (p) => { work = p } })
    await work
  }
  return { dispatch, activate, fetchMock, stores }
}

describe('service worker > app shell', () => {
  let page
  beforeEach(() => {
    page = request('/dashboard', { mode: 'navigate' })
  })

  it('asks the network for the page first, even when an older shell is cached', async () => {
    const worker = loadWorker({
      stored: { 'winnie-shell-v2': { '/': response('old shell'), '/index.html': response('old shell') } },
      fetchImpl: async () => response('new shell'),
    })

    const result = await worker.dispatch(request('/', { mode: 'navigate' }))

    expect(worker.fetchMock).toHaveBeenCalled()
    expect(result.body).toBe('new shell')
  })

  it('falls back to the cached shell when the network is unreachable', async () => {
    const worker = loadWorker({
      stored: { 'winnie-shell-v2': { '/index.html': response('cached shell') } },
      fetchImpl: async () => { throw new TypeError('Failed to fetch') },
    })

    const result = await worker.dispatch(page)

    expect(result.body).toBe('cached shell')
  })

  it('refreshes the cached shell with the latest page it fetched', async () => {
    const worker = loadWorker({ fetchImpl: async () => response('fresh shell') })

    await worker.dispatch(page)

    const cached = [...worker.stores.values()].find((store) => store.has('/index.html'))
    expect(cached.get('/index.html').body).toBe('fresh shell')
  })
})

describe('service worker > hashed assets', () => {
  it('serves content-hashed bundles from the cache without hitting the network', async () => {
    const worker = loadWorker({
      stored: { 'winnie-shell-v2': { '/assets/index-abc123.js': response('cached bundle') } },
    })

    const result = await worker.dispatch(request('/assets/index-abc123.js'))

    expect(result.body).toBe('cached bundle')
    expect(worker.fetchMock).not.toHaveBeenCalled()
  })

  it('does not cache a failed response', async () => {
    const worker = loadWorker({ fetchImpl: async () => response('nope', { status: 404 }) })

    await worker.dispatch(request('/assets/missing.js'))

    expect([...worker.stores.values()].every((store) => !store.has('/assets/missing.js'))).toBe(true)
  })
})

describe('service worker > requests it must leave alone', () => {
  it.each([
    ['a POST', request('/api/auth/login/', { method: 'POST' })],
    ['a cross-origin request', request('/api/anything', { origin: 'https://api.other.test' })],
  ])('ignores %s', async (_label, req) => {
    const worker = loadWorker()

    expect(await worker.dispatch(req)).toBeUndefined()
  })

  it('goes to the network first for API calls', async () => {
    const worker = loadWorker({
      stored: { 'winnie-shell-v2': { '/api/memberships/planes/': response('stale list') } },
      fetchImpl: async () => response('fresh list'),
    })

    const result = await worker.dispatch(request('/api/memberships/planes/'))

    expect(result.body).toBe('fresh list')
  })
})

describe('service worker > activation', () => {
  it('deletes the old shell cache that kept serving stale bundles', async () => {
    const worker = loadWorker({
      stored: {
        'winnie-shell-v1': { '/index.html': response('stale shell') },
        'winnie-shell-v2': {},
      },
    })

    await worker.activate()

    expect([...worker.stores.keys()]).not.toContain('winnie-shell-v1')
  })
})

describe('service worker > when there is nothing to fall back on', () => {
  // respondWith() must always receive a Response: undefined makes the browser log
  // "Failed to convert value to 'Response'" and breaks the page load.
  it.each([
    ['a navigation with no cached shell', request('/admin/clases', { mode: 'navigate' })],
    ['an asset that is not cached', request('/assets/other.js')],
    ['an API call that is not cached', request('/api/classes/clases/')],
  ])('answers %s with a network-error Response when the network is down', async (_label, req) => {
    const worker = loadWorker({ fetchImpl: async () => { throw new TypeError('Failed to fetch') } })

    const result = await worker.dispatch(req).catch((error) => error)

    expect(result).toEqual(expect.objectContaining({ type: 'error' }))
  })
})

