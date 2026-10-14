import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const CIERRES_QUERY_KEY = ['cierres']

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCierres(params = {}) {
  return useQuery({
    queryKey: [...CIERRES_QUERY_KEY, params],
    queryFn: async () => {
      const res = await api.get('/common/cierres/', { params })
      return res.data?.results ?? res.data ?? []
    },
    staleTime: 2 * 60_000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCierre() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/common/cierres/', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CIERRES_QUERY_KEY }),
  })
}

export function useUpdateCierre() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.patch(`/common/cierres/${id}/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CIERRES_QUERY_KEY }),
  })
}

export function useDeleteCierre() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/common/cierres/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CIERRES_QUERY_KEY }),
  })
}
