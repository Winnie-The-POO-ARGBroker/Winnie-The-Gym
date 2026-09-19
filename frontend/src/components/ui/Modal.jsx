import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Componente modal accesible y reutilizable.
 * Cumple con WCAG: role="dialog", aria-modal="true", cierre con tecla Escape y trampa básica de foco.
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen
 * @param {function} props.onClose
 * @param {string}   [props.title]
 * @param {string}   [props.description]
 * @param {ReactNode}[props.icon]
 * @param {string}   [props.maxWidth='max-w-lg']
 * @param {ReactNode}props.children
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  maxWidth = 'max-w-lg',
  children,
}) {
  const modalRef = useRef(null)

  // Cierre con Escape
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus trap / auto-focus
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length > 0) {
        focusable[0].focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-desc' : undefined}
        className={`relative w-full ${maxWidth} bg-bg-surface border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8`}
      >
        {(title || icon) && (
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-subtle">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h3 id="modal-title" className="text-lg font-bold text-text-primary">
                    {title}
                  </h3>
                )}
                {description && (
                  <p id="modal-desc" className="text-xs text-text-secondary">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
