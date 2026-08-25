import { useMemo } from 'react'
import { generateQRMatrix } from '../../lib/qr'

/**
 * High-performance, crisp SVG QR Code Component.
 * Supports custom fg/bg colors, sizing, and center branding badge.
 */
export default function QRCode({
  value = '',
  size = 200,
  fgColor = '#000000',
  bgColor = '#FFFFFF',
  includeLogo = true,
  className = '',
}) {
  const matrix = useMemo(() => {
    if (!value) return []
    return generateQRMatrix(value)
  }, [value])

  const matrixSize = matrix.length || 21
  const cellSize = 10
  const viewBoxSize = matrixSize * cellSize

  // Build SVG rect elements for all active modules
  const cells = useMemo(() => {
    if (!matrix.length) return null
    const rects = []
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        if (matrix[r][c] === 1) {
          rects.push(
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.05}
              height={cellSize + 0.05}
              fill={fgColor}
            />
          )
        }
      }
    }
    return rects
  }, [matrix, matrixSize, cellSize, fgColor])

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        width={size}
        height={size}
        className="rounded-lg"
        style={{ backgroundColor: bgColor }}
        shapeRendering="crispEdges"
      >
        {cells}
      </svg>

      {/* Center gym logo watermark */}
      {includeLogo && (
        <div
          className="absolute rounded-md flex items-center justify-center shadow-md"
          style={{
            width: size * 0.22,
            height: size * 0.22,
            backgroundColor: bgColor,
            padding: 3,
          }}
        >
          <div className="w-full h-full rounded bg-primary flex items-center justify-center">
            {/* Dumbbell icon */}
            <svg width="65%" height="65%" viewBox="0 0 24 24" fill="white">
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43 1.43 1.43 2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43 1.43-1.43-1.43z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
