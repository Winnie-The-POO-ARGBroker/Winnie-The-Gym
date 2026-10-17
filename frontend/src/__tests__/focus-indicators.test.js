import { describe, it, expect } from 'vitest'
import tailwindConfig from '../../tailwind.config.js'

const sources = import.meta.glob(['../**/*.{js,jsx}', '!../**/*.test.*', '!../**/__tests__/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

// Matches `outline-none` / `focus:outline-none` class tokens. `peer-focus:` and
// other prefixed variants are ignored because they style a sibling, not the control.
const OUTLINE_NONE = /(^|[\s'"`])(focus:)?outline-none(?=[\s'"`]|$)/
const HAS_FOCUS_INDICATOR = /focus(-visible)?:ring/

describe('focus indicators (#347)', () => {
  it('never removes the outline without a focus ring on the same className', () => {
    const offenders = []
    for (const [file, content] of Object.entries(sources)) {
      content.split('\n').forEach((line, i) => {
        if (OUTLINE_NONE.test(line) && !HAS_FOCUS_INDICATOR.test(line)) {
          offenders.push(`${file.replace('../', 'src/')}:${i + 1}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })

  it('defines the primary-500 color used by focus-visible:ring-primary-500', () => {
    const { primary } = tailwindConfig.theme.extend.colors
    expect(primary).toMatchObject({ DEFAULT: expect.any(String), 500: expect.any(String) })
  })
})
