import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'winnie-high-contrast-pref'
const AUTO_ACTIVATE_ROUTES = ['/socio/credencial']

export function useHighContrast() {
  const { pathname } = useLocation()
  const isAutoRoute = AUTO_ACTIVATE_ROUTES.some((route) => pathname.startsWith(route))

  const [manualPref, setManualPref] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored !== null ? stored === 'true' : null
    } catch {
      return null
    }
  })

  const isHighContrast = manualPref !== null ? manualPref : isAutoRoute

  const toggleHighContrast = () => {
    const next = !isHighContrast
    setManualPref(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (isHighContrast) {
      document.body.classList.add('high-contrast')
    } else {
      document.body.classList.remove('high-contrast')
    }

    return () => {
      document.body.classList.remove('high-contrast')
    }
  }, [isHighContrast])

  return {
    isHighContrast,
    toggleHighContrast,
    isAutoActivated: isAutoRoute && manualPref === null,
  }
}
