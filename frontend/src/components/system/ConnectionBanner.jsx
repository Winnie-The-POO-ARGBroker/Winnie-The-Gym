import { useState, useEffect } from 'react'

/**
 * ConnectionBanner — persistent top banner that informs the user when the browser
 * is offline. Listens to the browser's native online/offline events so it updates
 * in real-time without polling.
 */
export default function ConnectionBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full bg-yellow-500 text-yellow-950 text-sm font-semibold text-center py-2 px-4"
    >
      Sin conexión — verificá tu red para seguir usando la app.
    </div>
  )
}
