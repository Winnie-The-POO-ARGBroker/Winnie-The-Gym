import { useState, useEffect } from 'react'

/**
 * Retrasa la actualización de un valor hasta que el usuario deje de escribir.
 * Útil para evitar requests en cada keystroke en campos de búsqueda.
 *
 * @template T
 * @param {T} value   Valor a "debouncear"
 * @param {number} delay Tiempo de espera en ms (default 400)
 * @returns {T} Valor debounceado
 */
export default function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
