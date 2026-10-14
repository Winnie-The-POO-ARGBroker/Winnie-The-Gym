import { useState } from 'react'
import { Plus, Edit2, Trash2, PowerOff, CalendarOff } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import FilterButton from '../../components/ui/FilterButton'
import DisciplinaFormModal from '../../components/admin/DisciplinaFormModal'
import SalaFormModal from '../../components/admin/SalaFormModal'
import InstructorFormModal from '../../components/admin/InstructorFormModal'
import CierreFormModal from '../../components/admin/CierreFormModal'
import {
  useDisciplinas,
  useCreateDisciplina,
  useUpdateDisciplina,
  useDeleteDisciplina,
  useDesactivarDisciplina,
  useSalas,
  useCreateSala,
  useUpdateSala,
  useDeleteSala,
  useDesactivarSala,
} from '../../hooks/queries/useCatalogo'
import {
  useInstructores,
  useCreateInstructor,
  useUpdateInstructor,
  useDeleteInstructor,
  useDesactivarInstructor,
} from '../../hooks/queries/useInstructores'
import {
  useCierres,
  useCreateCierre,
  useUpdateCierre,
  useDeleteCierre,
} from '../../hooks/queries/useCierres'
import useAuthStore from '../../stores/authStore'

// ─── Disciplinas sub-tab ──────────────────────────────────────────────────────

function DisciplinasTab() {
  const { data: disciplinas = [], isPending: loading } = useDisciplinas()
  const crear = useCreateDisciplina()
  const actualizar = useUpdateDisciplina()
  const eliminar = useDeleteDisciplina()
  const desactivar = useDesactivarDisciplina()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // id

  const handleSave = async (payload) => {
    try {
      if (editTarget) {
        await actualizar.mutateAsync({ id: editTarget.id, data: payload })
        toast.success('Disciplina actualizada.')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Disciplina creada.')
      }
      setModalOpen(false)
      setEditTarget(null)
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Error al guardar la disciplina.'
      toast.error(msg)
    }
  }

  const handleDelete = async (id) => {
    try {
      await eliminar.mutateAsync(id)
      toast.success('Disciplina eliminada.')
    } catch (err) {
      // Backend returns 409 when discipline is in use — offer to deactivate
      if (err?.response?.status === 409 || err?.response?.status === 400) {
        toast.error('La disciplina está en uso. ¿Querés desactivarla?', {
          action: {
            label: 'Desactivar',
            onClick: () => handleDesactivar(id),
          },
          duration: 8000,
        })
      } else {
        toast.error(err?.response?.data?.detail ?? 'No se pudo eliminar.')
      }
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleDesactivar = async (id) => {
    try {
      await desactivar.mutateAsync(id)
      toast.success('Disciplina desactivada.')
    } catch {
      toast.error('No se pudo desactivar la disciplina.')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">{disciplinas.length} disciplinas registradas</p>
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5"
          onClick={() => { setEditTarget(null); setModalOpen(true) }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva disciplina
        </Button>
      </div>

      {disciplinas.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-8">No hay disciplinas creadas aún.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {disciplinas.map((d) => (
            <Card key={d.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: d.color_hex ?? '#f97316' }}
                />
                <div>
                  <span className="text-sm font-semibold text-text-primary">{d.nombre}</span>
                  {d.slug && (
                    <span className="ml-2 text-xs font-mono text-text-tertiary">{d.slug}</span>
                  )}
                </div>
                {!d.activa && <Badge variant="neutral">Inactiva</Badge>}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setEditTarget(d); setModalOpen(true) }}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-bg-raised transition-colors"
                  aria-label="Editar disciplina"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {d.activa && (
                  <button
                    type="button"
                    onClick={() => handleDesactivar(d.id)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-warning-500 hover:bg-bg-raised transition-colors"
                    aria-label="Desactivar disciplina"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(d.id)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-error-500 hover:bg-bg-raised transition-colors"
                  aria-label="Eliminar disciplina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete !== null && (
        <div className="mt-4 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex flex-col gap-3">
          <p className="text-sm text-error-500 font-semibold">
            ¿Confirmar eliminación de esta disciplina?
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              size="sm"
              className="bg-error-500 hover:bg-error-600 text-white"
              onClick={() => handleDelete(confirmDelete)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <DisciplinaFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSave={handleSave}
        disciplinaToEdit={editTarget}
      />
    </>
  )
}

// ─── Salas sub-tab ────────────────────────────────────────────────────────────

function SalasTab() {
  const { data: salas = [], isPending: loading } = useSalas()
  const crear = useCreateSala()
  const actualizar = useUpdateSala()
  const eliminar = useDeleteSala()
  const desactivar = useDesactivarSala()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleSave = async (payload) => {
    try {
      if (editTarget) {
        await actualizar.mutateAsync({ id: editTarget.id, data: payload })
        toast.success('Sala actualizada.')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Sala creada.')
      }
      setModalOpen(false)
      setEditTarget(null)
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Error al guardar la sala.'
      toast.error(msg)
    }
  }

  const handleDelete = async (id) => {
    try {
      await eliminar.mutateAsync(id)
      toast.success('Sala eliminada.')
    } catch (err) {
      if (err?.response?.status === 409 || err?.response?.status === 400) {
        toast.error('La sala está en uso. ¿Querés desactivarla?', {
          action: {
            label: 'Desactivar',
            onClick: () => handleDesactivar(id),
          },
          duration: 8000,
        })
      } else {
        toast.error(err?.response?.data?.detail ?? 'No se pudo eliminar.')
      }
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleDesactivar = async (id) => {
    try {
      await desactivar.mutateAsync(id)
      toast.success('Sala desactivada.')
    } catch {
      toast.error('No se pudo desactivar la sala.')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">{salas.length} salas registradas</p>
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5"
          onClick={() => { setEditTarget(null); setModalOpen(true) }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva sala
        </Button>
      </div>

      {salas.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-8">No hay salas creadas aún.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {salas.map((s) => (
            <Card key={s.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-sm font-semibold text-text-primary">{s.nombre}</span>
                  <span className="ml-2 text-xs text-text-tertiary">Capacidad: {s.capacidad}</span>
                </div>
                {!s.activa && <Badge variant="neutral">Inactiva</Badge>}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setEditTarget(s); setModalOpen(true) }}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-bg-raised transition-colors"
                  aria-label="Editar sala"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {s.activa && (
                  <button
                    type="button"
                    onClick={() => handleDesactivar(s.id)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-warning-500 hover:bg-bg-raised transition-colors"
                    aria-label="Desactivar sala"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(s.id)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-error-500 hover:bg-bg-raised transition-colors"
                  aria-label="Eliminar sala"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {confirmDelete !== null && (
        <div className="mt-4 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex flex-col gap-3">
          <p className="text-sm text-error-500 font-semibold">
            ¿Confirmar eliminación de esta sala?
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              size="sm"
              className="bg-error-500 hover:bg-error-600 text-white"
              onClick={() => handleDelete(confirmDelete)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <SalaFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSave={handleSave}
        salaToEdit={editTarget}
      />
    </>
  )
}

// ─── Instructores sub-tab ─────────────────────────────────────────────────────

function InstructoresTab({ isAdmin }) {
  const { data: instructores = [], isPending: loading } = useInstructores()
  const crear = useCreateInstructor()
  const actualizar = useUpdateInstructor()
  const eliminar = useDeleteInstructor()
  const desactivar = useDesactivarInstructor()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleSave = async (payload) => {
    try {
      if (editTarget) {
        await actualizar.mutateAsync({ id: editTarget.id, data: payload })
      } else {
        await crear.mutateAsync(payload)
      }
      setModalOpen(false)
      setEditTarget(null)
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Error al guardar el instructor.'
      toast.error(msg)
    }
  }

  const handleDelete = async (id) => {
    try {
      await eliminar.mutateAsync(id)
    } catch (err) {
      if (err?.response?.status === 409 || err?.response?.status === 400) {
        toast.error('El instructor tiene clases asignadas. ¿Querés desactivarlo?', {
          action: {
            label: 'Desactivar',
            onClick: () => handleDesactivar(id),
          },
          duration: 8000,
        })
      } else {
        toast.error(err?.response?.data?.detail ?? 'No se pudo eliminar.')
      }
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleDesactivar = async (id) => {
    try {
      await desactivar.mutateAsync(id)
    } catch {
      toast.error('No se pudo desactivar el instructor.')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">{instructores.length} instructores registrados</p>
        {isAdmin && (
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => { setEditTarget(null); setModalOpen(true) }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo instructor
          </Button>
        )}
      </div>

      {instructores.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-8">No hay instructores registrados aún.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {instructores.map((inst) => (
            <Card key={inst.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-text-primary">
                  {inst.nombre} {inst.apellido}
                </span>
                {inst.email && (
                  <span className="text-xs text-text-tertiary">{inst.email}</span>
                )}
                {inst.especialidades?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {inst.especialidades.map((esp) => (
                      <span
                        key={esp}
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20"
                      >
                        {esp}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!inst.activo && <Badge variant="neutral">Inactivo</Badge>}
                {isAdmin && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setEditTarget(inst); setModalOpen(true) }}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-bg-raised transition-colors"
                      aria-label="Editar instructor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {inst.activo && (
                      <button
                        type="button"
                        onClick={() => handleDesactivar(inst.id)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-warning-500 hover:bg-bg-raised transition-colors"
                        aria-label="Desactivar instructor"
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(inst.id)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-error-500 hover:bg-bg-raised transition-colors"
                      aria-label="Eliminar instructor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {confirmDelete !== null && (
        <div className="mt-4 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex flex-col gap-3">
          <p className="text-sm text-error-500 font-semibold">
            ¿Confirmar eliminacion de este instructor?
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              size="sm"
              className="bg-error-500 hover:bg-error-600 text-white"
              onClick={() => handleDelete(confirmDelete)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <InstructorFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSave={handleSave}
        instructorToEdit={editTarget}
        isAdmin={isAdmin}
      />
    </>
  )
}

// ─── Feriados y cierres sub-tab ───────────────────────────────────────────────

const AFECTA_LABEL = { todo: 'Todo el gym', sala: 'Una sala' }

function CierresTab() {
  const { data: cierres = [], isPending: loading } = useCierres()
  const crear = useCreateCierre()
  const actualizar = useUpdateCierre()
  const eliminar = useDeleteCierre()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleSave = async (payload) => {
    try {
      if (editTarget) {
        await actualizar.mutateAsync({ id: editTarget.id, data: payload })
        toast.success('Cierre actualizado.')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Cierre creado.')
      }
      setModalOpen(false)
      setEditTarget(null)
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Error al guardar el cierre.'
      toast.error(msg)
    }
  }

  const handleDelete = async (id) => {
    try {
      await eliminar.mutateAsync(id)
      toast.success('Cierre eliminado.')
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'No se pudo eliminar el cierre.')
    } finally {
      setConfirmDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">{cierres.length} cierres registrados</p>
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5"
          onClick={() => { setEditTarget(null); setModalOpen(true) }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo cierre
        </Button>
      </div>

      {cierres.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CalendarOff className="w-8 h-8 text-text-tertiary" />
          <p className="text-sm text-text-tertiary">No hay cierres o feriados registrados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cierres.map((c) => (
            <Card key={c.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-text-primary">{c.motivo}</span>
                <span className="text-xs text-text-tertiary">
                  {c.fecha_desde === c.fecha_hasta
                    ? c.fecha_desde
                    : `${c.fecha_desde} → ${c.fecha_hasta}`}
                </span>
                <Badge variant="neutral" className="self-start mt-1">
                  {AFECTA_LABEL[c.afecta] ?? c.afecta}
                </Badge>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setEditTarget(c); setModalOpen(true) }}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-bg-raised transition-colors"
                  aria-label="Editar cierre"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(c.id)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-error-500 hover:bg-bg-raised transition-colors"
                  aria-label="Eliminar cierre"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {confirmDelete !== null && (
        <div className="mt-4 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex flex-col gap-3">
          <p className="text-sm text-error-500 font-semibold">
            ¿Confirmar eliminación de este cierre?
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              size="sm"
              className="bg-error-500 hover:bg-error-600 text-white"
              onClick={() => handleDelete(confirmDelete)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <CierreFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSave={handleSave}
        cierreToEdit={editTarget}
      />
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SUB_TABS = [
  { key: 'disciplinas', label: 'Disciplinas' },
  { key: 'salas', label: 'Salas' },
  { key: 'instructores', label: 'Instructores' },
  { key: 'feriados', label: 'Feriados y cierres' },
]

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState('disciplinas')
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.rol === 'administrador'

  return (
    <AppLayout>
      <TopBar
        title="Configuración — Clases"
        subtitle="Gestión de disciplinas y salas del gimnasio"
        backAction={{ to: '/admin/configuracion' }}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            {SUB_TABS.map((t) => (
              <FilterButton
                key={t.key}
                active={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                size="md"
              >
                {t.label}
              </FilterButton>
            ))}
          </div>

          {/* Content */}
          <div className="rounded-2xl p-6 bg-bg-surface border border-subtle">
            {activeTab === 'disciplinas' && <DisciplinasTab />}
            {activeTab === 'salas' && <SalasTab />}
            {activeTab === 'instructores' && <InstructoresTab isAdmin={isAdmin} />}
            {activeTab === 'feriados' && <CierresTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
