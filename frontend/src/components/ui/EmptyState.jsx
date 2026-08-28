import { Inbox } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No hay datos disponibles',
  message,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 px-6 text-center ${className}`}>
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-bg-raised">
        <Icon className="w-6 h-6 text-text-tertiary" />
      </div>
      <h3 className="text-sm font-bold text-text-primary">{title}</h3>
      {message && <p className="text-xs text-text-secondary max-w-xs">{message}</p>}
    </div>
  )
}
