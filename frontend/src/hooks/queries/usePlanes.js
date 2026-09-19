import { useQuery } from '@tanstack/react-query'
import { getReportPlans } from '../../services/reportsService'

export const PLANES_KEY = ['planes']

export function usePlanes() {
  return useQuery({
    queryKey: PLANES_KEY,
    queryFn: getReportPlans,
  })
}
