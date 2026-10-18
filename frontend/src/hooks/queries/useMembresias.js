import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../../services/api'
import { ALL_RECORDS_PAGE_SIZE } from '../../constants/pagination'

// ─── Query keys ────────────────────────────────────────────────────────────────
export const MEMBRESIAS_QUERY_KEYS = {
  me: ['membresias', 'me'],
  porSocio: (socioId) => ['membresias', 'porSocio', socioId],
  activaDeSocio: (socioId) => ['membresias', 'activa', socioId],
  admin: (params = {}) => ['membresias', 'admin', params],
}

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated socio's active membership and profile data.
 * Used by CredencialDigitalPage.
 */
export function useSocioMembresiaMe(options = {}) {
  return useQuery({
    queryKey: MEMBRESIAS_QUERY_KEYS.me,
    queryFn: async () => {
      const res = await api.get('/memberships/me/')
      return res.data
    },
    retry: 1,
    ...options,
  })
}

/**
 * Fetch all memberships for a specific socio by ID.
 * Used by SocioDetailModal (admin view).
 */
export function useMembresiasPorSocio(socioId, options = {}) {
  return useQuery({
    queryKey: MEMBRESIAS_QUERY_KEYS.porSocio(socioId),
    queryFn: async () => {
      const res = await api.get('/memberships/membresias/', {
        params: { socio: socioId, page_size: ALL_RECORDS_PAGE_SIZE },
      })
      return res.data?.results ?? res.data ?? []
    },
    enabled: !!socioId,
    retry: 1,
    ...options,
  })
}

/**
 * Fetch the active membership for a given socio (for CobroManualPage warning).
 * Returns null when the socio has no active membership.
 */
export function useMembresiaActivaDeSocio(socioId, options = {}) {
  return useQuery({
    queryKey: MEMBRESIAS_QUERY_KEYS.activaDeSocio(socioId),
    queryFn: async () => {
      const res = await api.get('/memberships/membresias/', {
        params: { socio: socioId, estado: 'activa' },
      })
      const results = res.data?.results ?? res.data ?? []
      return results.find((m) => m.estado === 'activa') ?? null
    },
    enabled: !!socioId,
    retry: 1,
    ...options,
  })
}

/**
 * Fetch all membresias for admin page with optional filters.
 */
export function useMembresiasAdmin(params = {}, options = {}) {
  return useQuery({
    queryKey: MEMBRESIAS_QUERY_KEYS.admin(params),
    queryFn: async () => {
      const res = await api.get('/memberships/membresias/', { params })
      return res.data
    },
    retry: 1,
    ...options,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

function extractErrorMsg(err, fallback) {
  const data = err?.response?.data
  if (data) {
    if (typeof data === 'string') return data
    return data.detail ?? data.message ?? data.error ?? fallback
  }
  return fallback
}

function invalidateMembresias(queryClient, socioId) {
  queryClient.invalidateQueries({ queryKey: ['membresias'] })
  if (socioId) {
    queryClient.invalidateQueries({ queryKey: MEMBRESIAS_QUERY_KEYS.porSocio(socioId) })
    queryClient.invalidateQueries({ queryKey: MEMBRESIAS_QUERY_KEYS.activaDeSocio(socioId) })
  }
}

/**
 * Mutation: suspender a membership by ID.
 */
export function useSuspenderMembresiaMutation(options = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }) =>
      api.post(`/memberships/membresias/${id}/suspender/`, { motivo }),
    onSuccess: (_, variables) => {
      toast.success('Membresía suspendida correctamente')
      invalidateMembresias(queryClient, variables.socioId)
    },
    onError: (err) => {
      toast.error(extractErrorMsg(err, 'Error al suspender la membresía'))
    },
    ...options,
  })
}

/**
 * Mutation: reactivar a suspended membership by ID.
 */
export function useReactivarMembresiaMutation(options = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }) =>
      api.post(`/memberships/membresias/${id}/reactivar/`, { motivo }),
    onSuccess: (_, variables) => {
      toast.success('Membresía reactivada correctamente')
      invalidateMembresias(queryClient, variables.socioId)
    },
    onError: (err) => {
      toast.error(extractErrorMsg(err, 'Error al reactivar la membresía'))
    },
    ...options,
  })
}

/**
 * Mutation: cancelar a membership by ID.
 */
export function useCancelarMembresiaMutation(options = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }) =>
      api.post(`/memberships/membresias/${id}/cancelar/`, { motivo }),
    onSuccess: (_, variables) => {
      toast.success('Membresía cancelada correctamente')
      invalidateMembresias(queryClient, variables.socioId)
    },
    onError: (err) => {
      toast.error(extractErrorMsg(err, 'Error al cancelar la membresía'))
    },
    ...options,
  })
}

/**
 * Mutation: renovar a membership by ID.
 */
export function useRenovarMembresiaMutation(options = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo, plan_id }) =>
      api.post(`/memberships/membresias/${id}/renovar/`, { motivo, plan_id }),
    onSuccess: (_, variables) => {
      toast.success('Membresía renovada correctamente')
      invalidateMembresias(queryClient, variables.socioId)
    },
    onError: (err) => {
      toast.error(extractErrorMsg(err, 'Error al renovar la membresía'))
    },
    ...options,
  })
}
