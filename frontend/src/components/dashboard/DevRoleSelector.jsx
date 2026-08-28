import Badge from '../ui/Badge'
import FilterButton from '../ui/FilterButton'

export default function DevRoleSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-bg-surface border border-subtle">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Vista activa:
        </span>
        <Badge variant="live">{value.toUpperCase()}</Badge>
      </div>

      <div className="flex gap-2">
        <FilterButton
          onClick={() => onChange('administrador')}
          active={value === 'administrador'}
        >
          Administrador
        </FilterButton>
        <FilterButton
          onClick={() => onChange('recepcionista')}
          active={value === 'recepcionista'}
        >
          Recepcionista
        </FilterButton>
        <FilterButton
          onClick={() => onChange('socio')}
          active={value === 'socio'}
        >
          Socio
        </FilterButton>
      </div>
    </div>
  )
}
