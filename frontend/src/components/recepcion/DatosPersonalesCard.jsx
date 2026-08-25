import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { FileText, Calendar, Mail, Phone } from 'lucide-react';

export default function DatosPersonalesCard({ formData, onChange }) {
  return (
    <Card className="p-6 border-l-2 border-l-primary">
      <h2 className="text-lg font-semibold text-text-primary mb-6">Datos personales</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <Input label="NOMBRE" placeholder="Ej. Ana" value={formData.nombre} onChange={e => onChange('nombre', e.target.value)} />
        <Input label="APELLIDO" placeholder="Ej. González" value={formData.apellido} onChange={e => onChange('apellido', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
        <Input label="DNI" placeholder="Ej. 30.111.222" icon={FileText} value={formData.dni} onChange={e => onChange('dni', e.target.value)} />
        <Input label="FECHA NACIMIENTO" placeholder="dd/mm/aaaa" icon={Calendar} />
        <Select label="GÉNERO">
          <option>Femenino</option>
          <option>Masculino</option>
          <option>Otro</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input label="EMAIL" type="email" placeholder="ana@mail.com" icon={Mail} value={formData.email} onChange={e => onChange('email', e.target.value)} />
        <Input label="TELÉFONO" type="tel" placeholder="+54 11..." icon={Phone} />
      </div>
    </Card>
  );
}
