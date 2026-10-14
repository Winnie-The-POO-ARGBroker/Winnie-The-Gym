import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../../services/api'

// ─── Query keys ────────────────────────────────────────────────────────────────
export const INSTRUCTORES_QUERY_KEY = ['instructores']

// ─── Queries ───────────────────────────────────────────────────────────────────

export function useInstructores(params = {}, options = {}) {
  return useQuery({
    queryKey: [...INSTRUCTORES_QUERY_KEY, params],
    queryFn: async () => {
      const res = await api.get('/classes/instructores/', { params })
      return res.data?.results ?? res.data ?? []
    },
    staleTime: 5 * 60_000,
    retry: 1,
    ...options,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.detail ?? err?.response?.data?.message ?? fallback
}

export function useCreateInstructor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/classes/instructores/', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INSTRUCTORES_QUERY_KEY })
      toast.success('Instructor creado.')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al crear el instructor'))
    },
  })
}

export function useUpdateInstructor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) =>
      api.patch(`/classes/instructores/${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INSTRUCTORES_QUERY_KEY })
      toast.success('Instructor actualizado.')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al actualizar el instructor'))
    },
  })
}

export function useDeleteInstructor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/classes/instructores/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INSTRUCTORES_QUERY_KEY })
      toast.success('Instructor eliminado.')
    },
    onError: (err) => {
      const status = err?.response?.status
      if (status === 409 || status === 400) {
        toast.error('El instructor tiene clases asignadas. Desactivalo en lugar de eliminarlo.', {
          duration: 8000,
        })
      } else {
        toast.error(extractErrorMessage(err, 'Error al eliminar el instructor'))
      }
    },
  })
}

export function useDesactivarInstructor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) =>
      api.patch(`/classes/instructores/${id}/`, { activo: false }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INSTRUCTORES_QUERY_KEY })
      toast.success('Instructor desactivado.')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al desactivar el instructor'))
    },
  })
}
