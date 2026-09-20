import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AccesoTerminalPage from '../AccesoTerminalPage';
import { manualAccess } from '../../../services/accessService';

// Mocks
vi.mock('../../../services/accessService', () => ({
  manualAccess: vi.fn(),
  scanQR: vi.fn(),
}));

vi.mock('../../../hooks/useWebSocket', () => ({
  __esModule: true,
  default: vi.fn(() => ({ lastMessage: { aforo_actual: 150 } })),
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
  Scanner: () => <div data-testid="qr-scanner-mock">Scanner</div>,
}));

describe('AccesoTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders aforo from websocket', () => {
    render(<AccesoTerminalPage />);
    expect(screen.getByText(/Aforo 150\/200/)).toBeInTheDocument();
  });

  it('handles successful manual access', async () => {
    manualAccess.mockResolvedValueOnce({
      status: 'GRANTED',
      message: 'Acceso permitido',
      denial_reason: null,
      access_log: {
        access_type: 'ENTRY',
        user_name: 'Juan Perez',
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
          access_log: {
            access_type: 'ENTRY',
            user_name: 'Ana Lopez',
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
});
