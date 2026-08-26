import { useLocation } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'

const PAGE_LABELS = {
  '/socios':        { title: 'Socios',        subtitle: 'Gestión de socios del gimnasio' },
  '/membresias':    { title: 'Membresías',     subtitle: 'Planes y membresías activas' },
  '/clases':        { title: 'Clases',         subtitle: 'Gestión de clases y turnos' },
  '/reportes':      { title: 'Reportes',       subtitle: 'Estadísticas y reportes' },
  '/configuracion': { title: 'Configuración',  subtitle: 'Ajustes del sistema' },
}

export default function ComingSoonPage() {
  const { pathname } = useLocation()
  const meta = PAGE_LABELS[pathname] ?? { title: 'Sección', subtitle: '' }

  return (
    <AppLayout>
      <TopBar title={meta.title} subtitle={meta.subtitle} />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-raised">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff5a36" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-text-primary">Próximamente</h2>
          <p className="text-sm max-w-xs text-text-secondary">
            Esta sección está en desarrollo y estará disponible pronto.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
