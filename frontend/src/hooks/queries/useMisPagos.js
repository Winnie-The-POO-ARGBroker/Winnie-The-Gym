import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

export const MIS_PAGOS_KEY = ['misPagos']

async function fetchMisPagos() {
  const { data } = await api.get('/payments/pagos/mis-pagos/')
  // The endpoint returns a paginated DRF response; extract results.
  return data?.results ?? data ?? []
}

/**
 * Returns the authenticated socio's own payment history.
 * Only meaningful when the current user has rol='socio'.
 */
export function useMisPagos() {
  return useQuery({
    queryKey: MIS_PAGOS_KEY,
    queryFn: fetchMisPagos,
    retry: 1,
  })
}
