import Card from '../ui/Card';
import Input from '../ui/Input';
import { FileText, Calendar } from 'lucide-react';

export default function SaludCard({ onFileChange, onChange }) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Salud (opcional)</h2>
        <span className="text-xs bg-bg-raised text-text-secondary px-2 py-1 rounded">Recomendado</span>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="w-full">
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">APTO MÉDICO</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-text-tertiary" />
            </div>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={e => onFileChange(e.target.files?.[0])}
              className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors py-2 pl-10 pr-3 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-bg-surface file:text-text-primary hover:file:bg-bg-raised cursor-pointer"
            />
          </div>
        </div>
        <Input label="VENCE" placeholder="dd/mm/aaaa" icon={Calendar} onChange={e => onChange('venceMedico', e.target.value)} />
      </div>

      <Input label="OBSERVACIONES / LESIONES" placeholder="Sin observaciones" onChange={e => onChange('observaciones', e.target.value)} />
    </Card>
  );
}
