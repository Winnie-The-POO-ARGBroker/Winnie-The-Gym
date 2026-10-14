import { useNavigate } from 'react-router-dom'

/**
 * InternalErrorPage — shown by ErrorBoundary when an unhandled render error occurs (HTTP 500 equivalent).
 * Provides two recovery actions: reload the page or go back to home.
 */
export default function InternalErrorPage() {
  const navigate = useNavigate()

  function handleReload() {
    window.location.reload()
  }

  function handleGoHome() {
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base px-6">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <span className="text-6xl font-bold text-text-secondary">500</span>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-text-primary">Algo salió mal</h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Ocurrió un error inesperado. Podés intentar recargar la página o volver al inicio.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleReload}
            className="w-full rounded-xl py-3 px-4 font-semibold bg-brand-primary text-white transition-opacity hover:opacity-90"
          >
            Recargar
          </button>
          <button
            onClick={handleGoHome}
            className="w-full rounded-xl py-3 px-4 font-semibold bg-bg-surface text-text-primary transition-opacity hover:opacity-80"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
