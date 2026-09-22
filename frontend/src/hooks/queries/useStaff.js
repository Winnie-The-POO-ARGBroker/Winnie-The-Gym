import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStaffList, createStaff, resendActivation } from '../../services/staffService'

// ─── Query keys ──────────────────────────────────────────────
export const STAFF_QUERY_KEYS = {
  all: ['staff'],
  list: () => ['staff', 'list'],
}

/**
 * Helper to extract a readable error message from a DRF error response.
 */
function extractErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (data.email) return Array.isArray(data.email) ? data.email.join(', ') : data.email
  const values = Object.values(data).flat().filter(Boolean)
  return values.length > 0 ? values.join(', ') : fallback
}

/**
 * Query hook: list of all staff users (administrador + recepcionista).
 *
 * @param {Object} [options] - Extra useQuery options
 */
export function useStaffList(options = {}) {
  return useQuery({
    queryKey: STAFF_QUERY_KEYS.list(),
    queryFn: getStaffList,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Mutation hook: create a new staff user.
 * On success → invalidates list cache + shows success toast.
 */
export function useStaffCreate() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data) => createStaff(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STAFF_QUERY_KEYS.all })
      toast.success('Staff creado correctamente. Se envió un email de activación.')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al crear staff'))
    },
  })
}

/**
 * Mutation hook: resend activation email.
 * On success → shows success toast.
 */
export function useResendActivation() {
  return useMutation({
    mutationFn: (id) => resendActivation(id),
    onSuccess: () => {
      toast.success('Email de activación reenviado.')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al reenviar activación'))
    },
  })
}
