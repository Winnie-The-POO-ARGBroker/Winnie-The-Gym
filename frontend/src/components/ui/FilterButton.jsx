const SIZE_CLASSES = {
  sm: 'px-3 py-1',
  md: 'px-6 py-2',
}

export default function FilterButton({
  active = false,
  onClick,
  children,
  className = '',
  size = 'sm',
}) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.sm

  const variantClass = active
    ? 'bg-primary text-white'
    : 'bg-bg-surface text-text-secondary border border-subtle hover:bg-bg-raised'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg text-sm font-medium transition-colors ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  )
}
