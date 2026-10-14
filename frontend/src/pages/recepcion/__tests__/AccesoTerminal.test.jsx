import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AccesoTerminalPage from '../AccesoTerminalPage';
import { manualAccess } from '../../../services/accessService';

// Mocks
vi.mock('../../../services/accessService', () => ({
  manualAccess: vi.fn(),
  scanQR: vi.fn(),
  getPresentes: vi.fn(),
  salidaManual: vi.fn(),
  cerrarDia: vi.fn(),
}));

vi.mock('../../../hooks/useWebSocket', () => ({
  __esModule: true,
  default: vi.fn(() => ({ lastMessage: { aforo_actual: 150 }, isConnected: true, isConnecting: false, isReconnecting: false, sendMessage: vi.fn() })),
}));

vi.mock('../../../hooks/queries/useGymConfig', () => ({
  useGymConfig: vi.fn(() => ({ data: { aforo_maximo: 250 } })),
}));

const mockUseScreenWakeLock = vi.fn(() => ({ isSupported: true, isActive: false, brightnessBoosted: false }));
vi.mock('../../../hooks/useScreenWakeLock', () => ({
  __esModule: true,
  default: (...args) => mockUseScreenWakeLock(...args),
}));

// Mock layout components so we don't need router context
vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ rightContent }) => (
    <div data-testid="top-bar">
      TopBar
      <div data-testid="top-bar-right">{rightContent}</div>
    </div>
  ),
}));

// Mock scanner since it uses browser APIs not available in jsdom
vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: ({ onScan }) => (
    <div data-testid="qr-scanner-mock">
      <button onClick={() => onScan([{ rawValue: 'mock-qr-token' }])}>
        Simulate Scan
      </button>
    </div>
  ),
}));

describe('AccesoTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    localStorage.clear();
  });

  it('renders aforo from websocket', () => {
    render(<AccesoTerminalPage />);
    // aforo_actual from WS (150) / aforo_maximo from backend gymConfig (250) — not hardcoded
    expect(screen.getByText(/Aforo 150\/250/)).toBeInTheDocument();
  });

  // fix #152: aforo_maximo reads from backend, not hardcoded 200
  it('reads aforo_maximo from backend gymConfig, not hardcoded 200', () => {
    render(<AccesoTerminalPage />);
    // Should show 250 (from mock gymConfig), NOT 200 (hardcoded)
    expect(screen.queryByText(/\/200/)).not.toBeInTheDocument();
    expect(screen.getByText(/\/250/)).toBeInTheDocument();
  });

  // fix #148: terminal mode selector — ENTRY by default
  it('terminal mode selector sends access_type ENTRY by default', async () => {
    manualAccess.mockResolvedValueOnce({
      status: 'GRANTED',
      message: 'Entrada registrada',
      denial_reason: null,
      access_type: 'ENTRY',
      access_log: { access_type: 'ENTRY', user_nombre: 'Juan', user_apellido: 'Perez', timestamp: new Date().toISOString() }
    });

    render(<AccesoTerminalPage />);

    // Verify "Entrada" button is pressed by default
    const entradaBtn = screen.getByRole('button', { name: /^Entrada$/ });
    expect(entradaBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch to manual and submit
    fireEvent.click(screen.getByRole('button', { name: /DNI manual/i }));
    const input = screen.getByPlaceholderText('Ej. 30111222');
    fireEvent.change(input, { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Validar DNI/i }));

    expect(manualAccess).toHaveBeenCalledWith('12345678', 'ENTRY');
  });

  // fix #148: terminal mode selector — EXIT sends access_type EXIT
  it('terminal mode EXIT sends access_type EXIT in request', async () => {
    manualAccess.mockResolvedValueOnce({
      status: 'GRANTED',
      message: 'Salida registrada',
      denial_reason: null,
      access_type: 'EXIT',
      access_log: { access_type: 'EXIT', user_nombre: 'Ana', user_apellido: 'Lopez', timestamp: new Date().toISOString() }
    });

    render(<AccesoTerminalPage />);

    // Switch to EXIT mode
    const salidaBtn = screen.getByRole('button', { name: /^Salida$/ });
    fireEvent.click(salidaBtn);
    expect(salidaBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch to manual and submit
    fireEvent.click(screen.getByRole('button', { name: /DNI manual/i }));
    const input = screen.getByPlaceholderText('Ej. 30111222');
    fireEvent.change(input, { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Validar DNI/i }));

    expect(manualAccess).toHaveBeenCalledWith('12345678', 'EXIT');
  });

  it('handles successful manual access', async () => {
    manualAccess.mockResolvedValueOnce({
      status: 'GRANTED',
      message: 'Acceso permitido',
      denial_reason: null,
      access_type: 'ENTRY',
      access_log: {
        access_type: 'ENTRY',
        user_nombre: 'Juan',
        user_apellido: 'Perez',
        timestamp: new Date().toISOString()
      }
    });

    render(<AccesoTerminalPage />);

    // Switch to manual mode
    fireEvent.click(screen.getByRole('button', { name: /DNI manual/i }));

    // Enter DNI
    const input = screen.getByPlaceholderText('Ej. 30111222');
    fireEvent.change(input, { target: { value: '12345678' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Validar DNI/i }));

    expect(manualAccess).toHaveBeenCalledWith('12345678', 'ENTRY');

    // Wait for success message
    const elements = await screen.findAllByText('Acceso permitido');
    expect(elements.length).toBeGreaterThan(0);
    expect(await screen.findByText('Juan Perez')).toBeInTheDocument();
  });

  it('handles access denied (403)', async () => {
    manualAccess.mockRejectedValueOnce({
      response: {
        data: {
          status: 'DENIED',
          message: 'Acceso denegado: MEMBERSHIP_INACTIVE',
          denial_reason: 'MEMBERSHIP_INACTIVE',
          access_type: 'ENTRY',
          access_log: {
            access_type: 'ENTRY',
            user_nombre: 'Ana',
            user_apellido: 'Lopez',
            timestamp: new Date().toISOString()
          }
        }
      }
    });

    render(<AccesoTerminalPage />);

    // Switch to manual mode
    fireEvent.click(screen.getByRole('button', { name: /DNI manual/i }));

    // Enter DNI
    const input = screen.getByPlaceholderText('Ej. 30111222');
    fireEvent.change(input, { target: { value: '11223344' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Validar DNI/i }));

    // Wait for error message (uses the DENIAL_REASONS dictionary)
    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument();
    expect(await screen.findByText('Membresía inactiva o vencida')).toBeInTheDocument();
  });

  it('handles network error fallback', async () => {
    manualAccess.mockRejectedValueOnce(new Error('Network Error'));

    render(<AccesoTerminalPage />);

    // Switch to manual mode
    fireEvent.click(screen.getByRole('button', { name: /DNI manual/i }));

    const input = screen.getByPlaceholderText('Ej. 30111222');
    fireEvent.change(input, { target: { value: '11223344' } });

    fireEvent.click(screen.getByRole('button', { name: /Validar DNI/i }));

    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument();
    expect(await screen.findByText('Error al validar acceso')).toBeInTheDocument();
  });

  // #149 — warning status shows "Registrar igual" override button for staff
  it('warning status shows "Registrar igual" override button', async () => {
    manualAccess.mockResolvedValueOnce({
      status: 'WARNING',
      message: 'El socio ya figura como adentro',
      denial_reason: 'YA_FIGURA_ADENTRO',
      access_type: 'ENTRY',
      allow_override: true,
      access_log: {
        access_type: 'ENTRY',
        user_nombre: 'Laura',
        user_apellido: 'Gomez',
        user_email: 'laura@test.com',
        timestamp: new Date().toISOString(),
      },
    });

    render(<AccesoTerminalPage />);

    // Switch to manual mode and submit
    fireEvent.click(screen.getByRole('button', { name: /DNI manual/i }));
    const input = screen.getByPlaceholderText('Ej. 30111222');
    fireEvent.change(input, { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Validar DNI/i }));

    // Warning card should appear with heading "Atención"
    expect(await screen.findByText('Atención')).toBeInTheDocument();
    // Override button must be visible for staff
    expect(await screen.findByRole('button', { name: /Registrar igual/i })).toBeInTheDocument();
    // Cancel button also present
    expect(await screen.findByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  // #203 — Wake Lock active when scanner is running
  it('uses useScreenWakeLock when scanner is active (camera mode)', () => {
    render(<AccesoTerminalPage />);

    // By default camera mode is active (isManualMode = false)
    // useScreenWakeLock should be called with enabled: true
    expect(mockUseScreenWakeLock).toHaveBeenCalledWith({ enabled: true });
  });

  // #203 — Wake Lock disabled in manual (DNI) mode
  it('disables useScreenWakeLock when manual mode is active', () => {
    render(<AccesoTerminalPage />);

    fireEvent.click(screen.getByRole('button', { name: /DNI manual/i }));

    // After switching to manual mode, enabled should be false
    const calls = mockUseScreenWakeLock.mock.calls;
    // The last call should have enabled: false
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0]).toEqual({ enabled: false });
  });
});
