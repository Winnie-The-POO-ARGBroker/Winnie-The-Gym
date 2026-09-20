import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Avatar from '../Avatar'

describe('Avatar component', () => {
  it('renders initials when no src is provided', () => {
    const { getByText } = render(<Avatar name="Juan Perez" />)
    expect(getByText('JP')).toBeInTheDocument()
  })

  it('uses numeric size correctly — fontSize is a valid number', () => {
    const { container } = render(<Avatar name="Test User" size={40} />)
    const div = container.querySelector('div')
    // fontSize should be 40 * 0.35 = 14
    expect(div.style.fontSize).toBe('14px')
    expect(div.style.width).toBe('40px')
    expect(div.style.height).toBe('40px')
  })

  it('resolves string size "sm" to 28px — fontSize must not be NaN', () => {
    const { container } = render(<Avatar name="Test User" size="sm" />)
    const div = container.querySelector('div')
    // sm maps to 28 → fontSize = 28 * 0.35 = 9.8px
    const fontSizeValue = parseFloat(div.style.fontSize)
    expect(Number.isNaN(fontSizeValue)).toBe(false)
    expect(fontSizeValue).toBeGreaterThan(0)
    expect(div.style.width).toBe('28px')
  })

  it('resolves unknown string size to 36px fallback', () => {
    const { container } = render(<Avatar name="Test User" size="unknown" />)
    const div = container.querySelector('div')
    expect(div.style.width).toBe('36px')
  })

  it('resolves all named aliases to valid pixel dimensions', () => {
    const aliases = { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 }
    for (const [alias, expected] of Object.entries(aliases)) {
      const { container } = render(<Avatar name="A" size={alias} />)
      const div = container.querySelector('div')
      expect(div.style.width).toBe(`${expected}px`)
    }
  })

  it('renders an img when src is provided', () => {
    const { getByAltText } = render(<Avatar name="Juan" src="https://example.com/avatar.jpg" size="md" />)
    const img = getByAltText('Juan')
    expect(img.tagName).toBe('IMG')
    expect(img.style.width).toBe('36px')
  })
})
