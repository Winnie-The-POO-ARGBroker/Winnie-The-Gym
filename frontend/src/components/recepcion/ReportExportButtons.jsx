import { FileText, FileSpreadsheet, FileCode, Loader2 } from 'lucide-react'
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
        disabled={disabled || isBusy}
        onClick={() => onExport?.('pdf')}
        className="flex items-center gap-2 font-semibold shadow-sm"
      >
        {downloadingFormat === 'pdf' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        <span>Exportar PDF</span>
      </Button>

      {/* Botón Excel (XLSX) */}
      <Button
        variant="secondary"
        size="md"
        disabled={disabled || isBusy}
        onClick={() => onExport?.('xlsx')}
        className="flex items-center gap-2 hover:border-success-500 hover:text-success-500 transition-colors"
      >
        {downloadingFormat === 'xlsx' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4 text-success-500" />
        )}
        <span>Exportar Excel</span>
      </Button>

      {/* Botón CSV */}
      <Button
        variant="secondary"
        size="md"
        disabled={disabled || isBusy}
        onClick={() => onExport?.('csv')}
        className="flex items-center gap-2 hover:border-primary hover:text-primary transition-colors"
      >
        {downloadingFormat === 'csv' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileCode className="w-4 h-4 text-text-secondary" />
        )}
        <span>Exportar CSV</span>
      </Button>
    </div>
  )
}
