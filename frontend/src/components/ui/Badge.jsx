import { colors, withAlpha } from '../../styles/tokens'

// info uses the blue-500 token which maps to #1E88E5 (same as tailwind info-500)
const INFO_COLOR = '#1E88E5'

const variantStyles = {
  success: { backgroundColor: withAlpha(colors.success[500], 0.18), color: colors.success[500] },
  danger:  { backgroundColor: withAlpha(colors.error[500],   0.18), color: colors.error[500] },
  warning: { backgroundColor: withAlpha(colors.warning[500], 0.18), color: colors.warning[500] },
  neutral: { backgroundColor: withAlpha(colors.neutral[500], 0.14), color: colors.neutral[500] },
  info:    { backgroundColor: withAlpha(INFO_COLOR,           0.14), color: INFO_COLOR },
  live:    {
    backgroundColor: withAlpha(colors.success[500], 0.12),
    color: colors.success[500],
    border: `1px solid ${withAlpha(colors.success[500], 0.35)}`,
  },
}

export default function Badge({ variant = 'neutral', className, children }) {
  const s = variantStyles[variant] ?? variantStyles.neutral
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className || ''}`}
      style={{ backgroundColor: s.backgroundColor, color: s.color, border: s.border }}
    >
      {variant === 'live' && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: s.color }}
        />
      )}
      {children}
    </span>
  )
}
