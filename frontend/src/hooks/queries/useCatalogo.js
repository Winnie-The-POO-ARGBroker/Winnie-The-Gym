import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { ALL_RECORDS_PAGE_SIZE } from '../../constants/pagination'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const DISCIPLINAS_QUERY_KEY = ['catalogos', 'disciplinas']
export const SALAS_QUERY_KEY = ['catalogos', 'salas']

// ─── Disciplinas ──────────────────────────────────────────────────────────────

export function useDisciplinas(params = {}) {
  return useQuery({
    queryKey: [...DISCIPLINAS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await api.get('/classes/disciplinas/', {
        params: { page_size: ALL_RECORDS_PAGE_SIZE, ...params },
      })
      return res.data?.results ?? res.data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

export function useCreateDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/classes/disciplinas/', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISCIPLINAS_QUERY_KEY }),
  })
}

export function useUpdateDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.patch(`/classes/disciplinas/${id}/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISCIPLINAS_QUERY_KEY }),
  })
}

export function useDeleteDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/classes/disciplinas/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISCIPLINAS_QUERY_KEY }),
  })
}

export function useDesactivarDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.patch(`/classes/disciplinas/${id}/`, { activa: false }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISCIPLINAS_QUERY_KEY }),
  })
}

// ─── Salas ────────────────────────────────────────────────────────────────────

export function useSalas(params = {}) {
  return useQuery({
    queryKey: [...SALAS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await api.get('/classes/salas/', {
        params: { page_size: ALL_RECORDS_PAGE_SIZE, ...params },
      })
      return res.data?.results ?? res.data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

export function useCreateSala() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/classes/salas/', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SALAS_QUERY_KEY }),
  })
}

export function useUpdateSala() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.patch(`/classes/salas/${id}/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SALAS_QUERY_KEY }),
  })
}

export function useDeleteSala() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/classes/salas/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: SALAS_QUERY_KEY }),
  })
}

export function useDesactivarSala() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.patch(`/classes/salas/${id}/`, { activa: false }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SALAS_QUERY_KEY }),
  })
}
