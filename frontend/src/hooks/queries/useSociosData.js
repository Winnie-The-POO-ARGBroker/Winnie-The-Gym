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
  getSociosStats,
} from '../../services/sociosService'

// ─── Query keys estructuradas ──────────────────────────────────
export const SOCIOS_QUERY_KEYS = {
  all: ['socios'],
  lists: () => ['socios', 'list'],
  list: (params) => ['socios', 'list', params],
  details: () => ['socios', 'detail'],
  detail: (id) => ['socios', 'detail', id],
  stats: () => ['socios', 'stats'],
}

/**
 * Helper para extraer mensajes de error detallados desde DRF
 */
function extractErrorMessage(err, fallbackMessage) {
  const data = err?.response?.data
  if (!data) return fallbackMessage
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (data.message) return data.message
  if (data.error) return data.error
  if (data.archivo && Array.isArray(data.archivo)) return data.archivo.join(', ')

  const values = Object.values(data)
  if (values.length > 0) {
    const flat = values.flat().filter(Boolean)
    if (flat.length > 0) return flat.join(', ')
  }
  return fallbackMessage
}

/**
 * Lista paginada de socios con filtros, búsqueda y ordenación.
 *
 * @param {Object} params — { page, pageSize, search, estado, con_certificado, ordering }
 * @param {Object} [options] — opciones extra de useQuery
 */
export function useSociosList(params = {}, options = {}) {
  return useQuery({
    queryKey: SOCIOS_QUERY_KEYS.list(params),
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
    queryKey: SOCIOS_QUERY_KEYS.detail(id),
    queryFn: () => getSocio(id),
    enabled: !!id,
  })
}

/**
 * Estadísticas globales de socios (total, activos, bajas, etc.).
 */
export function useSociosStats(options = {}) {
  return useQuery({
    queryKey: SOCIOS_QUERY_KEYS.stats(),
    queryFn: getSociosStats,
    staleTime: 60_000,
    ...options,
  })
}

/**
 * Todas las mutaciones de socios en un solo hook.
 * Invalidan automáticamente la cache del listado al tener éxito.
 */
export function useSocioMutations() {
  const qc = useQueryClient()

  const invalidate = () => qc.invalidateQueries({ queryKey: SOCIOS_QUERY_KEYS.all })

  const create = useMutation({
    mutationFn: (data) => createSocio(data),
    onSuccess: () => {
      invalidate()
      toast.success('Socio creado correctamente')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al crear socio'))
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }) => updateSocio(id, data),
    onSuccess: () => {
      invalidate()
      toast.success('Socio actualizado')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al actualizar socio'))
    },
  })

  const patch = useMutation({
    mutationFn: ({ id, data }) => patchSocio(id, data),
    onSuccess: () => {
      invalidate()
      toast.success('Socio actualizado')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al actualizar socio'))
    },
  })

  /**
   * @deprecated Use baja() for logical delete. Hard DELETE can cause integrity issues.
   */
  const remove = useMutation({
    mutationFn: (id) => deleteSocio(id),
    onSuccess: () => {
      invalidate()
      toast.success('Socio eliminado')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al eliminar socio'))
    },
  })

  const baja = useMutation({
    mutationFn: (id) => darBajaSocio(id),
    onSuccess: () => {
      invalidate()
      toast.success('Socio dado de baja')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al dar de baja'))
    },
  })

  const certificado = useMutation({
    mutationFn: ({ id, archivo }) => uploadCertificado(id, archivo),
    onSuccess: () => {
      invalidate()
      toast.success('Certificado médico subido correctamente')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al subir certificado'))
    },
  })

  return { create, update, patch, remove, baja, certificado }
}
