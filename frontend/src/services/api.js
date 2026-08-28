import axios from 'axios'
import { toast } from 'sonner'
import useAuthStore from '../stores/authStore'
// Note: api.js keeps a direct useAuthStore.getState() import instead of the
// useAuth() hook because axios interceptors run outside React's render
// context and cannot call hooks.

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// SPA navigator injected from App.jsx via setApiNavigator(navigate).
// This is required because axios interceptors run outside React context.
let navigator = null
let isRedirecting = false

export function setApiNavigator(nav) {
  navigator = nav
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/token')
    if (error.response?.status === 401 && !isAuthEndpoint && !isRedirecting) {
      isRedirecting = true
      useAuthStore.getState().clearAuth()
      toast.error('Your session has expired. Please log in again.')
      if (navigator) navigator('/login', { replace: true })
      setTimeout(() => { isRedirecting = false }, 0)
    }
    return Promise.reject(error)
  }
)

export default api
