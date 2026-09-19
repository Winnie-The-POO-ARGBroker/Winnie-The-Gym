import { Search, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import useDebounce from '../../hooks/useDebounce'

/**
 * Barra de búsqueda con debounce integrado.
 *
 * @param {Object}   props
 * @param {string}   [props.placeholder='Buscar...']
 * @param {function} props.onSearch - Callback con el valor debounceado
 * @param {number}   [props.delay=400] - Delay del debounce en ms
 * @param {string}   [props.className]
 */
export default function SearchBar({
  placeholder = 'Buscar...',
  onSearch,
  delay = 400,
  className = '',
}) {
  const [value, setValue] = useState('')
  const debounced = useDebounce(value, delay)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onSearch?.(debounced)
  }, [debounced, onSearch])

  function handleClear() {
    setValue('')
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-text-tertiary" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder || 'Buscar'}
        className="w-full bg-bg-base border border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors py-2.5 pl-10 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
