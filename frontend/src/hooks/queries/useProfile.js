import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

export const PROFILE_KEY = ['profile']

async function fetchProfile() {
  const { data } = await api.get('/auth/profile/')
  return data
}

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: fetchProfile,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.patch('/auth/profile/', payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(PROFILE_KEY, data)
    },
  })
}
