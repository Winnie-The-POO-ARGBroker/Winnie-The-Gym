import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Skeleton from './Skeleton'
import EmptyState from './EmptyState'

/**
 * Tabla de datos reutilizable con soporte para ordenación por columnas.
 *
 * @param {Object}   props
 * @param {Array}    props.columns    - Definiciones de columnas [{ key, label, sortable?, render? }]
 * @param {Array}    props.data       - Filas de datos
 * @param {boolean}  props.loading    - Mostrar skeleton
 * @param {string}   [props.ordering] - Campo de ordenación actual (ej: '-apellido')
 * @param {function} [props.onSort]   - Callback al ordenar (recibe el key)
 * @param {function} [props.onRowClick] - Callback al hacer click en una fila
 * @param {function} [props.renderActions] - Render de acciones por fila (recibe la fila)
 * @param {string}   [props.emptyTitle]   - Título cuando no hay datos
 * @param {string}   [props.emptyMessage] - Mensaje cuando no hay datos
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
}) {
  // Determina la dirección de ordenación para una columna
  function getSortDirection(key) {
    if (!ordering) return null
    if (ordering === key) return 'asc'
    if (ordering === `-${key}`) return 'desc'
    return null
  }

  // Toggle de ordenación: null → asc → desc → null
  function handleSort(key) {
    if (!onSort) return
    const current = getSortDirection(key)
    if (current === null) onSort(key)
    else if (current === 'asc') onSort(`-${key}`)
    else onSort(null)
  }

  // Skeleton rows para loading
  if (loading) {
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

  // Empty state
  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />
  }

  return (
    <div className="rounded-xl border border-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-raised border-b border-subtle">
              {columns.map((col) => {
                const sortDir = getSortDirection(col.key)
                const isSortable = col.sortable && onSort

                return (
                  <th
                    key={col.key}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                    className={`text-left text-xs font-semibold uppercase tracking-wider text-text-secondary px-4 py-3 ${
                      isSortable ? 'cursor-pointer select-none hover:text-text-primary transition-colors' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.label}
                      {isSortable && (
                        <span className="text-text-tertiary">
                          {sortDir === 'asc' && <ArrowUp className="w-3.5 h-3.5 text-primary" />}
                          {sortDir === 'desc' && <ArrowDown className="w-3.5 h-3.5 text-primary" />}
                          {sortDir === null && <ArrowUpDown className="w-3.5 h-3.5" />}
                        </span>
                      )}
                    </span>
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
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-subtle last:border-0 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-bg-raised' : ''
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
