/**
 * Focused test for #203 — useScreenWakeLock integration in AccesoTerminalPage.
 * Kept in a separate file from AccesoTerminal.test.jsx which is excluded from CI due
 * to resource-leak issues in the QR scanner setup. This test only renders the page
 * with all heavy deps mocked.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AccesoTerminalPage from '../AccesoTerminalPage';

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

describe('AccesoTerminalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('uses useScreenWakeLock when scanner is active (camera mode = default)', () => {
    render(<AccesoTerminalPage />);

    // Camera mode is active by default (isManualMode = false → enabled: true)
    expect(mockUseScreenWakeLock).toHaveBeenCalledWith({ enabled: true });
  });

  it('disables useScreenWakeLock when manual DNI mode is active', () => {
    render(<AccesoTerminalPage />);

    fireEvent.click(screen.getByRole('button', { name: /DNI manual/i }));

    // After switching to manual mode, the last call should have enabled: false
    const calls = mockUseScreenWakeLock.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toEqual({ enabled: false });
  });
});
