import { FileText, FileSpreadsheet, FileCode } from 'lucide-react';
import Card from '../ui/Card';

const DEFAULT_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function AsistenciaSemanalCard({ bars, labels = DEFAULT_LABELS, onExport }) {
  return (
    <Card className="flex flex-col min-h-[300px] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-text-primary">Asistencia semanal</h3>
        {onExport && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Exportar Asistencia en PDF"
              onClick={() => onExport('pdf')}
              className="text-xs px-2 py-1 rounded bg-bg-base border border-subtle hover:border-primary text-text-secondary hover:text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              title="Exportar Asistencia en Excel"
              onClick={() => onExport('xlsx')}
              className="text-xs px-2 py-1 rounded bg-bg-base border border-subtle hover:border-success-500 text-text-secondary hover:text-success-500 transition-colors flex items-center gap-1 font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-success-500" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              title="Exportar Asistencia en CSV"
              onClick={() => onExport('csv')}
              className="text-xs px-2 py-1 rounded bg-bg-base border border-subtle hover:border-text-primary text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-end gap-2 px-4 pb-6 pt-10">
        {bars.map((height, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3">
            <div
              className="w-full bg-blue-500 rounded-t-sm"
              style={{ height: `${height}%` }}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex justify-between px-4 text-xs text-text-tertiary font-medium">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </Card>
  );
}
