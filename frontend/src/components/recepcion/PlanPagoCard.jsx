import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Calendar } from 'lucide-react';

export default function PlanPagoCard({ formData, onChange }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-6">Plan y pago</h2>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <Select
          label="PLAN"
          value={formData?.plan ?? 'Premium'}
          onChange={(e) => onChange('plan', e.target.value)}
        >
          <option value="Premium">Premium · $ 12.000/mes</option>
          <option value="Básico">Básico · $ 8.000/mes</option>
        </Select>
        <Input
          label="CUOTA"
          placeholder="$ 12.000"
          icon={Calendar}
          value={formData?.cuota ?? ''}
          onChange={(e) => onChange('cuota', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Input
          label="FECHA DE COBRO"
          placeholder="01/06"
          icon={Calendar}
          value={formData?.cobro ?? ''}
          onChange={(e) => onChange('cobro', e.target.value)}
        />
        <Select
          label="RENOVACIÓN"
          value={formData?.renovacion ?? 'Automática'}
          onChange={(e) => onChange('renovacion', e.target.value)}
        >
          <option value="Automática">Automática mensual</option>
          <option value="Manual">Manual</option>
        </Select>
      </div>
    </Card>
  );
}
