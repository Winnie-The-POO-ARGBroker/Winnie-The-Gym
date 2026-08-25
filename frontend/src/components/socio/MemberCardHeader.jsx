import Badge from '../ui/Badge'

export default function MemberCardHeader({ nombre, apellido, numeroSocio, dni, isExpired }) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-subtle">
      <div className="flex items-center gap-2.5">
        {/* Avatar circular */}
        <div className="w-10 h-10 rounded-full bg-bg-raised border border-strong flex items-center justify-center text-text-tertiary shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>

        <div className="flex flex-col">
          <span className="font-semibold text-sm leading-tight text-text-primary">
            {nombre} {apellido}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[11px] text-text-tertiary">
              DNI {dni}
            </span>
            <span className="text-text-tertiary text-xs">•</span>
            <span className="font-mono text-[11px] text-primary font-semibold">
              {numeroSocio}
            </span>
          </div>
        </div>
      </div>

      <Badge variant={isExpired ? 'danger' : 'live'}>
        {isExpired ? 'Vencida' : 'Activa'}
      </Badge>
    </div>
  )
}
