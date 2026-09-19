import { useQuery } from '@tanstack/react-query'
import { getReportPlans } from '../../services/reportsService'

export const PLANES_KEY = ['planes']

/**
 * Hook to retrieve active membership plans for filter selectors and displays.
 * Configured with a 5-minute staleTime because subscription plans are stable
 * domain master-data that change infrequently, avoiding redundant refetches
 * on every component remount (e.g. ReportFilters tab switching).
 */
export function usePlanes() {
  return useQuery({
    queryKey: PLANES_KEY,
    queryFn: getReportPlans,
    staleTime: 5 * 60 * 1000,
  })
}
