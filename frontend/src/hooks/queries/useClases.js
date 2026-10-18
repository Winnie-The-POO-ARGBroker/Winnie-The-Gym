import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../../services/api'
import { ALL_RECORDS_PAGE_SIZE } from '../../constants/pagination'
import { extractErrorMessage } from '../../utils/extractErrorMessage'

// ─── Query keys ────────────────────────────────────────────────────────────────
export const CLASES_QUERY_KEYS = {
  all: ['clases'],
  lists: () => ['clases', 'list'],
  list: (params) => ['clases', 'list', params],
  detail: (id) => ['clases', 'detail', id],
}

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch all classes with optional filters.
 * Uses a large page_size to retrieve the full schedule in one request.
 */
export function useClasesList(params = {}, options = {}) {
  return useQuery({
    queryKey: CLASES_QUERY_KEYS.list(params),
    queryFn: async () => {
      const res = await api.get('/classes/clases/', {
        params: { page_size: ALL_RECORDS_PAGE_SIZE, ...params },
      })
      return res.data.results ?? res.data
    },
    staleTime: 30_000,
    retry: 1,
    ...options,
  })
}

/**
 * Fetch a single class by ID.
 */
export function useClaseDetail(id, options = {}) {
  return useQuery({
    queryKey: CLASES_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get(`/classes/clases/${id}/`)
      return res.data
    },
    enabled: !!id,
    retry: 1,
    ...options,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

/**
 * All class mutations in one hook (create, update, delete).
 */
export function useClasesMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: CLASES_QUERY_KEYS.all })

  const create = useMutation({
    mutationFn: (data) => api.post('/classes/clases/', data).then((r) => r.data),
    onSuccess: (_, variables) => {
      invalidate()
      toast.success(`Clase "${variables.nombre}" publicada correctamente`)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al crear la clase'))
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data, partial = false }) =>
      (partial
        ? api.patch(`/classes/clases/${id}/`, data)
        : api.put(`/classes/clases/${id}/`, data)
      ).then((r) => r.data),
    onSuccess: (data) => {
      invalidate()
      toast.success(`Clase "${data.nombre}" actualizada con éxito`)
    },
    onError: (err) => {
      // Return raw error so callers can handle per-field DRF errors
      toast.error(extractErrorMessage(err, 'Error al actualizar la clase'))
    },
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/classes/clases/${id}/`),
    onSuccess: () => {
      invalidate()
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al eliminar la clase'))
    },
  })

  const cancelar = useMutation({
    mutationFn: ({ id, motivo }) =>
      api.post(`/classes/clases/${id}/cancelar-clase/`, { motivo }).then((r) => r.data),
    onSuccess: (data) => {
      invalidate()
      const confirmados = data?.confirmados_notificados ?? 0
      const espera = data?.espera_notificados ?? 0
      if (confirmados > 0 || espera > 0) {
        toast.success(
          `Clase cancelada. Se notificaron ${confirmados} confirmados + ${espera} en espera.`
        )
      } else {
        toast.success('Clase cancelada correctamente.')
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al cancelar la clase'))
    },
  })

  const promoverEspera = useMutation({
    mutationFn: (id) =>
      api.post(`/classes/clases/${id}/promover-espera/`).then((r) => r.data),
    onSuccess: () => {
      invalidate()
      toast.success('Socio promovido de la lista de espera.')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al promover de la lista de espera'))
    },
  })

  return { create, update, remove, cancelar, promoverEspera }
}
