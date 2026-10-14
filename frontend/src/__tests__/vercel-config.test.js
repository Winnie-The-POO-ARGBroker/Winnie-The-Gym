/**
 * Regression test for vercel.json Permissions-Policy header (fix #205).
 * Ensures camera is allowed for self-origin and microphone/geolocation stay disabled.
 */
import { describe, it, expect } from 'vitest'
import vercelConfig from '../../vercel.json'

function getPermissionsPolicy() {
  return vercelConfig.headers
    .flatMap((h) => h.headers)
    .find((h) => h.key === 'Permissions-Policy')
}

describe('vercel-config > Permissions-Policy', () => {
  it('camera must be enabled for self origin', () => {
    const header = getPermissionsPolicy()
    expect(header).toBeDefined()
    expect(header.value).toMatch(/camera=\(self\)/)
    expect(header.value).not.toMatch(/camera=\(\)/)
  })

  it('microphone and geolocation stay disabled', () => {
    const header = getPermissionsPolicy()
    expect(header).toBeDefined()
    expect(header.value).toMatch(/microphone=\(\)/)
    expect(header.value).toMatch(/geolocation=\(\)/)
  })
})
