export default function Input({ label, icon: Icon, className = '', ...props }) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-text-tertiary" />
          </div>
        )}
        <input
          className={`w-full bg-bg-base border border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors py-2 ${Icon ? 'pl-10' : 'pl-3'} pr-3`}
          {...props}
        />
      </div>
    </div>
  )
}
