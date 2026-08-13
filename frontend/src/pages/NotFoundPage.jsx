import { useNavigate } from 'react-router-dom'
import WinnieLogo from '../components/ui/WinnieLogo'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center bg-bg-base">
      <WinnieLogo size="md" />

      <div className="flex flex-col gap-3">
        <p className="text-8xl font-black text-orange-500" style={{ letterSpacing: '-4px' }}>
          404
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Página no encontrada</h1>
        <p className="text-sm max-w-xs text-text-secondary">
          La página que buscás no existe o fue movida.
        </p>
      </div>

      <Button variant="primary" onClick={() => navigate('/dashboard')}>
        Volver al dashboard
      </Button>
    </div>
  )
}
