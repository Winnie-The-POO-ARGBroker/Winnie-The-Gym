import { useState } from 'react'
import { Users, Plus, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import StaffFormModal from '../../components/admin/StaffFormModal'
import { useStaffList, useResendActivation } from '../../hooks/queries/useStaff'

const ROL_LABELS = {
  administrador: 'Administrador',
  recepcionista: 'Recepcionista',
}

function StatusBadge({ isActive, hasUsablePassword }) {
  if (isActive && hasUsablePassword) {
    return (
      <Badge variant="success">
        <CheckCircle2 className="w-3 h-3" />
        Activo
      </Badge>
    )
  }
  return (
    <Badge variant="warning">
      <Clock className="w-3 h-3" />
      Pendiente activación
    </Badge>
  )
}

export default function AdminUsuariosPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data: staffList, isLoading } = useStaffList()
  const resendMutation = useResendActivation()

  const staff = Array.isArray(staffList)
    ? staffList
    : staffList?.results ?? []

  return (
    <AppLayout>
      <TopBar
        title="Gestión de usuarios"
        icon={<Users className="w-5 h-5" />}
        actions={
          <Button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear staff
          </Button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="text-text-secondary text-sm">Cargando usuarios...</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No hay usuarios staff registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-subtle">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle bg-bg-raised text-text-secondary">
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Rol</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-subtle last:border-0 hover:bg-bg-raised/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text-primary font-medium">
                      {member.email}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {[member.first_name, member.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-text-secondary">
                        {ROL_LABELS[member.rol] ?? member.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={member.is_active} hasUsablePassword={true} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resendMutation.mutate(member.id)}
                        disabled={resendMutation.isPending}
                        title="Reenviar email de activación"
                        className="flex items-center gap-1.5 ml-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reenviar activación
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StaffFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </AppLayout>
  )
}
