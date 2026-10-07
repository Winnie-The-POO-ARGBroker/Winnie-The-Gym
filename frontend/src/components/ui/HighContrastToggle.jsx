import { useHighContrast } from '../../hooks/useHighContrast'

export default function HighContrastToggle() {
  const { isHighContrast, toggleHighContrast } = useHighContrast()

  return (
    <button
      id= high-contrast-toggle
      type=button
      onClick={toggleHighContrast}
      className={px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 }
      aria-label={isHighContrast ? 'Desactivar alto contraste' : 'Activar alto contraste'}
      aria-pressed={isHighContrast}
      title={isHighContrast ? 'Modo alto contraste (exterior)' : 'Activar modo exterior'}
    >
      <span>{isHighContrast ? '☀️' : '🌙'}</span>
      <span>{isHighContrast ? 'Alto Contraste' : 'Normal'}</span>
    </button>
  )
}