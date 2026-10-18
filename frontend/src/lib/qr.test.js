import { describe, it, expect } from 'vitest'
import jsQR from 'jsqr'
import { generateQRMatrix } from './qr'

// Render the matrix as an RGBA image (with the 4-module quiet zone) and decode it
// with a real QR reader: a matrix that merely "looks like" a QR does not count.
function decode(matrix, scale = 4) {
  const quiet = 4
  const modules = matrix.length + quiet * 2
  const side = modules * scale
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255)

  matrix.forEach((row, r) => row.forEach((cell, c) => {
    if (cell !== 1) return
    for (let y = 0; y < scale; y += 1) {
      for (let x = 0; x < scale; x += 1) {
        const i = (((r + quiet) * scale + y) * side + (c + quiet) * scale + x) * 4
        pixels[i] = 0
        pixels[i + 1] = 0
        pixels[i + 2] = 0
      }
    }
  }))

  return jsQR(pixels, side, side)?.data ?? null
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
// Same shape as the access token: base64url payload "." base64url signature.
const token = (length) => {
  const body = Array.from({ length }, (_, i) => alphabet[(i * 7 + 3) % alphabet.length]).join('')
  return `${body.slice(0, length - 44)}.${body.slice(0, 43)}`
}

// QRCode.jsx draws the gym logo over the centre: 22% of the side, i.e. about 5% of the area.
function coverCentre(matrix, fraction = 0.22) {
  const size = matrix.length
  const half = Math.ceil((size * fraction) / 2)
  const mid = Math.floor(size / 2)
  return matrix.map((row, r) => row.map((cell, c) => (
    Math.abs(r - mid) <= half && Math.abs(c - mid) <= half ? 0 : cell
  )))
}

describe('generateQRMatrix', () => {
  it('genera un QR legible para un texto corto', () => {
    expect(decode(generateQRMatrix('https://winnie.test/a'))).toBe('https://winnie.test/a')
  })

  it('genera un QR legible para un token real de acceso (222 caracteres)', () => {
    const value = token(222)
    expect(value).toHaveLength(222)
    expect(decode(generateQRMatrix(value))).toBe(value)
  })

  it.each([60, 120, 300])('genera un QR legible para %i caracteres', (length) => {
    const value = token(length)
    expect(decode(generateQRMatrix(value))).toBe(value)
  })

  it('el token real ya no devuelve una matriz vacía de 21x21', () => {
    expect(generateQRMatrix(token(222)).length).toBeGreaterThan(21)
  })

  it('sigue siendo legible con el logo del gimnasio tapando el centro', () => {
    const value = token(222)
    expect(decode(coverCentre(generateQRMatrix(value)))).toBe(value)
  })
})

