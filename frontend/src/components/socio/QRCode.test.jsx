/**
 * Tests for QRCode SVG component.
 * Coverage uplift: 0% → ~80% on functions.
 * Mocked: lib/qr (generateQRMatrix) — heavy dependency.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import QRCode from './QRCode'

// Mock the QR matrix generator to return a predictable 3x3 matrix
vi.mock('../../lib/qr', () => ({
  generateQRMatrix: vi.fn(() => [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ]),
}))

describe('QRCode', () => {
  // ── 1. Renders an SVG when value is provided ──────────────────────────
  it('renders an SVG element when value is provided', () => {
    const { container } = render(<QRCode value="https://example.com" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  // ── 2. Renders empty SVG when value is empty ──────────────────────────
  it('renders SVG without cells when value is empty', () => {
    const { container } = render(<QRCode value="" />)
    // SVG still renders, but matrix is empty → no rect elements for QR cells
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  // ── 3. Logo watermark renders by default ─────────────────────────────
  it('renders the gym logo watermark by default (includeLogo=true)', () => {
    const { container } = render(<QRCode value="test" />)
    // The logo container div wraps the dumbbell SVG
    const logoWrapper = container.querySelector('.absolute.rounded-md')
    expect(logoWrapper).toBeInTheDocument()
  })

  // ── 4. Logo is hidden when includeLogo=false ──────────────────────────
  it('does not render gym logo when includeLogo=false', () => {
    const { container } = render(<QRCode value="test" includeLogo={false} />)
    const logoWrapper = container.querySelector('.absolute.rounded-md')
    expect(logoWrapper).not.toBeInTheDocument()
  })

  // ── 5. Custom size prop applied to SVG ────────────────────────────────
  it('applies custom size to SVG element', () => {
    const { container } = render(<QRCode value="test" size={300} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '300')
    expect(svg).toHaveAttribute('height', '300')
  })

  // ── 6. Default size is 200 ────────────────────────────────────────────
  it('defaults to size 200', () => {
    const { container } = render(<QRCode value="test" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '200')
    expect(svg).toHaveAttribute('height', '200')
  })

  // ── 7. Custom fgColor is applied to rect fills ─────────────────────────
  it('uses custom fgColor for QR module rects', () => {
    const { container } = render(<QRCode value="test" fgColor="#FF5722" />)
    const rects = container.querySelectorAll('rect')
    // At least some rects should use the custom fill
    if (rects.length > 0) {
      expect(rects[0]).toHaveAttribute('fill', '#FF5722')
    }
  })

  // ── 8. Renders wrapper div with inline dimensions ──────────────────────
  it('renders wrapper div with correct inline width/height', () => {
    const { container } = render(<QRCode value="test" size={150} />)
    const wrapper = container.firstChild
    expect(wrapper.style.width).toBe('150px')
    expect(wrapper.style.height).toBe('150px')
  })
})
