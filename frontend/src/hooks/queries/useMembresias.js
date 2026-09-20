import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

// ─── Query keys ────────────────────────────────────────────────────────────────
export const MEMBRESIAS_QUERY_KEYS = {
  me: ['membresias', 'me'],
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
