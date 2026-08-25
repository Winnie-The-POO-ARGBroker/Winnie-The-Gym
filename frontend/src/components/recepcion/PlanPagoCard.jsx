import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Calendar } from 'lucide-react';

export default function PlanPagoCard({ formData, onChange }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-6">Plan y pago</h2>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <Select label="PLAN">
          <option>Premium · $ 12.000/mes</option>
          <option>Básico · $ 8.000/mes</option>
        </Select>
        <Select label="FORMA DE PAGO">
          <option>Tarjeta de crédito</option>
          <option>Efectivo</option>
          <option>Transferencia</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Input label="FECHA DE INICIO" placeholder="01/06/2026" icon={Calendar} defaultValue="01/06/2026" />
        <Select label="RENOVACIÓN">
          <option>Automática mensual</option>
          <option>Manual</option>
        </Select>
      </div>
    </Card>
  );
}
