import React from 'react'
import { Edit2, Archive, Trash2, Check, X, Sparkles } from 'lucide-react'

export default function PlanCard({ plan, onEdit, onArchive, onDelete, onDuplicate }) {
  const isPopular = plan.es_popular

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(price).replace('ARS', '$').trim()
  }

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
        isPopular
          ? 'bg-bg-surface border-2 border-orange-500 shadow-[0_0_25px_rgba(255,87,34,0.2)]'
          : 'bg-bg-surface border border-subtle hover:border-strong'
      }`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-orange-500 text-white text-[11px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-md">
          <Sparkles className="w-3 h-3 fill-current" />
          POPULAR
        </div>
      )}

      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4 pt-1">
          <div>
            <h3 className="text-xl font-bold text-text-primary tracking-tight">
              {plan.nombre}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5 font-medium">
              {plan.subtitulo || 'Membresía estándar'}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-raised text-text-secondary border border-subtle">
            {plan.socios_activos?.toLocaleString('es-AR') ?? 0} socios
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 my-5 pb-5 border-b border-subtle">
          <span className="text-3xl lg:text-4xl font-extrabold text-text-primary tracking-tight">
            {formatPrice(plan.precio)}
          </span>
          <span className="text-xs text-text-tertiary font-medium">/mes</span>
        </div>

        {/* Benefits Checklist */}
        <ul className="space-y-3.5 mb-6 text-sm">
          {plan.beneficios?.map((b, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  b.incluido
                    ? isPopular
                      ? 'bg-orange-500/20 text-orange-500 font-bold'
                      : plan.nombre === 'Gold'
                      ? 'bg-yellow-500/20 text-yellow-500 font-bold'
                      : 'bg-green-500/20 text-green-500 font-bold'
                    : 'bg-bg-raised text-text-tertiary'
                }`}
              >
                {b.incluido ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : (
                  <X className="w-3 h-3 stroke-[2.5]" />
                )}
              </span>
              <span
                className={`text-xs font-medium ${
                  b.incluido ? 'text-text-primary' : 'text-text-tertiary line-through'
                }`}
              >
                {b.texto}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-subtle">
        <button
          onClick={() => onEdit(plan)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-bg-raised hover:bg-bg-surface hover:border-orange-500/50 border border-subtle text-text-primary text-xs font-semibold transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5 text-text-secondary" />
          Editar
        </button>

        <button
          onClick={() => onArchive(plan)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-bg-raised hover:bg-bg-surface border border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors"
          title="Archivar plan"
        >
          <Archive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Archivar</span>
        </button>

        {onDelete && (
          <button
            onClick={() => onDelete(plan)}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-raised hover:bg-error-500/10 text-text-tertiary hover:text-error-500 border border-subtle transition-colors"
            title="Eliminar plan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
