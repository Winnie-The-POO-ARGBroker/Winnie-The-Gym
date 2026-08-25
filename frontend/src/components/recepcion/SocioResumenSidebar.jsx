import Card from '../ui/Card';
import Button from '../ui/Button';
import { User, Check } from 'lucide-react';

export default function SocioResumenSidebar({
  nombre,
  apellido,
  dni,
  plan,
  cuota,
  cobro,
  renovacion,
  onSubmit,
}) {
  return (
    <Card className="sticky top-0 border-l-2 border-l-success-500 p-6">
      <h3 className="font-semibold text-text-primary mb-6">Resumen</h3>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-bg-raised border border-subtle flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-text-tertiary" />
        </div>
        <div>
          <h4 className="font-bold text-text-primary text-lg leading-tight">
            {nombre || apellido ? `${nombre} ${apellido}` : 'Nuevo Socio'}
          </h4>
          <p className="text-text-secondary text-sm font-mono mt-1">DNI {dni || '---'}</p>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center py-2 border-b border-subtle">
          <span className="text-text-secondary text-sm">Plan</span>
          <span className="text-text-primary font-medium">{plan}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-subtle">
          <span className="text-text-secondary text-sm">Cuota mensual</span>
          <span className="text-text-primary font-medium">{cuota}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-subtle">
          <span className="text-text-secondary text-sm">Primer cobro</span>
          <span className="text-text-primary font-medium">{cobro}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-subtle">
          <span className="text-text-secondary text-sm">Renovación</span>
          <span className="text-text-primary font-medium">{renovacion}</span>
        </div>
      </div>

      <Button variant="primary" className="w-full py-3 text-base flex items-center justify-center gap-2 mb-4" onClick={onSubmit}>
        <Check className="w-5 h-5" /> Crear y generar QR
      </Button>

      <p className="text-xs text-text-secondary text-center flex items-start gap-1">
        <span className="text-primary font-bold mt-0.5">*</span>
        Al crear se genera el QR de acceso y se envía al email del socio.
      </p>
    </Card>
  );
}
