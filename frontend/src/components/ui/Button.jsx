const BASE = 'inline-flex items-center justify-center font-semibold rounded-xl transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANTS = {
  primary:   'bg-primary text-white hover:opacity-90',
  secondary: 'bg-bg-raised text-text-primary border border-subtle hover:opacity-80',
  ghost:     'text-text-secondary hover:text-text-primary hover:bg-bg-raised',
  danger:    'bg-error-500 text-white hover:opacity-90',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-sm px-6 py-3',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  children,
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${BASE} ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`}
    >
      {loading ? 'Cargando...' : children}
    </button>
  )
}
