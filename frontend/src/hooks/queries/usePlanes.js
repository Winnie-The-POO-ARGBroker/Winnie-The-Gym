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
 */
export function usePlanes() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: PLANES_KEY,
    queryFn: getReportPlans,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry on auth or notfound errors
      if (error.type === 'auth' || error.type === 'notfound') return false;
      return failureCount < 3;
    }
  })

  useEffect(() => {
    if (query.isError && query.error) {
      switch (query.error.type) {
        case 'auth':
          toast.error('Sesión expirada')
          navigate('/login')
          break
        case 'network':
          toast.error('Sin conexión', {
            action: { label: 'Reintentar', onClick: () => query.refetch() }
          })
          break
        case 'server':
          toast.error('Error interno, intentá más tarde')
          Sentry.captureException(query.error.originalError || query.error)
          break
        case 'notfound':
          // The UI handles empty states if data is [] or no result
          break
        default:
          toast.error('Error al cargar planes')
      }
    }
  }, [query.isError, query.error, navigate, query.refetch])

  return query
}
