import { forwardRef, useId } from 'react'

const Input = forwardRef(function Input(
  {
    label,
    icon: Icon,
    className = '',
    id: idProp,
    inputMode,
    enterKeyHint,
    autoComplete,
    maxLength,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const id = idProp ?? generatedId

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
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-text-tertiary" />
          </div>
        )}
        <input
          ref={ref}
          id={id}
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={`w-full bg-bg-base border border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:ring-1 focus:ring-primary focus:border-primary focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors text-base md:text-sm min-h-11 py-2 ${
            Icon ? 'pl-10' : 'pl-3'
          } pr-3`}
          {...props}
        />
      </div>
    </div>
  )
})

export default Input
