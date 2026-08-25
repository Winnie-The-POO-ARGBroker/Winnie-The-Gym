import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import AforoCard from '../components/dashboard/AforoCard'
import MovementList from '../components/dashboard/MovementList'
import AlertList from '../components/dashboard/AlertList'
import ClassCapacityList from '../components/dashboard/ClassCapacityList'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

const MOCK_MOVEMENTS = [
  { id: 1, name: 'Carlos Pérez', membership: 'Mensual', time: '09:24', type: 'entry' },
  { id: 2, name: 'Laura Gómez', membership: 'Trimestral', time: '09:21', type: 'exit' },
  { id: 3, name: 'Martín Silva', membership: 'Mensual', time: '09:18', type: 'entry' },
  { id: 4, name: 'Valentina Cruz', membership: 'Anual', time: '09:15', type: 'exit' },
  { id: 5, name: 'Diego Ramírez', membership: 'Mensual', time: '09:10', type: 'entry' },
]

const MOCK_ALERTS = [
  { id: 1, name: 'Ana Torres', tag: 'Morosidad' },
  { id: 2, name: 'Luis Herrera', tag: 'Morosidad' },
  { id: 3, name: 'Sofía Medina', tag: 'Morosidad' },
  { id: 4, name: 'Pablo Ríos', tag: 'Morosidad' },
]

const MOCK_CLASSES = [
  { id: 1, name: 'Spinning Mañana', current: 20, max: 20 },
  { id: 2, name: 'Yoga Tarde', current: 17, max: 20 },
]


const MOCK_SOCIO_DATA = {
  plan: 'Pase Libre Full',
  expirationDate: '30 de septiembre, 2026',
  medicalCertificate: 'Al día (Vence Dic 2026)',
  monthlyAttendance: 14,
  upcomingClasses: [
    { id: 1, name: 'Spinning Intensivo', time: 'Hoy · 18:30 hs', instructor: 'Prof. Lucas' },
    { id: 2, name: 'Funcional Training', time: 'Mañana · 10:00 hs', instructor: 'Prof. Camila' },
  ],
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [currentRole, setCurrentRole] = useState(user?.rol || 'administrador')

  const displayName = user?.nombre
    ? `${user.nombre} ${user.apellido ?? ''}`.trim()
    : user?.email ?? 'Usuario'

  return (
    <AppLayout>
      <TopBar
        title="Dashboard"
        subtitle={`Resumen del día · ${displayName}`}
        showLive
        onScan={() => navigate('/recepcion/acceso')}
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">

        {/* 1. Selector de Rol para pruebas */}
        {import.meta.env.DEV && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-bg-surface border border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Vista activa:
              </span>
              <Badge variant="live">{currentRole.toUpperCase()}</Badge>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentRole('administrador')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentRole === 'administrador'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-bg-raised text-text-secondary hover:text-text-primary'
                  }`}
              >
                Administrador
              </button>
              <button
                onClick={() => setCurrentRole('recepcionista')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentRole === 'recepcionista'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-bg-raised text-text-secondary hover:text-text-primary'
                  }`}
              >
                Recepcionista
              </button>
              <button
                onClick={() => setCurrentRole('socio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentRole === 'socio'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-bg-raised text-text-secondary hover:text-text-primary'
                  }`}
              >
                Socio
              </button>
            </div>
          </div>
        )}

        {/* 2. VISTA ADMINISTRADOR */}
        {currentRole === 'administrador' && (
          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr minmax(0, 360px)' }}>
            <div className="flex flex-col gap-6">
              <AforoCard current={150} max={200} entries={232} exits={76} />
              <MovementList movements={MOCK_MOVEMENTS} />
            </div>

            <div className="flex flex-col gap-6">
              <AlertList alerts={MOCK_ALERTS} />
              <ClassCapacityList classes={MOCK_CLASSES} />
            </div>
          </div>
        )}

        {/* 3. VISTA RECEPCIONISTA */}
        {currentRole === 'recepcionista' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-4 shadow-sm">
                <div>
                  <h3 className="font-bold text-lg text-text-primary">Escanear Ingreso</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Validar QR digital de socio en menos de 2 segundos.
                  </p>
                </div>
                <Button variant="primary" onClick={() => navigate('/recepcion/acceso')}>
                  Abrir Terminal QR
                </Button>
              </div>

              <div className="p-5 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-4 shadow-sm">
                <div>
                  <h3 className="font-bold text-lg text-text-primary">Registrar Nuevo Socio</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Dar de alta cliente y adjuntar certificado médico.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/recepcion/socios')}>
                  Registrar Socio
                </Button>
              </div>

              <div className="p-5 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-4 shadow-sm">
                <div>
                  <h3 className="font-bold text-lg text-text-primary">Monitor de Aforo</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Control de ocupación y capacidad en vivo.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/recepcion/aforo')}>
                  Ver Monitor Completo
                </Button>
              </div>
            </div>

            <div className="grid gap-6" style={{ gridTemplateColumns: '1fr minmax(0, 360px)' }}>
              <AforoCard current={150} max={200} entries={232} exits={76} />
              <MovementList movements={MOCK_MOVEMENTS} />
            </div>
          </div>
        )}

        {/* 4. VISTA SOCIO */}
        {currentRole === 'socio' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <div className="p-6 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-text-secondary uppercase">
                    Mi Membresía
                  </span>
                  <h2 className="text-2xl font-bold text-text-primary mt-1">
                    {MOCK_SOCIO_DATA.plan}
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Vence el {MOCK_SOCIO_DATA.expirationDate}
                  </p>
                </div>
                <Badge variant="success">Al día</Badge>
              </div>

              <div className="p-4 rounded-xl bg-bg-raised border border-subtle flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary">Apto Médico</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {MOCK_SOCIO_DATA.medicalCertificate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">Asistencias este mes</p>
                  <p className="text-sm font-bold text-primary">
                    {MOCK_SOCIO_DATA.monthlyAttendance} días
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/socio/credencial')}
                className="w-full"
              >
                Ver Mi Credencial QR
              </Button>
            </div>

            <div className="p-6 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-6 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-text-primary">Mis Próximas Clases</h3>
                  <Badge variant="live">2 Reservadas</Badge>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Tu agenda confirmada de actividades.
                </p>

                <div className="flex flex-col gap-3 mt-4">
                  {MOCK_SOCIO_DATA.upcomingClasses.map((clase) => (
                    <div
                      key={clase.id}
                      className="p-3 rounded-xl bg-bg-raised border border-subtle flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-text-primary">{clase.name}</p>
                        <p className="text-xs text-text-secondary">{clase.instructor}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                        {clase.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/socio/clases')}
                className="w-full"
              >
                Reservar Nueva Clase
              </Button>
            </div>
          </div>
        )}

      </div>

    </AppLayout>
  )
}
