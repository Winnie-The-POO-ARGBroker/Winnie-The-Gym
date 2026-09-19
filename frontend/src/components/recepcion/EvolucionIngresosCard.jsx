import { FileText, FileSpreadsheet, FileCode } from 'lucide-react';
import Card from '../ui/Card';

export default function EvolucionIngresosCard({ chartPoints, estesMes, vsAnterior, onExport }) {
  return (
    <Card className="flex flex-col min-h-[300px] p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-text-primary mb-1">Evolución de ingresos</h3>
          <p className="text-sm text-text-secondary">Recaudación mensual</p>
        </div>
        {onExport && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Exportar Ingresos en PDF"
              onClick={() => onExport('pdf')}
              className="text-xs px-2 py-1 rounded bg-bg-base border border-subtle hover:border-primary text-text-secondary hover:text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              title="Exportar Ingresos en Excel"
              onClick={() => onExport('xlsx')}
              className="text-xs px-2 py-1 rounded bg-bg-base border border-subtle hover:border-success-500 text-text-secondary hover:text-success-500 transition-colors flex items-center gap-1 font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-success-500" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              title="Exportar Ingresos en CSV"
              onClick={() => onExport('csv')}
              className="text-xs px-2 py-1 rounded bg-bg-base border border-subtle hover:border-text-primary text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center relative mb-8">
        <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible">
          <path
            d={chartPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-success-500"
          />
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Este mes</p>
          <p className="text-3xl font-bold text-success-500">{estesMes}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">VS. Anterior</p>
          <p className="text-2xl font-bold text-success-500">{vsAnterior}</p>
        </div>
      </div>
    </Card>
  );
}
