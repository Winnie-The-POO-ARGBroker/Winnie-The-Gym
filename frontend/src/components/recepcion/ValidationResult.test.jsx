/**
 * ValidationResult tests — fix #148: dynamic ENTRY/EXIT labels.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ValidationResult from './ValidationResult';

vi.mock('../../utils/formatDate', () => ({
  getTimeAgo: vi.fn(() => 'hace 2 min'),
}));

const EXIT_RESULT = {
  status: 'success',
  message: 'Salida registrada',
  denialReason: null,
  accessType: 'EXIT',
  log: {
    access_type: 'EXIT',
    user_nombre: 'Carlos',
    user_apellido: 'Activo',
    timestamp: new Date().toISOString(),
  },
};

const ENTRY_RESULT = {
  status: 'success',
  message: 'Entrada registrada',
  denialReason: null,
  accessType: 'ENTRY',
  log: {
    access_type: 'ENTRY',
    user_nombre: 'Maria',
    user_apellido: 'Socia',
    timestamp: new Date().toISOString(),
  },
};

describe('ValidationResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // fix #148: renders "Salida registrada" heading when access_type is EXIT
  it('renders "Salida registrada" when access_type is EXIT', () => {
    render(<ValidationResult result={EXIT_RESULT} onConfirmEntry={vi.fn()} />);
    // Heading h2 shows "Salida registrada"
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Salida registrada');
    // Badge label shows "Salida"
    expect(screen.getAllByText('Salida').length).toBeGreaterThan(0);
  });

  // fix #148: renders "Entrada registrada" heading when access_type is ENTRY
  it('renders "Entrada registrada" when access_type is ENTRY', () => {
    render(<ValidationResult result={ENTRY_RESULT} onConfirmEntry={vi.fn()} />);
    // Heading h2 shows "Entrada registrada"
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Entrada registrada');
    // Badge label shows "Entrada"
    expect(screen.getAllByText('Entrada').length).toBeGreaterThan(0);
  });

  // idle state renders scanner prompt
  it('renders idle state when no result', () => {
    render(<ValidationResult result={null} onConfirmEntry={vi.fn()} />);
    expect(screen.getByText('Esperando escaneo...')).toBeInTheDocument();
  });

  // denied state still shows "Acceso denegado" heading
  it('renders "Acceso denegado" on denied result', () => {
    render(
      <ValidationResult
        result={{ status: 'error', message: 'Membresía vencida', denialReason: 'MEMBERSHIP_INACTIVE', log: {} }}
        onConfirmEntry={vi.fn()}
      />
    );
    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.getByText('Membresía inactiva o vencida')).toBeInTheDocument();
  });
});
