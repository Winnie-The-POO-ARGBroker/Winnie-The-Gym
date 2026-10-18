import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStaffList, useStaffCreate, useResendActivation } from '../useStaff'

vi.mock('../../../services/staffService', () => ({
  getStaffList: vi.fn(),
  createStaff: vi.fn(),
  resendActivation: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

import { getStaffList, createStaff, resendActivation } from '../../../services/staffService'
import { toast } from 'sonner'

const mockStaff = [
  { id: 1, email: 'admin@winnie.local', rol: 'administrador' },
  { id: 2, email: 'recep@winnie.local', rol: 'recepcionista' },
]

function wrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useStaffList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches staff list successfully', async () => {
    getStaffList.mockResolvedValueOnce(mockStaff)

    const { result } = renderHook(() => useStaffList(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data[0].rol).toBe('administrador')
    expect(getStaffList).toHaveBeenCalledTimes(1)
  })

  it('starts in pending state', () => {
    getStaffList.mockResolvedValueOnce(mockStaff)
    const { result } = renderHook(() => useStaffList(), { wrapper })
    expect(result.current.isPending).toBe(true)
  })

  it('handles fetch error', async () => {
    getStaffList.mockRejectedValueOnce(new Error('Server error'))
    const { result } = renderHook(() => useStaffList(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useStaffCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls createStaff and shows success toast on success', async () => {
    const newStaff = { email: 'new@winnie.local', rol: 'recepcionista' }
    createStaff.mockResolvedValueOnce({ id: 3, ...newStaff, email_enviado: true })
    getStaffList.mockResolvedValue([])

    const { result } = renderHook(() => useStaffCreate(), { wrapper })

    await act(async () => {
      result.current.mutate(newStaff)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith(
      'Staff creado correctamente. Se envió un email de activación.'
    )
  })

  it('shows a warning (not the success text) when the activation email was not sent', async () => {
    const newStaff = { email: 'new@winnie.local', rol: 'recepcionista' }
    createStaff.mockResolvedValueOnce({ id: 3, ...newStaff, email_enviado: false })
    getStaffList.mockResolvedValue([])

    const { result } = renderHook(() => useStaffCreate(), { wrapper })

    await act(async () => {
      result.current.mutate(newStaff)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.warning).toHaveBeenCalledWith(
      'Staff creado, pero no se pudo enviar el email de activación. Usá «Reenviar activación» cuando el correo esté configurado.'
    )
  })

  it('shows error toast with detail message on failure', async () => {
    createStaff.mockRejectedValueOnce({
      response: { data: { detail: 'Email already in use' } },
    })

    const { result } = renderHook(() => useStaffCreate(), { wrapper })

    await act(async () => {
      result.current.mutate({ email: 'dup@winnie.local' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Email already in use')
  })

  it('shows error toast with email field errors on 400', async () => {
    createStaff.mockRejectedValueOnce({
      response: { data: { email: ['This email is already registered.'] } },
    })

    const { result } = renderHook(() => useStaffCreate(), { wrapper })

    await act(async () => {
      result.current.mutate({ email: 'dup@winnie.local' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('This email is already registered.')
  })

  it('shows generic fallback error when no message available', async () => {
    createStaff.mockRejectedValueOnce(new Error('Network'))

    const { result } = renderHook(() => useStaffCreate(), { wrapper })

    await act(async () => {
      result.current.mutate({ email: 'x@x.com' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error al crear staff')
  })
})

describe('useResendActivation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls resendActivation and shows success toast', async () => {
    resendActivation.mockResolvedValueOnce({ detail: 'Email sent.', email_enviado: true })

    const { result } = renderHook(() => useResendActivation(), { wrapper })

    await act(async () => {
      result.current.mutate(1)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Email de activación reenviado.')
    expect(resendActivation).toHaveBeenCalledWith(1)
  })

  it('shows a warning instead of success when the resend did not go out', async () => {
    resendActivation.mockResolvedValueOnce({ detail: 'Email sent.', email_enviado: false })

    const { result } = renderHook(() => useResendActivation(), { wrapper })

    await act(async () => {
      result.current.mutate(1)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.warning).toHaveBeenCalledWith(
      'No se pudo reenviar el email de activación. Revisá la configuración del correo e intentá de nuevo.'
    )
  })

  it('shows error toast on failure', async () => {
    resendActivation.mockRejectedValueOnce({ response: { data: { detail: 'User not found' } } })

    const { result } = renderHook(() => useResendActivation(), { wrapper })

    await act(async () => {
      result.current.mutate(99)
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('User not found')
  })
})
