import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getSocios,
  getSocio,
  createSocio,
  updateSocio,
  patchSocio,
  deleteSocio,
  darBajaSocio,
  uploadCertificado,
} from '../../services/sociosService'

// ─── Query keys ──────────────────────────────────────────────
const SOCIOS_KEY = 'socios'

/**
 * Lista paginada de socios con filtros, búsqueda y ordenación.
 *
 * @param {Object} params — { page, search, estado, con_certificado, ordering }
 * @param {Object} [options] — opciones extra de useQuery
 */
export function useSociosList(params = {}, options = {}) {
  return useQuery({
    queryKey: [SOCIOS_KEY, params],
    queryFn: () => getSocios(params),
    keepPreviousData: true, // evita parpadeo al cambiar de página
    staleTime: 30_000, // 30 s de cache
    ...options,
  })
}

/**
 * Detalle de un socio por ID.
 *
 * @param {number|string|null} id — si es null/undefined, la query no se ejecuta
 */
export function useSocioDetail(id) {
  return useQuery({
    queryKey: [SOCIOS_KEY, id],
    queryFn: () => getSocio(id),
    enabled: !!id,
  })
}

/**
 * Todas las mutaciones de socios en un solo hook.
 * Invalidan automáticamente la cache del listado al tener éxito.
 */
export function useSocioMutations() {
  const qc = useQueryClient()

  const invalidate = () => qc.invalidateQueries({ queryKey: [SOCIOS_KEY] })

  const create = useMutation({
    mutationFn: (data) => createSocio(data),
    onSuccess: () => {
      invalidate()
      toast.success('Socio creado correctamente')
    },
    onError: (err) => {
      const msg =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {}).flat().join(', ') ||
        'Error al crear socio'
      toast.error(msg)
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }) => updateSocio(id, data),
    onSuccess: () => {
      invalidate()
      toast.success('Socio actualizado')
    },
    onError: () => toast.error('Error al actualizar socio'),
  })

  const patch = useMutation({
    mutationFn: ({ id, data }) => patchSocio(id, data),
    onSuccess: () => {
      invalidate()
      toast.success('Socio actualizado')
    },
    onError: () => toast.error('Error al actualizar socio'),
  })

  const remove = useMutation({
    mutationFn: (id) => deleteSocio(id),
    onSuccess: () => {
      invalidate()
      toast.success('Socio eliminado')
    },
    onError: () => toast.error('Error al eliminar socio'),
  })

  const baja = useMutation({
    mutationFn: (id) => darBajaSocio(id),
    onSuccess: () => {
      invalidate()
      toast.success('Socio dado de baja')
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Error al dar de baja')
    },
  })

  const certificado = useMutation({
    mutationFn: ({ id, archivo }) => uploadCertificado(id, archivo),
    onSuccess: () => {
      invalidate()
      toast.success('Certificado médico subido correctamente')
    },
    onError: (err) => {
      const msg =
        err.response?.data?.archivo?.[0] ||
        err.response?.data?.detail ||
        'Error al subir certificado'
      toast.error(msg)
    },
  })

  return { create, update, patch, remove, baja, certificado }
}
