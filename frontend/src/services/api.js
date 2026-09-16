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

let isRefreshing = false
let refreshSubscribers = []

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token) {
  refreshSubscribers.map(cb => cb(token))
  refreshSubscribers = []
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const originalRequest = error.config
    const url = originalRequest?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/token')

    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(token => {
            if (!token) {
              return reject(error)
            }
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const success = await useAuthStore.getState().refreshAuthToken()

      if (success) {
        isRefreshing = false
        const newToken = useAuthStore.getState().accessToken
        onRefreshed(newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } else {
        isRefreshing = false
        onRefreshed(null)
        if (!isRedirecting) {
          isRedirecting = true
          useAuthStore.getState().clearAuth()
          toast.error('Tu sesión ha expirado. Por favor, iniciá sesión nuevamente.')
          if (navigator) navigator('/login', { replace: true })
          setTimeout(() => { isRedirecting = false }, 0)
        }
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
