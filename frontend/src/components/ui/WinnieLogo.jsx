export default function WinnieLogo({ size = 'md' }) {
  const iconSize = size === 'sm' ? 32 : 40
  const textClass = size === 'sm' ? 'text-lg' : 'text-2xl'
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-xl bg-orange-500"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg width={iconSize * 0.6} height={iconSize * 0.6} viewBox="0 0 24 24" fill="white">
          <rect x="1" y="10" width="3" height="4" rx="1" />
          <rect x="20" y="10" width="3" height="4" rx="1" />
          <rect x="3" y="8" width="3" height="8" rx="1" />
          <rect x="18" y="8" width="3" height="8" rx="1" />
          <rect x="6" y="11" width="12" height="2" rx="1" />
        </svg>
      </div>
      <span className={`font-bold text-text-primary ${textClass}`}>Winnie.</span>
    </div>
  )
}
