import { useQuery } from '@tanstack/react-query'
import { getReportPlans } from '../../services/reportsService'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import * as Sentry from '@sentry/react'

export const PLANES_KEY = ['planes']

/**
 * Hook to retrieve active membership plans for filter selectors and displays.
 * Configured with a 5-minute staleTime because subscription plans are stable
 * domain master-data that change infrequently, avoiding redundant refetches
 * on every component remount (e.g. ReportFilters tab switching).
 *
 * Se desestructuran isError, error y refetch antes del useEffect para
 * exponer valores primitivos/estables como dependencias. Esto evita que el
 * effect se dispare en cada render (React Query devuelve nueva referencia del
 * objeto query en cada ciclo) y satisface react-hooks/exhaustive-deps.
 *
 * Patrón replicable: cualquier otro service puede adoptar este mismo
 * esquema con try { ... } catch (error) { throw classifyError(error) } en el
 * service, y un switch (error.type) en el hook consumidor.
 * También aplicable a: paymentsService, membershipsService, classesService.
 */
export function usePlanes() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: PLANES_KEY,
    queryFn: getReportPlans,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      // No reintentar en errores de auth o not found
      if (error.type === 'auth' || error.type === 'notfound') return false
      return failureCount < 3
    },
  })

  const { isError, error, refetch } = query

  useEffect(() => {
    if (isError && error) {
      switch (error.type) {
        case 'auth':
          toast.error('Sesión expirada')
          navigate('/login')
          break
        case 'network':
          toast.error('Sin conexión', {
            action: { label: 'Reintentar', onClick: () => refetch() },
          })
          break
        case 'server':
          toast.error('Error interno, intentá más tarde')
          Sentry.captureException(error.originalError || error)
          break
        case 'notfound':
          // La UI maneja el empty state — no disparar toast de error
          break
        default:
          toast.error('Error al cargar planes')
      }
    }
  }, [isError, error, navigate, refetch])

  return query
}
