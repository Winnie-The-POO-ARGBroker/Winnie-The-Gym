/* eslint-disable no-undef */
/**
 * viewport-helpers.js — Utilities for mocking viewport dimensions in tests.
 *
 * This file is only used in test contexts (Vitest). `vi` is a Vitest global
 * available implicitly in test files — no explicit import needed.
 *
 * Usage:
 *   import { mockViewport } from '../../test/viewport-helpers'
 *
 *   beforeEach(() => mockViewport(375))  // mobile
 *   // or
 *   afterEach(() => mockViewport(1280)) // restore to desktop
 */

/**
 * Mocks window.matchMedia to match the given viewport width.
 * Also sets window.innerWidth so components that read it directly also work.
 *
 * @param {number} width - viewport width in pixels
 */
export function mockViewport(width) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })

  window.matchMedia = vi.fn().mockImplementation((query) => {
    // Parse max-width queries
    const maxMatch = query.match(/\(max-width:\s*(\d+)px\)/)
    if (maxMatch) {
      const maxW = parseInt(maxMatch[1], 10)
      return {
        matches: width <= maxW,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    }

    // Parse min-width queries
    const minMatch = query.match(/\(min-width:\s*(\d+)px\)/)
    if (minMatch) {
      const minW = parseInt(minMatch[1], 10)
      return {
        matches: width >= minW,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    }

    // Default: no match for unknown queries
    return {
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}
