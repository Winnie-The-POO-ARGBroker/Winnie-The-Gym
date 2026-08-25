export default function MembershipExpiredAlert({ fechaVencimiento }) {
  return (
    <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/30 flex items-start gap-2.5">
      <div className="text-error-500 shrink-0 mt-0.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      </div>
      <div className="flex-1">
        <span className="text-[11px] font-bold text-error-500 uppercase tracking-wide block">
          Membresía Vencida
        </span>
        <span className="text-[11px] text-text-secondary leading-tight block mt-0.5">
          Tu plan venció el {fechaVencimiento}. Acercate a recepción para renovar.
        </span>
      </div>
    </div>
  )
}
