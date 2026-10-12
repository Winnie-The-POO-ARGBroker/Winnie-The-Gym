import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CredencialDigitalPage from '../CredencialDigitalPage'

vi.mock('../../../hooks/queries/useMembresias', () => ({
  useSocioMembresiaMe: vi.fn(),
}))

vi.mock('../../../hooks/useAuth', () => ({
  default: vi.fn(),
}))

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useSocioMembresiaMe } from '../../../hooks/queries/useMembresias'
import useAuth from '../../../hooks/useAuth'
import api from '../../../services/api'

const MOCK_PROFILE = {
  nombre: 'Martín',
  apellido: 'Gómez',
  dni: '38999888',
  numero_socio: 'S-1092',
  sedeHabitual: 'Sede Central',
  membresia_activa: {
    estado: 'activa',
    fecha_fin: '2026-12-31',
    plan: { nombre: 'Pase Libre' },
  },
}

describe('CredencialDigital - Validación multi-dispositivo y comportamiento móvil (Issue #110)', () => {
  let originalNavigator
  let originalScreen
  let mockWakeLockSentinel

  beforeEach(() => {
    vi.clearAllMocks()
    useSocioMembresiaMe.mockReturnValue({ data: MOCK_PROFILE, isLoading: false })
    useAuth.mockReturnValue({ user: { rol: 'socio' } })
    api.get.mockResolvedValue({ data: { qr_token: 'qr-token-test-dispositivos-110' } })

    originalNavigator = globalThis.navigator
    originalScreen = globalThis.screen

    mockWakeLockSentinel = {
      released: false,
      release: vi.fn().mockImplementation(() => {
        mockWakeLockSentinel.released = true
        return Promise.resolve()
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'screen', {
      value: originalScreen,
      writable: true,
      configurable: true,
    })
  })

  describe('Dispositivo 1: Android Chrome (Chromium mobile con Wake Lock API y Fullscreen)', () => {
    beforeEach(() => {
      // Simular User-Agent y APIs de Android Chrome
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
          wakeLock: {
            request: vi.fn().mockResolvedValue(mockWakeLockSentinel),
          },
        },
        writable: true,
        configurable: true,
      })

      // Simular soporte de brillo experimental en WebView Android tanto en window.screen como global.screen
      const mockScreenObj = { brightness: 0.6 }
      Object.defineProperty(globalThis, 'screen', {
        value: mockScreenObj,
        writable: true,
        configurable: true,
      })
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'screen', {
          value: mockScreenObj,
          writable: true,
          configurable: true,
        })
      }
    })

    it('adquiere wake lock y maximiza brillo en Android al montar la credencial', async () => {
      let unmountFn
      await act(async () => {
        const rendered = render(
          <MemoryRouter initialEntries={['/socio/credencial']}>
            <CredencialDigitalPage />
          </MemoryRouter>
        )
        unmountFn = rendered.unmount
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen')
      })

      // Verifica incremento automático de brillo si está soportado
      expect(window.screen.brightness).toBe(1.0)

      // Al desmontar la ruta, libera wake lock y restaura brillo
      act(() => {
        unmountFn()
      })
      expect(mockWakeLockSentinel.release).toHaveBeenCalled()
      expect(window.screen.brightness).toBe(0.6)
    })

    it('permite abrir pantalla completa como fallback óptico para auto-brightness en Android', async () => {
      const requestFullscreenMock = vi.fn().mockResolvedValue(undefined)
      Element.prototype.requestFullscreen = requestFullscreenMock

      render(
        <MemoryRouter initialEntries={['/socio/credencial']}>
          <CredencialDigitalPage />
        </MemoryRouter>
      )

      const fullscreenBtn = await screen.findByRole('button', { name: /pantalla completa/i })
      fireEvent.click(fullscreenBtn)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      expect(requestFullscreenMock).toHaveBeenCalled()
      delete Element.prototype.requestFullscreen
    })
  })

  describe('Dispositivo 2: iOS Safari (WebKit mobile sin screen.brightness, con Wake Lock y modal de alto contraste)', () => {
    beforeEach(() => {
      // Simular iOS Safari 16.4+ (soporta navigator.wakeLock pero no APIs propietarias de brillo directo)
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
          wakeLock: {
            request: vi.fn().mockResolvedValue(mockWakeLockSentinel),
          },
        },
        writable: true,
        configurable: true,
      })

      Object.defineProperty(globalThis, 'screen', {
        value: {},
        writable: true,
        configurable: true,
      })
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'screen', {
          value: {},
          writable: true,
          configurable: true,
        })
      }
    })

    it('mantiene la pantalla activa con Wake Lock API en iOS Safari y maneja gracefully la ausencia de screen.brightness', async () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/socio/credencial']}>
          <CredencialDigitalPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen')
      })

      // No lanza errores por no tener API directa de brillo
      unmount()
      expect(mockWakeLockSentinel.release).toHaveBeenCalled()
    })

    it('despliega el modal de alto contraste maximizado en iOS Safari para facilitar el escaneo', async () => {
      render(
        <MemoryRouter initialEntries={['/socio/credencial']}>
          <CredencialDigitalPage />
        </MemoryRouter>
      )

      const fullscreenBtn = await screen.findByRole('button', { name: /pantalla completa/i })
      fireEvent.click(fullscreenBtn)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/Fondo optimizado al máximo contraste visual/i)).toBeInTheDocument()
      })
    })
  })
})
