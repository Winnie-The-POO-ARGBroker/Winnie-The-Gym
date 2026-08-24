import axios from 'axios'
import { toast } from 'sonner'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

function getAccessToken() {
  try {
    const raw = localStorage.getItem('auth-storage')
    return raw ? JSON.parse(raw)?.state?.accessToken ?? null : null
  } catch {
    return null
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage')
      toast.error('Your session has expired. Please log in again.')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
