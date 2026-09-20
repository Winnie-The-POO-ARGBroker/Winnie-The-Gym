import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import { FileCheck, FileText } from 'lucide-react'

/**
 * Definición centralizada de columnas para tablas de socios (Admin y Recepción).
 * Usa la propiedad `label` requerida por el componente DataTable.
 */
export function getSocioColumns() {
  return [
    {
      key: 'nombre',
      label: 'Socio',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={`${row.nombre || ''} ${row.apellido || ''}`.trim() || 'Socio'}
            size="sm"
          />
          <div>
            <div className="font-semibold text-text-primary">
              {row.nombre} {row.apellido}
            </div>
            <div className="text-xs text-text-secondary">
              Nº {row.numero_socio || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'dni',
      label: 'DNI',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.dni || '—'}
        </span>
      ),
    },
    {
      key: 'telefono',
      label: 'Teléfono',
      sortable: false,
      render: (row) => (
        <span className="text-xs text-text-secondary">
          {row.telefono || '—'}
        </span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      render: (row) => {
        const est = (row.estado || '').toLowerCase()
        if (est === 'activo') return <Badge variant="success">Activo</Badge>
        if (est === 'suspendido') return <Badge variant="warning">Suspendido</Badge>
        if (est === 'baja') return <Badge variant="danger">Baja</Badge>
        return <Badge variant="warning">{row.estado || '—'}</Badge>
      },
    },
    {
      key: 'certificado',
      label: 'Certificado Médico',
      sortable: false,
      render: (row) => {
        const tiene = !!row.certificado_medico_url
        return tiene ? (
          <a
            href={row.certificado_medico_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-success hover:underline font-medium transition-colors"
            title="Ver certificado médico"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Al día</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-error font-medium">
            <FileText className="w-3.5 h-3.5 opacity-60" />
            <span>Sin certificado</span>
          </span>
        )
      },
    },
    {
      key: 'created_at',
      label: 'Fecha Alta',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-text-secondary">
          {row.created_at
            ? new Date(row.created_at).toLocaleDateString('es-AR')
            : '—'}
        </span>
      ),
    },
  ]
}
