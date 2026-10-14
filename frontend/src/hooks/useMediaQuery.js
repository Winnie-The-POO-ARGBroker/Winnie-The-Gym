import { useState, useEffect } from 'react'

/**
 * useMediaQuery — returns true when the given media query matches.
 *
 * Safe in SSR and in jsdom environments where matchMedia is not defined.
 *
 * @param {string} query - e.g. '(max-width: 767px)'
 * @returns {boolean}
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mq = window.matchMedia(query)
    setMatches(mq.matches)

    const handler = (e) => setMatches(e.matches)
    mq.addEventListener('change', handler)

    return () => {
      mq.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}
