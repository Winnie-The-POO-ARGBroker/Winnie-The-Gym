export default function MemberPlanDetails({ membresia }) {
  return (
    <div className="mt-3 pt-3 border-t border-subtle grid grid-cols-2 gap-2 text-xs">
      <div className="p-2.5 rounded-lg bg-bg-raised/60 border border-subtle">
        <span className="text-[10px] text-text-tertiary uppercase font-medium block">
          Plan
        </span>
        <span className="font-semibold text-text-primary block mt-0.5 truncate text-xs">
          {membresia.planNombre}
        </span>
      </div>

      <div className="p-2.5 rounded-lg bg-bg-raised/60 border border-subtle">
        <span className="text-[10px] text-text-tertiary uppercase font-medium block">
          Vencimiento
        </span>
        <span className="font-semibold text-text-primary block mt-0.5 text-xs">
          {membresia.fechaVencimiento}
        </span>
      </div>
    </div>
  )
}
