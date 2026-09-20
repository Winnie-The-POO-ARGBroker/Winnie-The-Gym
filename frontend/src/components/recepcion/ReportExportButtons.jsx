import { FileText, FileSpreadsheet, FileCode } from 'lucide-react'
import Button from '../ui/Button'

export default function ReportExportButtons({
  onExport,
  downloadingFormat = null,
  disabled = false,
  className = '',
}) {
  const isBusy = Boolean(downloadingFormat)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Botón PDF */}
      <Button
        variant="primary"
        size="md"
        loading={downloadingFormat === 'pdf'}
        disabled={disabled || isBusy}
        onClick={() => onExport?.('pdf')}
        aria-label="Exportar PDF"
        className="flex items-center gap-2 font-semibold shadow-sm"
      >
        <FileText className="w-4 h-4" />
        <span>Exportar PDF</span>
      </Button>

      {/* Botón Excel (XLSX) */}
      <Button
        variant="secondary"
        size="md"
        loading={downloadingFormat === 'xlsx'}
        disabled={disabled || isBusy}
        onClick={() => onExport?.('xlsx')}
        aria-label="Exportar Excel"
        className="flex items-center gap-2 hover:border-success-500 hover:text-success-500 transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4 text-success-500" />
        <span>Exportar Excel</span>
      </Button>

      {/* Botón CSV */}
      <Button
        variant="secondary"
        size="md"
        loading={downloadingFormat === 'csv'}
        disabled={disabled || isBusy}
        onClick={() => onExport?.('csv')}
        aria-label="Exportar CSV"
        className="flex items-center gap-2 hover:border-primary hover:text-primary transition-colors"
      >
        <FileCode className="w-4 h-4 text-text-secondary" />
        <span>Exportar CSV</span>
      </Button>
    </div>
  )
}
