import { useState } from 'react'
import { CreditCard, CheckCircle, ShieldCheck, Zap } from 'lucide-react'
import MemberLayout from '../../components/layout/MemberLayout'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import { usePlanesQuery } from '../../hooks/queries/usePlanesAdmin'
import { useCrearPreferenciaMutation } from '../../hooks/queries/usePagos'

// Íconos de beneficios por plan (genérico si el backend no los tiene)
const BENEFIT_ICONS = [Zap, CheckCircle, ShieldCheck]

function PlanCard({ plan, onPagar, loading }) {
  const beneficios = plan.descripcion
    ? plan.descripcion.split('\n').filter(Boolean)
    : []

  return (
    <Card
      className={`p-5 flex flex-col gap-4 transition-all ${
        plan.es_popular
          ? 'border-primary ring-1 ring-primary/30'
          : ''
      }`}
    >
      {/* Badge popular */}
      {plan.es_popular && (
        <div className="self-start px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
          Más popular
        </div>
      )}

      {/* Nombre y precio */}
      <div>
        <h2 className="text-base font-bold text-text-primary">{plan.nombre}</h2>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-bold text-primary">
            ${Number(plan.precio).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </span>
          <span className="text-xs text-text-tertiary">ARS / {plan.duracion_dias} días</span>
        </div>
      </div>

      {/* Beneficios */}
      {beneficios.length > 0 && (
        <ul className="flex flex-col gap-2">
          {beneficios.map((b, i) => {
            const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length]
            return (
              <li key={i} className="flex items-center gap-2 text-[12px] text-text-secondary">
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                {b}
              </li>
            )
          })}
        </ul>
      )}

      {/* Botón de pago */}
      <Button
        id={`btn-pagar-plan-${plan.id}`}
        variant={plan.es_popular ? 'primary' : 'secondary'}
        size="md"
        loading={loading}
        onClick={() => onPagar(plan)}
        className="w-full mt-auto gap-2"
      >
        <CreditCard className="w-4 h-4" />
        Pagar con MercadoPago
      </Button>
    </Card>
  )
}

export default function CheckoutPage() {
  const [loadingPlanId, setLoadingPlanId] = useState(null)

  const { data: allPlanes = [], isLoading: isLoadingPlanes } = usePlanesQuery()
  const planes = allPlanes.filter((p) => p.activo)

  const crearPreferencia = useCrearPreferenciaMutation()

  const handlePagar = (plan) => {
    setLoadingPlanId(plan.id)
    crearPreferencia.mutate(plan.id, {
      onSettled: () => setLoadingPlanId(null),
    })
  }

  return (
    <MemberLayout
      title="Renovar membresía"
      subtitle="Seleccioná tu plan y pagá con MercadoPago"
    >
      <div className="flex flex-col gap-4 w-full animate-fadeIn">

        {/* Encabezado informativo */}
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="w-4 h-4 text-success-500 shrink-0" />
          <p className="text-[11px] text-text-tertiary leading-tight">
            Pagos procesados de forma segura por MercadoPago. Serás redirigido a su plataforma.
          </p>
        </div>

        {/* Skeleton mientras cargan los planes */}
        {isLoadingPlanes && (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-bg-surface border border-subtle animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Sin planes disponibles */}
        {!isLoadingPlanes && planes.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title="Sin planes disponibles"
            message="No hay planes activos en este momento. Acercate a recepción para obtener más información."
          />
        )}

        {!isLoadingPlanes && planes.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            loading={loadingPlanId === plan.id}
            onPagar={handlePagar}
          />
        ))}

      </div>
    </MemberLayout>
  )
}
