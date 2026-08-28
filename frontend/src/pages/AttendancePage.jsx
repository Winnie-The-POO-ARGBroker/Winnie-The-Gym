import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Check,
  X as XIcon,
  Download,
  Users,
  Clock,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import {
  getClassById,
  saveStoredAttendees,
} from '../services/adminMockData'
import { useClassAttendees } from '../hooks/useClassAttendees'

const IS_DEV = import.meta.env.DEV

export default function AttendancePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const classId = searchParams.get('id') || 'cls_funcional_1'

  const [classInfo, setClassInfo] = useState(() => IS_DEV ? getClassById(classId) : null)
  const { attendees, toggleStatus } = useClassAttendees(classId)
  const [waitingList, setWaitingList] = useState([
    { id: 'w_1', nombre: 'Iris Navarro', dni: '34.555.666', plan: 'Premium' },
    { id: 'w_2', nombre: 'Javier Benítez', dni: '36.777.888', plan: 'Gold' },
    { id: 'w_3', nombre: 'Karina Flores', dni: '32.111.444', plan: 'Premium' },
  ])

  useEffect(() => {
    if (IS_DEV) {
      const cls = getClassById(classId)
      if (cls) setClassInfo(cls)
    }
  }, [classId])

  const handlePromoteFromWaitingList = (waitingPerson) => {
    const newAttendee = {
      id: `att_${Date.now()}`,
      socio_id: `SOC-${Date.now().toString().slice(-4)}`,
      nombre: waitingPerson.nombre,
      dni: waitingPerson.dni,
      plan: waitingPerson.plan,
      hora_reserva: 'Ahora (Habilitado)',
      estado: 'presente',
    }
    const updatedWaiting = waitingList.filter((w) => w.id !== waitingPerson.id)
    setWaitingList(updatedWaiting)
    saveStoredAttendees(classId, [...attendees, newAttendee])
    toast.success(`${waitingPerson.nombre} habilitado e inscripto como presente`)
  }

  const handleCloseAttendance = () => {
    saveStoredAttendees(classId, attendees)
    toast.success('Asistencia guardada y cerrada correctamente')
    navigate('/clases')
  }

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Socio,DNI,Plan,Hora Reserva,Estado\n' +
      attendees
        .map(
          (a) =>
            `"${a.nombre}","${a.dni || ''}","${a.plan || ''}","${a.hora_reserva || ''}","${a.estado || 'sin_marcar'}"`
        )
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `asistencia_${classId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Archivo CSV exportado exitosamente')
  }

  const presentesCount = attendees.filter((a) => a.estado === 'presente').length
  const ausentesCount = attendees.filter((a) => a.estado === 'ausente').length
  const sinMarcarCount = attendees.filter((a) => a.estado === 'sin_marcar' || !a.estado).length
  const totalInscriptos = attendees.length
  const tasaAsistencia = totalInscriptos > 0 ? Math.round((presentesCount / totalInscriptos) * 100) : 0

  const cls = classInfo

  return (
    <AppLayout>
      <TopBar
        title={`Asistencia — ${cls?.nombre ?? 'Clase Grupal'}`}
        subtitle={`${cls?.dia ?? ''} · ${cls?.hora ?? ''} · ${cls?.sala ?? ''}`}
        backAction={{ to: '/admin/clases' }}
        rightContent={
          <>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-surface border border-subtle text-text-primary hover:bg-bg-raised text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4 text-text-secondary" />
              Exportar
            </button>
            <Button
              variant="primary"
              onClick={handleCloseAttendance}
              className="gap-2 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              Cerrar asistencia
            </Button>
          </>
        }
      />
      <div className="w-full flex-1 flex flex-col p-6 md:p-10 gap-7 overflow-y-auto max-w-[1840px] mx-auto transition-all animate-fadeIn">

        {/* Content Layout */}
        <div className="flex flex-col xl:flex-row gap-8">

          {/* MAIN ATTENDANCE TABLE AREA (Left - flex-1) */}
          <div className="flex-1 bg-bg-surface rounded-2xl border border-subtle overflow-hidden shadow-sm flex flex-col">

            {/* Table Control & Stats Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-subtle bg-bg-raised/40">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-text-primary">
                  Inscriptos
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {totalInscriptos} / {cls?.cupo_maximo || 20}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl font-bold bg-success-500/10 text-success-500 border border-success-500/20 flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" /> {presentesCount} presentes
                </span>
                <span className="px-3 py-1 rounded-xl font-bold bg-error-500/10 text-error-500 border border-error-500/20 flex items-center gap-1">
                  <XIcon className="w-3 h-3 stroke-[3]" /> {ausentesCount} ausentes
                </span>
                <span className="px-3 py-1 rounded-xl font-medium bg-bg-raised text-text-secondary border border-subtle">
                  {sinMarcarCount} sin marcar
                </span>
              </div>
            </div>

            {/* Table Columns Title */}
            <div className="grid grid-cols-[3fr_2fr_2fr_220px] gap-4 p-4 text-xs font-bold text-text-tertiary uppercase tracking-wider border-b border-subtle/60 bg-bg-raised/10">
              <div className="pl-4">SOCIO</div>
              <div>DNI</div>
              <div>PLAN</div>
              <div className="text-center">ASISTENCIA</div>
            </div>

            {/* Attendees Rows */}
            <div className="divide-y divide-subtle p-2 space-y-1">
              {!IS_DEV && attendees.length === 0 && (
                <EmptyState
                  icon={Users}
                  title="No hay inscriptos"
                  message="Esta clase todavía no tiene socios anotados."
                />
              )}
              {attendees.map((att) => {
                const isPresente = att.estado === 'presente'
                const isAusente = att.estado === 'ausente'

                return (
                  <div
                    key={att.id}
                    className={`grid grid-cols-[3fr_2fr_2fr_220px] gap-4 items-center p-3 rounded-xl transition-colors ${
                      isPresente
                        ? 'bg-success-500/5'
                        : isAusente
                        ? 'bg-error-500/5'
                        : 'hover:bg-bg-raised/40'
                    }`}
                  >
                    {/* Member */}
                    <div className="flex items-center gap-3 pl-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isPresente ? 'bg-success-500' : isAusente ? 'bg-error-500' : 'bg-subtle'
                        }`}
                      />
                      <Avatar name={att.nombre} size={34} />
                      <span
                        className={`font-bold text-xs sm:text-sm truncate ${
                          isPresente
                            ? 'text-success-500 font-semibold'
                            : isAusente
                            ? 'text-error-500 line-through'
                            : 'text-text-primary'
                        }`}
                      >
                        {att.nombre}
                      </span>
                    </div>

                    {/* DNI */}
                    <div className="text-xs font-mono text-text-secondary">
                      {att.dni || '—'}
                    </div>

                    {/* Plan */}
                    <div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          att.plan === 'Premium'
                            ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                            : att.plan === 'Gold'
                            ? 'bg-warning-500/10 text-warning-500 border-warning-500/30'
                            : 'bg-bg-raised text-text-secondary border-subtle'
                        }`}
                      >
                        {att.plan}
                      </span>
                    </div>

                    {/* Asistencia Toggle Buttons */}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleStatus(att.id, 'presente')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isPresente
                            ? 'bg-success-500 text-white shadow-sm'
                            : 'bg-bg-raised border border-subtle text-text-secondary hover:text-text-primary hover:bg-success-500/20'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Presente
                      </button>

                      <button
                        onClick={() => toggleStatus(att.id, 'ausente')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isAusente
                            ? 'bg-error-500 text-white shadow-sm'
                            : 'bg-bg-raised border border-subtle text-text-secondary hover:text-text-primary hover:bg-error-500/20'
                        }`}
                      >
                        <XIcon className="w-3.5 h-3.5 stroke-[3]" />
                        Ausente
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR (xl:w-[340px]) */}
          <div className="w-full xl:w-[340px] flex flex-col gap-6">

            {/* Resumen de la clase */}
            <div className="bg-bg-surface rounded-2xl p-6 border border-subtle border-l-4 border-l-orange-500 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Resumen de la clase
              </h3>

              <div className="divide-y divide-subtle text-xs">
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-text-secondary">Inscriptos</span>
                  <span className="font-bold text-text-primary">
                    {totalInscriptos} / {cls?.cupo_maximo || 20}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <span className="text-text-secondary">Presentes</span>
                  <span className="font-bold text-success-500">{presentesCount}</span>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <span className="text-text-secondary">Ausentes</span>
                  <span className="font-bold text-error-500">{ausentesCount}</span>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <span className="text-text-secondary">Sin confirmar</span>
                  <span className="font-bold text-warning-500">{sinMarcarCount}</span>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <span className="text-text-secondary font-bold">Tasa de asistencia</span>
                  <span className="font-extrabold text-success-500">{tasaAsistencia}%</span>
                </div>
              </div>
            </div>

            {/* Lista de Espera */}
            <div className="bg-bg-surface rounded-2xl p-6 border border-subtle shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">
                  Lista de espera
                </h3>
                <span className="w-6 h-6 rounded-full bg-warning-500/10 text-warning-500 border border-warning-500/30 flex items-center justify-center text-xs font-bold">
                  {waitingList.length}
                </span>
              </div>

              <div className="divide-y divide-subtle">
                {waitingList.length === 0 ? (
                  <p className="text-xs text-text-secondary py-3">
                    No hay socios en lista de espera actualmente.
                  </p>
                ) : (
                  waitingList.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between gap-2 py-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={person.nombre} size={30} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">
                            {person.nombre}
                          </p>
                          <span className="text-[10px] text-text-tertiary">
                            {person.plan}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePromoteFromWaitingList(person)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition-colors whitespace-nowrap"
                      >
                        Habilitar
                      </button>
                    </div>
                  ))
                )}
              </div>

              <p className="text-[11px] text-text-tertiary italic pt-2 border-t border-subtle">
                <span className="text-orange-500 font-bold">※</span> Si hay ausencias, podés habilitar al siguiente en la lista de espera con un click.
              </p>
            </div>

            {/* Cerrar Asistencia Card */}
            <div className="bg-bg-surface rounded-2xl p-6 border border-subtle shadow-sm">
              <Button
                variant="primary"
                onClick={handleCloseAttendance}
                className="w-full gap-2 shadow-md shadow-orange-500/20 hover:scale-[1.01]"
              >
                <Check className="w-4 h-4" />
                Cerrar y guardar asistencia
              </Button>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
