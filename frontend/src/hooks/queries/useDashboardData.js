import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { ALL_RECORDS_PAGE_SIZE } from '../../constants/pagination'
import { ACCESS_DENIAL_REASONS } from '../../constants/accessDenialReasons'

export const mapAccessLog = (log) => {
  const d = new Date(log.timestamp)
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return {
    id: log.id,
    name: log.user_nombre ? `${log.user_nombre} ${log.user_apellido || ''}`.trim() : 'Desconocido',
    membership: log.user_plan_nombre || 'Sin plan',
    time: timeStr,
    // The API sends 'ENTRY' / 'EXIT'; the list compares against 'entry'.
    type: String(log.access_type ?? '').toLowerCase(),
    denied: log.status === 'DENIED',
    denialReason: log.denial_reason
      ? (ACCESS_DENIAL_REASONS[log.denial_reason] ?? log.denial_reason)
      : null,
  }
}

// --- Access Logs ---
export function useAccessLogs(limit = 5, page_size) {
  return useQuery({
    queryKey: ['accessLogs', limit, page_size],
    queryFn: async () => {
      const params = { limit }
      if (page_size !== undefined) params.page_size = page_size
      const res = await api.get('/access/logs/', { params })
      return res.data.results || []
    },
    retry: 1,
  })
}

// --- Aforo Snapshot (REST fallback for WS) ---
export function useAforoSnapshot(enabled = true) {
  return useQuery({
    queryKey: ['aforoSnapshot'],
    queryFn: async () => {
      const res = await api.get('/access/aforo/snapshot/')
      return res.data
    },
    enabled,
    refetchInterval: 30000,
    retry: 1,
  })
}

// --- Dashboard Memberships (Alertas de morosidad) ---
export function useDashboardAlerts() {
  return useQuery({
    queryKey: ['dashboardAlerts'],
    queryFn: async () => {
      // Listamos todas las membresías vencidas (TODO: unificar con pendientes de pago cuando backend soporte)
      const res = await api.get('/memberships/membresias/', { params: { estado: 'vencida', limit: 5 } })
      return res.data.results || []
    },
    retry: 1,
  })
}

// --- Dashboard Classes (Admin) ---
export function useDashboardClasses() {
  return useQuery({
    queryKey: ['dashboardClasses'],
    queryFn: async () => {
      const res = await api.get('/classes/clases/', { params: { limit: 5 } })
      return res.data.results || []
    },
    retry: 1,
  })
}

// --- Socio Data ---
export function useSocioMembership() {
  return useQuery({
    queryKey: ['socioMembership'],
    queryFn: async () => {
      const res = await api.get('/memberships/me/')
      return res.data
    },
    retry: 1,
  })
}

// --- Socio Upcoming Classes ---
export function useSocioUpcomingClasses() {
  return useQuery({
    queryKey: ['socioUpcomingClasses'],
    queryFn: async () => {
      // Workaround: Traemos un lote grande y filtramos en frontend.
      // TODO (TICKET-123): Migrar a un endpoint dedicado /classes/me/upcoming para evitar traer toda la grilla.
      const res = await api.get('/classes/clases/', { params: { page_size: ALL_RECORDS_PAGE_SIZE } })
      const booked = (res.data.results || []).filter(c => c.user_inscrito)
      return booked.slice(0, 3) 
    },
    retry: 1,
  })
}

// --- Aforo Stats ---
export function useAforoStats() {
  return useQuery({
    queryKey: ['aforoStats'],
    queryFn: async () => {
      const res = await api.get('/access/stats/')
      return res.data
    },
    refetchInterval: 30000, // refetch every 30s
    retry: 1,
  })
}
