import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

export const ACCESS_LOGS_KEY = (params = {}) => ['access', 'logs', params]
export const MI_ACTIVIDAD_KEY = ['access', 'me', 'actividad']

/**
 * Fetch paginated access logs with optional filters.
 * Used by admin/recepcion HistorialAccesosPage.
 */
export function useAccessLogs(params = {}, options = {}) {
  return useQuery({
    queryKey: ACCESS_LOGS_KEY(params),
    queryFn: async () => {
      const res = await api.get('/access/logs/', { params })
      return res.data
    },
    retry: 1,
    ...options,
  })
}

/**
 * Fetch the socio's own activity summary + paginated access log.
 * Used by MiActividadPage (socio role).
 */
export function useMiActividad(params = {}, options = {}) {
  return useQuery({
    queryKey: [...MI_ACTIVIDAD_KEY, params],
    queryFn: async () => {
      const res = await api.get('/access/me/actividad/', { params })
      return res.data
    },
    retry: 1,
    ...options,
  })
}

/**
 * Fetch socio activity on behalf of admin/recep (for SocioDetailModal).
 * Calls the general /access/logs/ endpoint filtered by socio id.
 */
export function useAccessLogsPorSocio(socioId, params = {}, options = {}) {
  return useQuery({
    queryKey: ACCESS_LOGS_KEY({ socio: socioId, ...params }),
    queryFn: async () => {
      const res = await api.get('/access/logs/', { params: { socio: socioId, ...params } })
      return res.data
    },
    enabled: !!socioId,
    retry: 1,
    ...options,
  })
}
