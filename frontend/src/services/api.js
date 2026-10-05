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

export function getApiNavigator() {
  return navigator
}

export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  // Trazabilidad end-to-end: adjuntar X-Request-ID respetando si ya viene definido
  const hasRequestId =
    config.headers && typeof config.headers.has === 'function'
      ? (config.headers.has('X-Request-ID') || config.headers.has('x-request-id'))
      : Boolean(config.headers && (config.headers['X-Request-ID'] || config.headers['x-request-id']))

  if (!hasRequestId) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('X-Request-ID', generateUUID())
    } else {
      config.headers = config.headers || {}
      config.headers['X-Request-ID'] = generateUUID()
    }
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
    const currentToken = useAuthStore.getState().accessToken

    // En desarrollo con botones de demo (mock tokens), no cerrar sesión por 401
    if (currentToken?.startsWith('mock-')) {
      return Promise.reject(error)
    }

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
