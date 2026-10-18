import { useState } from 'react'
import { Plus, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import DataTable from '../../components/ui/DataTable'
import StaffFormModal from '../../components/admin/StaffFormModal'
import { useStaffList, useResendActivation } from '../../hooks/queries/useStaff'

const ROL_LABELS = {
  administrador: 'Administrador',
  recepcionista: 'Recepcionista',
}

function StatusBadge({ isActive, hasUsablePassword, hasSocialLogin }) {
  if (isActive && !hasUsablePassword && hasSocialLogin) {
    return (
      <Badge variant="success">
        <CheckCircle2 className="w-3 h-3" />
        Activo · Google
      </Badge>
    )
  }
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

const COLUMNS = [
  { key: 'email',    label: 'Email',   mobile: 'Email',   sortable: false },
  { key: 'nombre',   label: 'Nombre',  mobile: 'Nombre',  sortable: false,
    render: (row) => [row.first_name, row.last_name].filter(Boolean).join(' ') || '—' },
  { key: 'rol',      label: 'Rol',     mobile: 'Rol',     sortable: false,
    render: (row) => <span className="capitalize text-text-secondary">{ROL_LABELS[row.rol] ?? row.rol}</span> },
  { key: 'estado',   label: 'Estado',  mobile: 'Estado',  sortable: false,
    render: (row) => <StatusBadge isActive={row.is_active} hasUsablePassword={row.has_usable_password} hasSocialLogin={row.has_social_login} /> },
]

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
        actions={[
          {
            label: 'Crear staff',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setIsFormOpen(true),
          },
        ]}
      />

      <div className="p-4 md:p-6">
        <DataTable
          columns={COLUMNS}
          data={staff}
          loading={isLoading}
          mobileMode="cards"
          emptyTitle="Sin usuarios staff"
          emptyMessage="No hay usuarios staff registrados."
          renderActions={(member) =>
            !member.has_usable_password && !member.has_social_login ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resendMutation.mutate(member.id)}
                disabled={resendMutation.isPending}
                title="Reenviar email de activación"
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reenviar activación
              </Button>
            ) : null
          }
        />
      </div>

      <StaffFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </AppLayout>
  )
}
