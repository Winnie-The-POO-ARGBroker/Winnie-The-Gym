import { useLocation, useNavigate } from 'react-router-dom'
import { LinkIcon } from 'lucide-react'
import WinnieLogo from '../components/ui/WinnieLogo'
import Button from '../components/ui/Button'

export default function AuthActivationExpiredPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from

  // If the flow was activation, direct the user to login (and ask reception to resend)
  // If the flow was reset-password, direct to forgot-password to request a new link
  const ctaPath = from === 'activation' ? '/login' : '/forgot-password'
  const ctaLabel = 'Pedir un nuevo enlace'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-base px-6 gap-8">
      <WinnieLogo size="md" />

      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-warning-500/10 flex items-center justify-center">
          <LinkIcon className="w-8 h-8 text-warning-500" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-text-primary">
            Enlace inválido
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Este enlace ya no es válido o venció.
          </p>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate(ctaPath)}
        >
          {ctaLabel}
        </Button>

        {/* Back to login */}
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  )
}
