import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { ALL_RECORDS_PAGE_SIZE } from '../../services/constants'

// --- Access Logs ---
export function useAccessLogs(limit = 5) {
  return useQuery({
    queryKey: ['accessLogs', limit],
    queryFn: async () => {
      const res = await api.get('/access/logs/', { params: { limit } })
      return res.data.results || []
    },
  })
}

// --- Dashboard Memberships (Alertas de morosidad) ---
export function useDashboardAlerts() {
  return useQuery({
    queryKey: ['dashboardAlerts'],
    queryFn: async () => {
      // Listamos todas las membresías vencidas o pendiente_pago
      const res = await api.get('/memberships/membresias/', { params: { estado: 'vencida', limit: 5 } })
      return res.data.results || []
    },
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
  })
}

// --- Socio Upcoming Classes ---
export function useSocioUpcomingClasses() {
  return useQuery({
    queryKey: ['socioUpcomingClasses'],
    queryFn: async () => {
      const res = await api.get('/classes/clases/', { params: { page_size: ALL_RECORDS_PAGE_SIZE } })
      const booked = (res.data.results || []).filter(c => c.user_inscrito)
      return booked.slice(0, 3) 
    },
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
    refetchInterval: 30000 // refetch every 30s
  })
}
