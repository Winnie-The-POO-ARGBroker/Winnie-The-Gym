import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Hook para solicitar y gestionar Screen Wake Lock API y brillo / pantalla activa.
 * 
 * - Solicita wakeLock 'screen' al montarse o activarse.
 * - Reintenta re-adquirir el wake lock cuando el documento vuelve a estar visible (visibilitychange).
 * - Libera el wake lock al desmontar o desactivar.
 * - Intenta maximizar el brillo si la plataforma / WebView soporta APIs experimentales
 *   como screen.brightness o screen.setBrightness.
 */
export default function useScreenWakeLock({ enabled = true } = {}) {
  const [isSupported, setIsSupported] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [brightnessBoosted, setBrightnessBoosted] = useState(false)
  const wakeLockRef = useRef(null)
  const previousBrightnessRef = useRef(null)

  // Función para solicitar Wake Lock
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false
    }
    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        return true
      }
      const sentinel = await navigator.wakeLock.request('screen')
      wakeLockRef.current = sentinel
      setIsActive(true)

      const handleRelease = () => {
        setIsActive(false)
        sentinel.removeEventListener('release', handleRelease)
      }
      sentinel.addEventListener('release', handleRelease)
      return true
    } catch {
      // AbortError u otros errores de permisos / batería
      setIsActive(false)
      return false
    }
  }, [])

  // Función para liberar Wake Lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
      } catch {
        // Ignorar errores al liberar
      } finally {
        wakeLockRef.current = null
        setIsActive(false)
      }
    }
  }, [])

  // Control experimental de brillo (disponible en ciertos WebViews o extensiones de pantalla)
  const boostBrightness = useCallback(async () => {
    const scr = typeof window !== 'undefined' && window.screen ? window.screen : (typeof screen !== 'undefined' ? screen : null)
    if (!scr) return

    try {
      // Caso 1: screen.brightness (lectura y escritura o propiedad con valor numérico 0 a 1)
      if ('brightness' in scr && typeof scr.brightness === 'number') {
        previousBrightnessRef.current = scr.brightness
        scr.brightness = 1.0
        setBrightnessBoosted(true)
      }
      // Caso 2: screen.setBrightness API (algunos WebViews móviles)
      else if (typeof scr.setBrightness === 'function') {
        if (typeof scr.getBrightness === 'function') {
          const current = await scr.getBrightness()
          previousBrightnessRef.current = current
        }
        await scr.setBrightness(1.0)
        setBrightnessBoosted(true)
      }
    } catch {
      // Si la API falla silenciosamente por falta de permisos
      setBrightnessBoosted(false)
    }
  }, [])

  const restoreBrightness = useCallback(async () => {
    const scr = typeof window !== 'undefined' && window.screen ? window.screen : (typeof screen !== 'undefined' ? screen : null)
    if (!scr) return

    try {
      if (previousBrightnessRef.current !== null) {
        if ('brightness' in scr && typeof scr.brightness === 'number') {
          scr.brightness = previousBrightnessRef.current
        } else if (typeof scr.setBrightness === 'function') {
          await scr.setBrightness(previousBrightnessRef.current)
        }
        previousBrightnessRef.current = null
      }
    } catch {
      // Silencioso
    } finally {
      setBrightnessBoosted(false)
    }
  }, [])

  useEffect(() => {
    const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
    setIsSupported(supported)

    if (!enabled) {
      releaseWakeLock()
      restoreBrightness()
      return
    }

    // Solicitar wake lock y brillo
    requestWakeLock()
    boostBrightness()

    // Manejar reactivación al volver del cambio de pestaña o desbloqueo
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && enabled) {
        await requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      releaseWakeLock()
      restoreBrightness()
    }
  }, [enabled, requestWakeLock, releaseWakeLock, boostBrightness, restoreBrightness])

  return {
    isSupported,
    isActive,
    brightnessBoosted,
    requestWakeLock,
    releaseWakeLock,
  }
}
