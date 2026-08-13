export default function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  color = '#4CAF50',
  label,
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)
  const cx = size / 2

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="var(--color-bg-raised)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-text-primary">{Math.round(pct * 100)}%</p>
        {label && (
          <p className="text-xs font-medium text-text-secondary">{label}</p>
        )}
      </div>
    </div>
  )
}
