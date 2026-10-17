import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Button from '../Button'
import tailwindConfig from '../../../../tailwind.config.js'

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('Button primary contrast (#346)', () => {
  it('uses a background that gives white text at least 4.5:1 contrast', () => {
    render(<Button>Guardar</Button>)
    const classes = screen.getByRole('button', { name: /guardar/i }).className.split(/\s+/)

    expect(classes).toContain('text-white')
    const bgClass = classes.find((c) => c.startsWith('bg-') && c !== 'bg-bg-raised')
    const colors = tailwindConfig.theme.extend.colors
    const [, name, shade] = bgClass.match(/^bg-([a-z]+)(?:-(\d+))?$/)
    const hex = shade ? colors[name][shade] : colors[name]

    expect(contrast('#FFFFFF', hex)).toBeGreaterThanOrEqual(4.5)
  })
})
