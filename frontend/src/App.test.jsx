/**
 * App routing tests — fix #163: legacy redirect preserves query params.
 * Tests the LegacyRedirect pattern in isolation (no need to render full App).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

/** Replicated from App.jsx — fix #163 */
function LegacyRedirect({ to }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}

function LocationDisplay() {
  const location = useLocation()
  return (
    <div>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="hash">{location.hash}</span>
    </div>
  )
}

describe('App > legacy redirect', () => {
  // fix #163: legacy redirect preserves ?id= query from /clases/asistencia
  it('preserves ?id= query from /clases/asistencia to /admin/clases/asistencia', () => {
    render(
      <MemoryRouter initialEntries={['/clases/asistencia?id=42']}>
        <Routes>
          <Route
            path="/clases/asistencia"
            element={<LegacyRedirect to="/admin/clases/asistencia" />}
          />
          <Route path="/admin/clases/asistencia" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('pathname').textContent).toBe('/admin/clases/asistencia')
    expect(screen.getByTestId('search').textContent).toBe('?id=42')
  })

  it('preserves hash from legacy route', () => {
    render(
      <MemoryRouter initialEntries={['/clases/asistencia?id=5#section']}>
        <Routes>
          <Route
            path="/clases/asistencia"
            element={<LegacyRedirect to="/admin/clases/asistencia" />}
          />
          <Route path="/admin/clases/asistencia" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('pathname').textContent).toBe('/admin/clases/asistencia')
    expect(screen.getByTestId('search').textContent).toBe('?id=5')
    expect(screen.getByTestId('hash').textContent).toBe('#section')
  })

  it('works when no query params are present', () => {
    render(
      <MemoryRouter initialEntries={['/membresias']}>
        <Routes>
          <Route
            path="/membresias"
            element={<LegacyRedirect to="/admin/planes" />}
          />
          <Route path="/admin/planes" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('pathname').textContent).toBe('/admin/planes')
    expect(screen.getByTestId('search').textContent).toBe('')
  })
})
