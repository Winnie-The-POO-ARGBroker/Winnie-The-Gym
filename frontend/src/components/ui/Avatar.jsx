function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Avatar({ name, src, size = 36 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-text-primary font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: 'var(--color-bg-raised)',
        fontSize: size * 0.35,
      }}
    >
      {getInitials(name)}
    </div>
  )
}
