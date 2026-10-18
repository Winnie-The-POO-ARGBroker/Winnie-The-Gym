/**
 * Result panel states for anti-passback (#149). Separate from AccesoTerminal.test.jsx,
 * which is excluded from CI; this file renders the page with heavy deps mocked.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AccesoTerminalPage from '../AccesoTerminalPage';
import { manualAccess } from '../../../services/accessService';

vi.mock('../../../services/accessService', () => ({
  manualAccess: vi.fn(),
  scanQR: vi.fn(),
  getPresentes: vi.fn(),
  salidaManual: vi.fn(),
  cerrarDia: vi.fn(),
}));

vi.mock('../../../hooks/useWebSocket', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    lastMessage: { aforo_actual: 42 },
    isConnected: true,
    isConnecting: false,
    isReconnecting: false,
    sendMessage: vi.fn(),
  })),
}));

const mockUseScreenWakeLock = vi.fn(() => ({
  isSupported: true,
  isActive: false,
  brightnessBoosted: false,
}));

vi.mock('../../../hooks/useScreenWakeLock', () => ({
  __esModule: true,
  default: (...args) => mockUseScreenWakeLock(...args),
}));

vi.mock('../../../hooks/queries/useGymConfig', () => ({
  useGymConfig: vi.fn(() => ({ data: { aforo_maximo: 200 } })),
}));

vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ rightContent }) => (
    <div data-testid="top-bar">
      <div data-testid="top-bar-right">{rightContent}</div>
    </div>
  ),
}));

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: ({ onScan }) => (
    <div data-testid="qr-scanner-mock">
      <button onClick={() => onScan([{ rawValue: 'mock-token' }])}>Scan</button>
    </div>
  ),
}));

const LOG = {
  access_type: 'ENTRY',
  user_nombre: 'Laura',
  user_apellido: 'Gomez',
  user_email: 'laura@test.com',
  timestamp: new Date().toISOString(),
};

async function submitDni() {
  fireEvent.click(screen.getByRole('button', { name: /DNI manual/i }));
  fireEvent.change(screen.getByPlaceholderText('Ej. 30111222'), { target: { value: '12345678' } });
  fireEvent.click(screen.getByRole('button', { name: /Validar DNI/i }));
}

describe('AccesoTerminalPage result states (anti-passback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows an amber "Ya figura adentro" panel with override for a repeated ENTRY', async () => {
    manualAccess.mockResolvedValueOnce({
      is_valid: false,
      scan_status: 'warning',
      status: 'DENIED',
      message: 'El socio ya figura dentro del gimnasio',
      denial_reason: 'YA_FIGURA_ADENTRO',
      access_type: 'ENTRY',
      allow_override: true,
      access_log: LOG,
    });
    render(<AccesoTerminalPage />);
    await submitDni();

    expect(await screen.findByRole('heading', { level: 2, name: 'Ya figura adentro' })).toBeInTheDocument();
    expect(screen.queryByText('Entrada registrada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar igual/i })).toBeInTheDocument();
  });

  it('still shows the green "Entrada registrada" for a normal granted ENTRY', async () => {
    manualAccess.mockResolvedValueOnce({
      is_valid: true,
      scan_status: 'granted',
      status: 'GRANTED',
      message: 'Entrada registrada',
      denial_reason: null,
      access_type: 'ENTRY',
      allow_override: false,
      access_log: LOG,
    });
    render(<AccesoTerminalPage />);
    await submitDni();

    expect(await screen.findByRole('heading', { level: 2, name: 'Entrada registrada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar igual/i })).not.toBeInTheDocument();
  });
});
