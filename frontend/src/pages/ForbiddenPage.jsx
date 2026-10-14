import { useNavigate } from 'react-router-dom'

/**
 * ForbiddenPage — shown when the user does not have permission to access a resource (HTTP 403).
 */
export default function ForbiddenPage() {
  const navigate = useNavigate()

  function handleGoBack() {
    navigate(-1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base px-6">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <span className="text-6xl font-bold text-text-secondary">403</span>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-text-primary">Sin permisos</h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            No tenés autorización para acceder a esta sección. Si creés que es un error, contactá a un administrador.
          </p>
        </div>

        <button
          onClick={handleGoBack}
          className="w-full rounded-xl py-3 px-4 font-semibold bg-bg-surface text-text-primary transition-opacity hover:opacity-80"
        >
          Volver
        </button>
      </div>
    </div>
  )
}
