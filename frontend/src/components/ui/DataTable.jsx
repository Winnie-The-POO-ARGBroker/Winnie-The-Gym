import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Skeleton from './Skeleton'
import EmptyState from './EmptyState'
import useMediaQuery from '../../hooks/useMediaQuery'

/**
 * Tabla de datos reutilizable con soporte para ordenación por columnas.
 *
 * @param {Object}   props
 * @param {Array}    props.columns    - Definiciones de columnas [{ key, label, sortable?, render?, mobile? }]
 *                                     col.mobile = alias shown in card view (defaults to col.label)
 * @param {Array}    props.data       - Filas de datos
 * @param {boolean}  props.loading    - Mostrar skeleton
 * @param {string}   [props.ordering] - Campo de ordenación actual (ej: '-apellido')
 * @param {function} [props.onSort]   - Callback al ordenar (recibe el key)
 * @param {function} [props.onRowClick] - Callback al hacer click en una fila
 * @param {function} [props.renderActions] - Render de acciones por fila (recibe la fila)
 * @param {string}   [props.emptyTitle]   - Título cuando no hay datos
 * @param {string}   [props.emptyMessage] - Mensaje cuando no hay datos
 * @param {'cards'|undefined} [props.mobileMode] - 'cards' renders card layout below md breakpoint
 */
export default function DataTable({
  columns,
  data,
  loading,
  ordering,
  onSort,
  onRowClick,
  renderActions,
  emptyTitle = 'Sin resultados',
  emptyMessage = 'No se encontraron registros con los filtros aplicados.',
  mobileMode,
}) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const showCards = mobileMode === 'cards' && isMobile

  // Determina la dirección de ordenación para una columna
  function getSortDirection(key) {
    if (!ordering) return null
    if (ordering === key) return 'asc'
    if (ordering === `-${key}`) return 'desc'
    return null
  }

  // Props that make a clickable row operable with the keyboard (Enter / Space).
  // Keys pressed on nested controls (action buttons, links) must keep their own behavior.
  function getRowProps(row) {
    if (!onRowClick) return {}
    return {
      onClick: () => onRowClick(row),
      onKeyDown: (e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onRowClick(row)
        }
      },
      tabIndex: 0,
    }
  }

  // Toggle de ordenación: null → asc → desc → null
  function handleSort(key) {
    if (!onSort) return
    const current = getSortDirection(key)
    if (current === null) onSort(key)
    else if (current === 'asc') onSort(`-${key}`)
    else onSort(null)
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    if (showCards) {
      return (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-subtle bg-bg-surface p-4 flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="rounded-xl border border-subtle overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-raised border-b border-subtle">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-xs font-semibold uppercase tracking-wider text-text-secondary px-4 py-3"
                >
                  {col.label}
                </th>
              ))}
              {renderActions && (
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-text-secondary px-4 py-3">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-subtle last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="h-8 w-20 rounded-lg ml-auto" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />
  }

  // ── Card view (mobile) ──────────────────────────────────────────────────────

  if (showCards) {
    // Sort selector for mobile
    const sortableCols = onSort ? columns.filter((c) => c.sortable) : []

    return (
      <div className="flex flex-col gap-3">
        {/* Mobile sort selector */}
        {sortableCols.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Ordenar por:</span>
            <select
              value={ordering ?? ''}
              onChange={(e) => onSort?.(e.target.value || null)}
              className="text-xs rounded-lg border border-subtle bg-bg-base text-text-primary px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Ordenar tabla"
            >
              <option value="">Sin ordenar</option>
              {sortableCols.map((col) => (
                <>
                  <option key={`asc-${col.key}`} value={col.key}>
                    {col.label} ↑
                  </option>
                  <option key={`desc-${col.key}`} value={`-${col.key}`}>
                    {col.label} ↓
                  </option>
                </>
              ))}
            </select>
          </div>
        )}

        {/* Cards */}
        {data.map((row, idx) => (
          <div
            key={row.id ?? idx}
            {...getRowProps(row)}
            className={`rounded-xl border border-subtle bg-bg-surface p-4 flex flex-col gap-2 ${
              onRowClick ? 'cursor-pointer hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base' : ''
            } transition-colors`}
          >
            {columns.map((col) => {
              const label = col.mobile ?? col.label
              const value = col.render ? col.render(row) : row[col.key]
              return (
                <div key={col.key} className="flex items-start gap-2">
                  <span className="text-xs text-text-tertiary w-24 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-text-primary font-medium flex-1">{value}</span>
                </div>
              )
            })}
            {renderActions && (
              <div className="pt-2 border-t border-subtle flex justify-end">
                {renderActions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ── Table view (desktop / non-card mode) ────────────────────────────────────

  return (
    <div className="rounded-xl border border-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-raised border-b border-subtle">
              {columns.map((col) => {
                const sortDir = getSortDirection(col.key)
                const isSortable = col.sortable && onSort
                const ariaSort = sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none'

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={isSortable ? ariaSort : undefined}
                    className="text-left text-xs font-semibold uppercase tracking-wider text-text-secondary px-4 py-3"
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1.5 -mx-1 px-1 rounded uppercase tracking-wider font-semibold cursor-pointer select-none hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:text-primary transition-colors"
                      >
                        {col.label}
                        <span className="text-text-tertiary">
                          {sortDir === 'asc' && <ArrowUp className="w-3.5 h-3.5 text-primary" />}
                          {sortDir === 'desc' && <ArrowDown className="w-3.5 h-3.5 text-primary" />}
                          {sortDir === null && <ArrowUpDown className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">{col.label}</span>
                    )}
                  </th>
                )
              })}
              {renderActions && (
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-text-secondary px-4 py-3">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                {...getRowProps(row)}
                className={`border-b border-subtle last:border-0 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-text-primary">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-3 text-right">
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
