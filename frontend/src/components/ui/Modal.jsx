import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Accessible, reusable modal component.
 * Supports three mobile variants: 'center' (default), 'sheet' (bottom sheet), 'fullscreen'.
 *
 * WCAG: role="dialog", aria-modal="true", Escape closes, full focus trap (Tab/Shift+Tab cycles).
 * Scroll lock: body overflow hidden while open.
 * Footer: fixed-position action area when mobileVariant='sheet' or 'fullscreen'.
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen
 * @param {function} props.onClose
 * @param {string}   [props.title]
 * @param {string}   [props.description]
 * @param {ReactNode}[props.icon]
 * @param {string}   [props.maxWidth='max-w-lg']
 * @param {'center'|'sheet'|'fullscreen'} [props.mobileVariant='center']
 * @param {ReactNode}[props.footer]   — rendered in fixed footer area (sheet/fullscreen only)
 * @param {ReactNode}props.children
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  maxWidth = 'max-w-lg',
  mobileVariant = 'center',
  footer,
  children,
}) {
  const modalRef = useRef(null)
  const openerRef = useRef(null)
  const uid = useId()
  const titleId = `modal-title-${uid}`
  const descId = `modal-desc-${uid}`

  // Capture the opener element and restore focus on close
  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement
    } else {
      const opener = openerRef.current
      if (opener && typeof opener.focus === 'function') {
        // Defer so the DOM has time to unmount the modal first
        requestAnimationFrame(() => opener.focus())
      }
      openerRef.current = null
    }
  }, [isOpen])

  // Scroll lock: freeze body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // ESC closes + full focus trap (Tab / Shift+Tab cycle within modal)
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.closest('[aria-hidden="true"]'))

        if (focusable.length === 0) {
          e.preventDefault()
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Auto-focus first focusable element on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length > 0) {
        focusable[0].focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // --- Variant: sheet (bottom sheet) ---
  if (mobileVariant === 'sheet') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
          className={`w-full md:${maxWidth} bg-bg-surface border border-subtle rounded-t-2xl md:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 md:fade-in md:zoom-in-95 duration-200 flex flex-col max-h-[90dvh]`}
        >
          {/* Drag handle (mobile visual cue) */}
          <div className="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-border-strong/40" />
          </div>

          {/* Header */}
          {(title || icon) && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-subtle flex-shrink-0">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
                    {icon}
                  </div>
                )}
                <div>
                  {title && (
                    <h3 id={titleId} className="text-lg font-bold text-text-primary">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p id={descId} className="text-xs text-text-secondary">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 outline-none"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>

          {/* Fixed footer */}
          {footer && (
            <div className="flex-shrink-0 px-5 py-4 border-t border-subtle bg-bg-surface">
              {footer}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Variant: fullscreen ---
  if (mobileVariant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg-surface md:items-center md:justify-center md:bg-black/60 md:backdrop-blur-sm">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
          className={`w-full h-full md:h-auto md:${maxWidth} md:rounded-2xl md:border md:border-subtle md:shadow-2xl md:animate-in md:fade-in md:zoom-in-95 md:duration-150 bg-bg-surface flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-subtle flex-shrink-0">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h3 id={titleId} className="text-lg font-bold text-text-primary">
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
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 outline-none"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>

          {/* Fixed footer */}
          {footer && (
            <div className="flex-shrink-0 px-5 py-4 border-t border-subtle bg-bg-surface">
              {footer}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Variant: center (default) ---
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
                  <h3 id={titleId} className="text-lg font-bold text-text-primary">
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
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 outline-none"
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
