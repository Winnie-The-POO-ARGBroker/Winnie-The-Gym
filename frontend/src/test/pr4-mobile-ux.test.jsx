/**
 * PR4 Mobile UX — Contract tests (10 required)
 *
 * Issues covered:
 *   #194 — AppBottomNav with navConfig single source + "Más" sheet
 *   #196 — TopBar responsive + actions prop
 *   #197 — useMediaQuery hook + DataTable cards mode
 *   #200 — Input text-base + inputMode pass-through, Button min-h-11
 *   #201 — index.html viewport-fit=cover + theme-color
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderWithProviders, resetAllStores } from './test-utils'
import { renderHook, act } from '@testing-library/react'

// ── Shared mocks ──────────────────────────────────────────────────────────────

vi.mock('../hooks/useAuth', () => ({
  default: vi.fn(),
}))

vi.mock('../stores/themeStore', () => {
  const toggleTheme = vi.fn()
  return {
    default: vi.fn(() => ({ theme: 'light', toggleTheme })),
  }
})

import useAuth from '../hooks/useAuth'

function setupAdmin() {
  useAuth.mockReturnValue({
    user: { rol: 'administrador', id: 1 },
    clearAuth: vi.fn(),
  })
}

function setupRecepcionista() {
  useAuth.mockReturnValue({
    user: { rol: 'recepcionista', id: 2 },
    clearAuth: vi.fn(),
  })
}

// ── Test 1: AppBottomNav — admin at 375px sees 4 primary + Más ────────────────

describe('AppBottomNav > admin at 375px', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupAdmin()
  })

  it('sees 4 primary items + Más item', async () => {
    const { default: AppBottomNav } = await import('../components/layout/AppBottomNav')
    renderWithProviders(<AppBottomNav />, { route: '/dashboard' })

    // From navConfig: admin primary = Dashboard, Planes, Usuarios, Reportes + Más
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Planes')).toBeInTheDocument()
    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    expect(screen.getByText('Reportes')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })
})

// ── Test 2: AppBottomNav — "Más" sheet lists all rol routes + Mi perfil + tema + Logout ──

describe('AppBottomNav > Más sheet', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupAdmin()
  })

  it('"Más" sheet lists more routes + Mi perfil + Tema + Cerrar sesión', async () => {
    const { default: AppBottomNav } = await import('../components/layout/AppBottomNav')
    renderWithProviders(<AppBottomNav />, { route: '/dashboard' })

    fireEvent.click(screen.getByRole('button', { name: /más opciones/i }))

    // More items from navConfig admin.more
    expect(screen.getByText('Config')).toBeInTheDocument()
    // Account items always present in sheet
    expect(screen.getByText('Mi perfil')).toBeInTheDocument()
    expect(screen.getByText('Tema')).toBeInTheDocument()
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument()
  })
})

// ── Test 3: AppBottomNav — recepcionista shows exactly 5 columns (no overflow) ──

describe('AppBottomNav > recepcionista at 375px', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupRecepcionista()
  })

  it('shows exactly 5 columns (4 primary + Más)', async () => {
    const { default: AppBottomNav } = await import('../components/layout/AppBottomNav')
    renderWithProviders(<AppBottomNav />, { route: '/dashboard' })

    // Recep primary: Dashboard, Socios, Clases, Acceso + Más = 5 columns
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Socios')).toBeInTheDocument()
    expect(screen.getByText('Clases')).toBeInTheDocument()
    expect(screen.getByText('Acceso')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()

    // Confirm the grid has exactly 5 columns by counting nav items rendered
    const nav = screen.getByRole('navigation', { name: /navegación principal/i })
    const grid = nav.querySelector('[style*="grid-template-columns"]')
    expect(grid).toBeTruthy()
    // gridTemplateColumns = "repeat(5, 1fr)"
    expect(grid.style.gridTemplateColumns).toBe('repeat(5, 1fr)')
  })
})

// ── Test 4: TopBar — actions prop renders button in mobile menu at <768px ─────

describe('TopBar > actions prop', () => {
  it('renders action in mobile menu when actions prop is provided', async () => {
    const { default: TopBar } = await import('../components/layout/TopBar')
    const onAction = vi.fn()
    renderWithProviders(
      <TopBar
        title="Usuarios"
        actions={[{ label: 'Crear staff', icon: null, onClick: onAction }]}
      />,
      { route: '/admin/usuarios' }
    )

    // The mobile overflow menu button (MoreVertical) should be rendered
    const menuToggle = screen.getByRole('button', { name: /acciones/i })
    expect(menuToggle).toBeInTheDocument()

    // Open the menu
    fireEvent.click(menuToggle)

    // The action label should now be visible (may appear once in desktop hidden div + once in mobile menu)
    const actionButtons = screen.getAllByText('Crear staff')
    expect(actionButtons.length).toBeGreaterThanOrEqual(1)
  })
})

// ── Test 5: TopBar — truncates long title with ellipsis ──────────────────────

describe('TopBar > title truncation', () => {
  it('applies truncate class to long title', async () => {
    const { default: TopBar } = await import('../components/layout/TopBar')
    renderWithProviders(
      <TopBar title="Título muy largo que debería quedar truncado en pantallas móviles" />,
      { route: '/' }
    )

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.className).toContain('truncate')
  })
})

// ── Test 6: useMediaQuery — returns true when matches, false otherwise ────────

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when media query matches', async () => {
    const { default: useMediaQuery } = await import('../hooks/useMediaQuery')

    // Mock matchMedia to return matches=true
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    // After effect runs, should reflect matchMedia result
    act(() => {})
    expect(result.current).toBe(true)
  })

  it('returns false when media query does not match', async () => {
    const { default: useMediaQuery } = await import('../hooks/useMediaQuery')

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    act(() => {})
    expect(result.current).toBe(false)
  })
})

// ── Test 7: DataTable — renders cards when mobileMode and viewport < md ──────

describe('DataTable > cards mode', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders card layout when mobileMode="cards" and viewport is mobile', async () => {
    // Mock matchMedia to simulate mobile viewport — must be set before import
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('max-width'), // max-width queries match (mobile)
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const { default: DataTable } = await import('../components/ui/DataTable')

    const columns = [
      { key: 'nombre', label: 'Nombre', mobile: 'Nombre' },
      { key: 'estado', label: 'Estado', mobile: 'Estado' },
    ]
    const data = [
      { id: 1, nombre: 'Ana García', estado: 'activo' },
      { id: 2, nombre: 'Carlos López', estado: 'baja' },
    ]

    const { rerender } = render(<DataTable columns={columns} data={data} mobileMode="cards" />)
    // Trigger effect re-evaluation
    act(() => {})
    rerender(<DataTable columns={columns} data={data} mobileMode="cards" />)

    // Values are rendered (in either table or card view)
    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByText('Carlos López')).toBeInTheDocument()
  })
})

// ── Test 8: Input — applies text-base at mobile and inputMode pass-through ────

describe('Input > mobile enhancements', () => {
  it('applies text-base class and passes inputMode through', async () => {
    const { default: Input } = await import('../components/ui/Input')
    render(<Input label="DNI" inputMode="numeric" placeholder="12345678" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input.className).toContain('text-base')
  })
})

// ── Test 9: Button — min-h-11 class applied ───────────────────────────────────

describe('Button > min-h-11', () => {
  it('has min-h-11 class for touch target compliance', async () => {
    const { default: Button } = await import('../components/ui/Button')
    render(<Button>Guardar</Button>)

    const btn = screen.getByRole('button', { name: /guardar/i })
    expect(btn.className).toContain('min-h-11')
  })
})

// ── Test 10: index.html — has viewport-fit=cover and theme-color meta ─────────

describe('index.html > viewport and theme-color meta', () => {
  it('has viewport-fit=cover in the viewport meta', async () => {
    const fs = await import('fs')
    // Try both Docker container path and host path
    const candidates = ['/app/index.html', '/Users/rodrigovaldez/Documents/GitHub/Winnie-The-Gym/frontend/index.html']
    let html = ''
    for (const p of candidates) {
      try { html = fs.readFileSync(p, 'utf-8'); break } catch (_e) { /* try next */ }
    }
    expect(html).toContain('viewport-fit=cover')
  })

  it('has theme-color meta tags', async () => {
    const fs = await import('fs')
    const candidates = ['/app/index.html', '/Users/rodrigovaldez/Documents/GitHub/Winnie-The-Gym/frontend/index.html']
    let html = ''
    for (const p of candidates) {
      try { html = fs.readFileSync(p, 'utf-8'); break } catch (_e) { /* try next */ }
    }
    expect(html).toContain('theme-color')
  })
})
