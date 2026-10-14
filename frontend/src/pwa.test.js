/**
 * PWA contract tests — #203
 *
 * Validates that manifest.json has all required PWA fields,
 * and that index.html includes manifest link and SW registration.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

function readManifest() {
  return JSON.parse(readFileSync(resolve(ROOT, 'public/manifest.json'), 'utf-8'))
}

describe('manifest.json > has required PWA fields (name, start_url, display, icons)', () => {
  it('parses as valid JSON', () => {
    const m = readManifest()
    expect(m).toBeTruthy()
  })

  it('has required name field', () => {
    const m = readManifest()
    expect(m.name).toBeTruthy()
    expect(typeof m.name).toBe('string')
  })

  it('has required short_name field', () => {
    expect(readManifest().short_name).toBeTruthy()
  })

  it('has required start_url field', () => {
    expect(readManifest().start_url).toBeTruthy()
  })

  it('has display=standalone', () => {
    expect(readManifest().display).toBe('standalone')
  })

  it('has theme_color', () => {
    expect(readManifest().theme_color).toBeTruthy()
  })

  it('has icons array with at least 192 and 512 sizes', () => {
    const m = readManifest()
    expect(Array.isArray(m.icons)).toBe(true)
    expect(m.icons.length).toBeGreaterThanOrEqual(2)
    const sizes = m.icons.map((i) => i.sizes)
    expect(sizes.some((s) => s?.includes('192'))).toBe(true)
    expect(sizes.some((s) => s?.includes('512'))).toBe(true)
  })
})

describe('index.html > registers service worker and includes manifest link', () => {
  it('includes manifest link tag', () => {
    const html = readFileSync(resolve(ROOT, 'index.html'), 'utf-8')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('/manifest.json')
  })

  it('includes apple-touch-icon link', () => {
    const html = readFileSync(resolve(ROOT, 'index.html'), 'utf-8')
    expect(html).toContain('apple-touch-icon')
  })
})

describe('main.jsx > registers service worker', () => {
  it('calls navigator.serviceWorker.register with service-worker.js', () => {
    const mainSrc = readFileSync(resolve(ROOT, 'src/main.jsx'), 'utf-8')
    expect(mainSrc).toContain('serviceWorker')
    expect(mainSrc).toContain('register')
    expect(mainSrc).toContain('service-worker.js')
  })
})
