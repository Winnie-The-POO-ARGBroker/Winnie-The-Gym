import { FileText, FileSpreadsheet, FileCode } from 'lucide-react';
import Card from '../ui/Card';

export default function MorosidadCard({ morosos, adeudado, tasa, morosidadPct, onExport }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-text-primary">Morosidad</h3>
        {onExport && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Exportar Morosidad en PDF"
              onClick={() => onExport('pdf')}
              className="text-xs px-2 py-1 rounded bg-bg-base border border-subtle hover:border-primary text-text-secondary hover:text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <FileText className="w-3.5 h-3.5 text-error-500" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              title="Exportar Morosidad en Excel"
              onClick={() => onExport('xlsx')}
              className="text-xs px-2 py-1 rounded bg-bg-base border border-subtle hover:border-success-500 text-text-secondary hover:text-success-500 transition-colors flex items-center gap-1 font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-success-500" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              title="Exportar Morosidad en CSV"
              onClick={() => onExport('csv')}
              className="text-xs px-2 py-1 rounded bg-bg-base border border-subtle hover:border-text-primary text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Morosos</p>
          <p className="text-3xl font-bold text-error-500 mb-3">{morosos}</p>
          <div className="w-full bg-bg-raised h-1.5 rounded-full overflow-hidden border border-subtle">
            <div className="bg-error-500 h-full" style={{ width: `${morosidadPct}%` }}></div>
          </div>
        </div>
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Adeudado</p>
          <p className="text-2xl font-bold text-text-primary">{adeudado}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Tasa</p>
          <p className="text-2xl font-bold text-warning-500">{tasa}</p>
        </div>
      </div>
    </Card>
  );
}
