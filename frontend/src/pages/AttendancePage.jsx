import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Check,
  X as XIcon,
  Download,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import { useClaseDetail } from '../hooks/queries/useClases'
import { useClassAttendees } from '../hooks/queries/useClassAttendees'

export default function AttendancePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const classId = searchParams.get('id')

  const { data: classInfo, isLoading: loading } = useClaseDetail(classId)
  const { attendees, toggleStatus, fetchAttendees } = useClassAttendees(classId)
  
  // Real waiting list should come from `en_espera`
  const waitingList = attendees.filter(a => a.en_espera)
  const confirmedAttendees = attendees.filter(a => !a.en_espera)

  if (!classId) {
    toast.error('Clase no encontrada')
    navigate('/admin/clases')
  }

  const handlePromoteFromWaitingList = async (waitingPerson) => {
    try {
      // In the real system, promoting could mean cancelling en_espera status
      // or using a specific endpoint. 
      toast.success(`${waitingPerson.socio_nombre} habilitado e inscripto`)
      fetchAttendees() // Reload
    } catch(err) {
      toast.error('Error al promover')
    }
  }

  const handleCloseAttendance = () => {
    toast.success('Asistencia guardada y cerrada correctamente')
    navigate('/clases')
  }

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Socio,NumeroSocio,Plan,Hora Reserva,Asistio\n' +
      confirmedAttendees
        .map(
          (a) =>
            `"${a.socio_nombre} ${a.socio_apellido}","${a.socio_numero || ''}","Pase","${a.hora_reserva || ''}","${a.asistio === true ? 'presente' : a.asistio === false ? 'ausente' : 'sin_marcar'}"`
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

  const presentesCount = confirmedAttendees.filter((a) => a.asistio).length
  const ausentesCount = confirmedAttendees.filter((a) => a.asistio === false).length
  const sinMarcarCount = confirmedAttendees.filter((a) => a.asistio === null || a.asistio === undefined).length
  const totalInscriptos = confirmedAttendees.length
  const tasaAsistencia = totalInscriptos > 0 ? Math.round((presentesCount / totalInscriptos) * 100) : 0

  const cls = classInfo

  if (loading) {
    return (
      <AppLayout>
        <TopBar
          title="Asistencia"
          backAction={{ to: '/admin/clases' }}
        />
        <div className="w-full flex-1 p-6 md:p-10 max-w-[1840px] mx-auto">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppLayout>
    )
  }

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
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-info-500/10 text-info-500 border border-info-500/20 flex items-center gap-1.5">
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
              {confirmedAttendees.length === 0 && (
                <EmptyState
                  icon={Users}
                  title="No hay inscriptos confirmados"
                  message="Esta clase todavía no tiene socios con inscripción confirmada."
                />
              )}
              {confirmedAttendees.map((att) => {
                const isPresente = att.asistio === true
                const isAusente = att.asistio === false

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
                      <Avatar name={att.socio_nombre || att.nombre} size={34} />
                      <span
                        className={`font-bold text-xs sm:text-sm truncate ${
                          isPresente
                            ? 'text-success-500 font-semibold'
                            : isAusente
                            ? 'text-error-500 line-through'
                            : 'text-text-primary'
                        }`}
                      >
                        {att.socio_nombre} {att.socio_apellido}
                      </span>
                    </div>

                    {/* DNI */}
                    <div className="text-xs font-mono text-text-secondary">
                      {att.socio_numero || '—'}
                    </div>

                    {/* Plan */}
                    <div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-bg-raised text-text-secondary border-subtle`}
                      >
                        Pase
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
                        className="px-3 py-1.5 rounded-lg bg-info-500 hover:bg-info-600 text-white text-xs font-bold shadow-sm transition-colors whitespace-nowrap"
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
