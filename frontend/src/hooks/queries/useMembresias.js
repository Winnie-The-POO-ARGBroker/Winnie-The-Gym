import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

// ─── Query keys ────────────────────────────────────────────────────────────────
export const MEMBRESIAS_QUERY_KEYS = {
  me: ['membresias', 'me'],
  porSocio: (socioId) => ['membresias', 'porSocio', socioId],
  activaDeSocio: (socioId) => ['membresias', 'activa', socioId],
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
      const res = await api.get('/memberships/membresias/', { params: { socio: socioId } })
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
