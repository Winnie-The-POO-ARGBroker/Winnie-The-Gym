/**
 * Named size aliases for Avatar.
 * Accepts either a string alias (xs | sm | md | lg | xl) or a numeric pixel value.
 */
const SIZE_MAP = { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 }

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Avatar component.
 *
 * @param {object}          props
 * @param {string}          props.name - Full name used for initials fallback.
 * @param {string}          [props.src] - Optional image URL; renders an <img> when provided.
 * @param {number|string}   [props.size=36] - Pixel dimension OR a named alias
 *                          (xs=20, sm=28, md=36, lg=48, xl=64).
 */
export default function Avatar({ name, src, size = 36 }) {
  const px = typeof size === 'string' ? (SIZE_MAP[size] ?? 36) : size

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: px, height: px }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-text-primary font-semibold flex-shrink-0"
      style={{
        width: px,
        height: px,
        backgroundColor: 'var(--color-bg-raised)',
        fontSize: px * 0.35,
      }}
    >
      {getInitials(name)}
    </div>
  )
}
