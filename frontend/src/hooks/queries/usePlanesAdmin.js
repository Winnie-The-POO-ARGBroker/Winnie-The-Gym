import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../../services/api'

export const PLANES_ADMIN_KEY = ['planes', 'admin']

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.detail ?? err?.response?.data?.message ?? fallback
}

/**
 * Fetch all membership plans (admin view — not filtered by active state).
 */
export function usePlanesQuery() {
  return useQuery({
    queryKey: PLANES_ADMIN_KEY,
    queryFn: async () => {
      const res = await api.get('/memberships/planes/')
      return res.data.results ?? res.data
    },
    staleTime: 60_000,
    retry: 1,
  })
}

/**
 * CRUD mutations for membership plans.
 */
export function usePlanesMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: PLANES_ADMIN_KEY })

  const savePlan = useMutation({
    mutationFn: (planData) => {
      if (planData.id) {
        return api.patch(`/memberships/planes/${planData.id}/`, planData).then((r) => r.data)
      }
      return api.post('/memberships/planes/', { ...planData, activo: true }).then((r) => r.data)
    },
    onSuccess: (_, planData) => {
      invalidate()
      if (planData.id) {
        toast.success(`Plan "${planData.nombre}" actualizado con éxito`)
      } else {
        toast.success(`Plan "${planData.nombre}" creado exitosamente`)
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al guardar el plan'))
    },
  })

  const deletePlan = useMutation({
    mutationFn: (plan) => api.delete(`/memberships/planes/${plan.id}/`),
    onSuccess: (_, plan) => {
      invalidate()
      toast.info(`Plan "${plan.nombre}" eliminado`)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al eliminar el plan'))
    },
  })

  const toggleActive = useMutation({
    mutationFn: (plan) =>
      api.patch(`/memberships/planes/${plan.id}/`, { activo: !plan.activo }).then((r) => r.data),
    onSuccess: (_, plan) => {
      invalidate()
      toast.success(`Plan "${plan.nombre}" ${plan.activo ? 'archivado' : 'activado'}`)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al archivar/activar el plan'))
    },
  })

  return { savePlan, deletePlan, toggleActive }
}
