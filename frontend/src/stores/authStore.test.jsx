/**
 * Tests for authStore Zustand store.
 *
 * Coverage uplift for authStore.js.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import useAuthStore from './authStore'

const INITIAL = { user: null, accessToken: null, refreshToken: null }

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    // Merge reset (not replace) — keeps the action functions intact
    useAuthStore.setState(INITIAL)
  })

  it('initial state: user, accessToken, refreshToken are null', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
  })

  it('setAuth sets user, accessToken, and refreshToken', () => {
    const user = { id: 1, email: 'test@winnie.local', rol: 'socio' }
    useAuthStore.getState().setAuth({ user, access: 'access-token', refresh: 'refresh-token' })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(user)
    expect(state.accessToken).toBe('access-token')
    expect(state.refreshToken).toBe('refresh-token')
  })

  it('clearAuth resets user, accessToken, and refreshToken to null', () => {
    // First set something
    useAuthStore.getState().setAuth({
      user: { id: 1 },
      access: 'tok',
      refresh: 'ref',
    })

    // Then clear
    useAuthStore.getState().clearAuth()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
  })

  it('store is subscribed to localStorage via persist middleware', () => {
    useAuthStore.getState().setAuth({
      user: { id: 1, email: 'a@b.com' },
      access: 'tok',
      refresh: 'ref',
    })

    // The persist middleware should write to localStorage
    const stored = localStorage.getItem('auth-storage')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored)
    expect(parsed.state.accessToken).toBe('tok')
  })

  it('setAuth updates store state without affecting unrelated fields', () => {
    useAuthStore.getState().setAuth({
      user: { id: 2, email: 'b@c.com' },
      access: 'tok2',
      refresh: 'ref2',
    })

    const state = useAuthStore.getState()
    // setAuth and clearAuth functions should still exist
    expect(typeof state.setAuth).toBe('function')
    expect(typeof state.clearAuth).toBe('function')
  })
})
