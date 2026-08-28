import React from 'react'
import { Check, Minus, Plus } from 'lucide-react'

export default function PlanComparativeTable({ planes = [], onCreateNew }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(price).replace('ARS', '$').trim()
  }

  // Row definitions corresponding to Figma
  const rows = [
    {
      label: 'Pase libre al gym',
      getValue: (plan) => {
        if (plan.matriz_comparativa?.pase_libre) return plan.matriz_comparativa.pase_libre
        return plan.nombre === 'Básico' ? '3x/sem' : '✔'
      },
    },
    {
      label: 'Reservas de clases',
      getValue: (plan) => {
        if (plan.matriz_comparativa?.reservas_clases) return plan.matriz_comparativa.reservas_clases
        if (plan.nombre === 'Básico') return '—'
        if (plan.nombre === 'Premium') return 'Todas'
        return 'Todas + prioridad'
      },
    },
    {
      label: 'Entrenador asignado',
      getValue: (plan) => {
        if (typeof plan.matriz_comparativa?.entrenador_asignado === 'boolean') {
          return plan.matriz_comparativa.entrenador_asignado ? '✔' : '—'
        }
        return plan.nombre === 'Gold' ? '✔' : '—'
      },
    },
    {
      label: 'Rutina personalizada',
      getValue: (plan) => {
        if (typeof plan.matriz_comparativa?.rutina_personalizada === 'boolean') {
          return plan.matriz_comparativa.rutina_personalizada ? '✔' : '—'
        }
        return plan.nombre === 'Básico' ? '—' : '✔'
      },
    },
    {
      label: 'Acceso multi-sede',
      getValue: (plan) => {
        if (plan.matriz_comparativa?.acceso_multisede) return plan.matriz_comparativa.acceso_multisede
        return plan.nombre === 'Gold' ? '2 sedes' : '1 sede'
      },
    },
    {
      label: 'Invitado mensual',
      getValue: (plan) => {
        if (typeof plan.matriz_comparativa?.invitado_mensual === 'boolean') {
          return plan.matriz_comparativa.invitado_mensual ? '✔' : '—'
        }
        return plan.nombre === 'Gold' ? '✔' : '—'
      },
    },
    {
      label: 'Congelar plan',
      getValue: (plan) => {
        if (plan.matriz_comparativa?.congelar_plan) return plan.matriz_comparativa.congelar_plan
        if (plan.nombre === 'Básico') return '—'
        if (plan.nombre === 'Premium') return '1 mes'
        return '2 meses'
      },
    },
  ]

  const renderCellValue = (val, plan) => {
    if (val === '✔' || val === true) {
      return (
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
            plan.es_popular || plan.nombre === 'Premium'
              ? 'bg-orange-500/20 text-orange-500 font-bold'
              : plan.nombre === 'Gold'
              ? 'bg-yellow-500/20 text-yellow-500 font-bold'
              : 'bg-green-500/20 text-green-500 font-bold'
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
        {val}
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
              {planes.map((plan) => {
                let dotColor = '#525252'
                if (plan.nombre === 'Premium' || plan.es_popular) dotColor = '#FF5722'
                if (plan.nombre === 'Gold') dotColor = '#EAB308'

                return (
                  <th key={plan.id} className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="text-sm font-bold text-text-primary">
                        {plan.nombre}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-subtle">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-bg-raised/20 transition-colors"
              >
                <td className="py-3.5 px-6 text-xs font-medium text-text-secondary">
                  {row.label}
                </td>
                {planes.map((plan) => (
                  <td key={plan.id} className="py-3.5 px-6 text-center">
                    {renderCellValue(row.getValue(plan), plan)}
                  </td>
                ))}
              </tr>
            ))}

            {/* Highlighted Footer Row (Precio mensual) */}
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
