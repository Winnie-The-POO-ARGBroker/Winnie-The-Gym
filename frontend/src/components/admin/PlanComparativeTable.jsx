import { Check, Minus } from 'lucide-react'

export default function PlanComparativeTable({ planes = [], onCreateNew: _onCreateNew }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(price).replace('ARS', '$').trim()
  }

  /**
   * Build rows dynamically from the union of all keys present in each plan's
   * matriz_comparativa. No fallbacks or invented values.
   */
  const allKeys = Array.from(
    planes.reduce((acc, plan) => {
      if (plan.matriz_comparativa && typeof plan.matriz_comparativa === 'object') {
        Object.keys(plan.matriz_comparativa).forEach((k) => acc.add(k))
      }
      return acc
    }, new Set())
  )

  const rows = allKeys.map((key) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    getValue: (plan) => plan.matriz_comparativa?.[key] ?? null,
  }))

  const renderCellValue = (val, plan) => {
    // null/undefined → explicitly no data for this plan (not invented)
    if (val === null || val === undefined) {
      return <span className="text-xs text-text-tertiary">—</span>
    }

    if (val === '✔' || val === true) {
      return (
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
            plan.es_popular
              ? 'bg-orange-500/20 text-orange-500 font-bold'
              : 'bg-success-500/20 text-success-500 font-bold'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </span>
      )
    }

    if (val === '—' || val === false) {
      return <Minus className="w-4 h-4 text-text-tertiary mx-auto stroke-[2]" />
    }

    return (
      <span className="text-xs font-semibold text-text-primary">
        {String(val)}
      </span>
    )
  }

  return (
    <div className="w-full bg-bg-surface border border-subtle rounded-2xl overflow-hidden shadow-sm transition-all">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-subtle bg-bg-raised/40">
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-text-secondary w-1/4">
                CARACTERÍSTICA
              </th>
              {planes.map((plan) => (
                <th key={plan.id} className="py-4 px-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {plan.es_popular && (
                      <span className="w-2.5 h-2.5 rounded-full inline-block bg-orange-500" />
                    )}
                    <span className="text-sm font-bold text-text-primary">
                      {plan.nombre}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-subtle">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={planes.length + 1}
                  className="py-8 text-center text-sm text-text-tertiary italic"
                >
                  Sin datos de comparativa
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="hover:bg-bg-raised/20 transition-colors">
                  <td className="py-3.5 px-6 text-xs font-medium text-text-secondary">
                    {row.label}
                  </td>
                  {planes.map((plan) => (
                    <td key={plan.id} className="py-3.5 px-6 text-center">
                      {renderCellValue(row.getValue(plan), plan)}
                    </td>
                  ))}
                </tr>
              ))
            )}

            {/* Precio mensual footer */}
            <tr className="bg-gradient-to-r from-orange-500/90 via-orange-500 to-orange-600 text-white font-bold">
              <td className="py-4 px-6 text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                Precio mensual
              </td>
              {planes.map((plan) => (
                <td key={plan.id} className="py-4 px-6 text-center">
                  <span className="text-sm sm:text-base font-extrabold text-white">
                    {formatPrice(plan.precio)}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
