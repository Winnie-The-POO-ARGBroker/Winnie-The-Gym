import React from 'react'

export default function PlanDistributionChart({ planes = [] }) {
  const totalSocios = planes.reduce((acc, p) => acc + (p.socios_activos || 0), 0)

  // Calculate percentages dynamically if socios exist
  const items = planes.map((p) => {
    const count = p.socios_activos || 0
    const pct = totalSocios > 0 ? Math.round((count / totalSocios) * 100) : 0
    return {
      ...p,
      porcentajeCalculado: p.porcentaje || pct,
      count,
    }
  })

  return (
    <div className="w-full bg-bg-surface border border-subtle rounded-2xl p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">
            Distribución de socios por plan
          </h3>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Proporción de membresías activas sobre el total
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-raised border border-subtle self-start sm:self-auto">
          <span className="text-xs text-text-tertiary">Total:</span>
          <span className="text-xs font-bold text-text-primary">
            {totalSocios.toLocaleString('es-AR')} socios
          </span>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="w-full h-9 rounded-xl overflow-hidden flex bg-bg-raised p-1 gap-1 border border-subtle">
        {items.map((item) => {
          const widthPct = item.porcentajeCalculado || 0
          if (widthPct <= 0) return null

          let bgColor = item.color || '#525252'
          let textColor = 'text-white'

          if (item.nombre === 'Básico') {
            bgColor = '#404040'
          } else if (item.nombre === 'Premium') {
            bgColor = '#FF5722'
          } else if (item.nombre === 'Gold') {
            bgColor = '#EAB308'
            textColor = 'text-black'
          }

          return (
            <div
              key={item.id}
              style={{ width: `${widthPct}%`, backgroundColor: bgColor }}
              className={`h-full rounded-lg flex items-center justify-center transition-all duration-500 min-w-[50px] px-2 ${textColor}`}
              title={`${item.nombre}: ${item.count} socios (${widthPct}%)`}
            >
              <span className="text-[11px] font-bold truncate">
                {item.nombre} {widthPct}%
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend below bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-subtle">
        {items.map((item) => {
          let dotColor = item.color || '#525252'
          if (item.nombre === 'Básico') dotColor = '#404040'
          if (item.nombre === 'Premium') dotColor = '#FF5722'
          if (item.nombre === 'Gold') dotColor = '#EAB308'

          return (
            <div key={item.id} className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: dotColor }}
              />
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="font-semibold text-text-primary">{item.nombre}</span>
                <span className="text-text-secondary">({item.porcentajeCalculado}%)</span>
                <span className="text-text-tertiary">· {item.count.toLocaleString('es-AR')} socios</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
