export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-bg-surface border border-subtle rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}
