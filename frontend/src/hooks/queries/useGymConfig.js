import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

export const GYM_CONFIG_KEY = ['gymConfig']

async function fetchGymConfig() {
  const { data } = await api.get('/config/gym/')
  return data
}

/**
 * Returns the gym configuration (singleton).
 * staleTime is Infinity — the config rarely changes and is cached forever until
 * explicitly invalidated (e.g., after a PATCH from the admin page).
 */
export function useGymConfig() {
  return useQuery({
    queryKey: GYM_CONFIG_KEY,
    queryFn: fetchGymConfig,
    staleTime: Infinity,
  })
}

/**
 * Mutation to update the gym config (admin-only).
 * Invalidates the GYM_CONFIG_KEY query on success so all consumers refresh.
 */
export function useUpdateGymConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.patch('/config/gym/', payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(GYM_CONFIG_KEY, data)
    },
  })
}
