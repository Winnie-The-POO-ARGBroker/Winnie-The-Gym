import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Componente de paginación reutilizable.
 * Trabaja con el formato de respuesta paginada de Django REST Framework
 * ({ count, next, previous, results }).
 *
 * @param {Object}   props
 * @param {number}   props.currentPage - Página actual (1-indexed)
 * @param {number}   props.totalCount  - Total de registros (count de DRF)
 * @param {number}   [props.pageSize=10] - Registros por página
 * @param {function} props.onPageChange - Callback con el nuevo número de página
 */
export default function Pagination({ currentPage, totalCount, pageSize = 10, onPageChange }) {
  const totalPages = Math.ceil(totalCount / pageSize)

  if (totalPages <= 1) return null

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalCount)

  // Genera el rango de páginas visibles (máx 5 botones)
  function getVisiblePages() {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = start + maxVisible - 1

    if (end > totalPages) {
      end = totalPages
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  const visiblePages = getVisiblePages()

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      {/* Indicador "Mostrando X–Y de Z" */}
      <p className="text-sm text-text-secondary">
        Mostrando <span className="font-medium text-text-primary">{from}</span>–
        <span className="font-medium text-text-primary">{to}</span> de{' '}
        <span className="font-medium text-text-primary">{totalCount}</span>
      </p>

      {/* Controles de navegación */}
      <div className="flex items-center gap-1">
        {/* Anterior */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-raised text-text-secondary hover:text-text-primary"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Números de página */}
        {visiblePages[0] > 1 && (
          <>
            <PageButton page={1} current={currentPage} onClick={onPageChange} />
            {visiblePages[0] > 2 && (
              <span className="px-1 text-text-tertiary text-sm">…</span>
            )}
          </>
        )}

        {visiblePages.map((page) => (
          <PageButton key={page} page={page} current={currentPage} onClick={onPageChange} />
        ))}

        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="px-1 text-text-tertiary text-sm">…</span>
            )}
            <PageButton page={totalPages} current={currentPage} onClick={onPageChange} />
          </>
        )}

        {/* Siguiente */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-raised text-text-secondary hover:text-text-primary"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function PageButton({ page, current, onClick }) {
  const isActive = page === current
  return (
    <button
      onClick={() => onClick(page)}
      className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-primary text-white shadow-md'
          : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
      }`}
    >
      {page}
    </button>
  )
}
