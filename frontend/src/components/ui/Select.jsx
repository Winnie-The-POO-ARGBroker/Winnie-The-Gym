export default function Select({ label, id, className = '', children, ...rest }) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary py-2.5 px-3 appearance-none"
          {...rest}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            className="h-4 w-4 text-text-tertiary"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
    </div>
  )
}
