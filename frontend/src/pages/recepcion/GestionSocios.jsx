import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import AppLayout from '../../components/layout/AppLayout';
import { User, Mail, Phone, Calendar, CreditCard, FileText, Check } from 'lucide-react';

export default function GestionSocios() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    plan: 'Premium',
    cuota: '$ 12.000',
    cobro: '01/06',
    renovacion: 'Automática'
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto h-full flex flex-col pb-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Nuevo socio</h1>
          <div className="flex gap-3">
            <Button variant="secondary">Cancelar</Button>
            <Button variant="primary" className="gap-2">
              <Check className="w-4 h-4" /> Crear socio
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 flex-1">
          {/* Form Column */}
          <div className="col-span-2 space-y-6 overflow-y-auto pr-4 custom-scrollbar">
            
            {/* Datos Personales */}
            <Card className="p-6 border-l-2 border-l-primary">
              <h2 className="text-lg font-semibold text-text-primary mb-6">Datos personales</h2>
              
              <div className="grid grid-cols-2 gap-5 mb-5">
                <Input label="NOMBRE" placeholder="Ej. Ana" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                <Input label="APELLIDO" placeholder="Ej. González" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-3 gap-5 mb-5">
                <Input label="DNI" placeholder="Ej. 30.111.222" icon={FileText} value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
                <Input label="FECHA NACIMIENTO" placeholder="dd/mm/aaaa" icon={Calendar} />
                <Select label="GÉNERO">
                  <option>Femenino</option>
                  <option>Masculino</option>
                  <option>Otro</option>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <Input label="EMAIL" type="email" placeholder="ana@mail.com" icon={Mail} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <Input label="TELÉFONO" type="tel" placeholder="+54 11..." icon={Phone} />
              </div>
            </Card>

            {/* Plan y Pago */}
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

            {/* Salud */}
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
                      className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors py-2 pl-10 pr-3 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-bg-surface file:text-text-primary hover:file:bg-bg-raised cursor-pointer"
                    />
                  </div>
                </div>
                <Input label="VENCE" placeholder="dd/mm/aaaa" icon={Calendar} />
              </div>
              
              <Input label="OBSERVACIONES / LESIONES" placeholder="Sin observaciones" />
            </Card>

          </div>

          {/* Resumen Sidebar */}
          <div className="col-span-1">
            <Card className="sticky top-0 border-l-2 border-l-success-500 p-6">
              <h3 className="font-semibold text-text-primary mb-6">Resumen</h3>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-full bg-bg-raised border border-subtle flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-text-tertiary" />
                </div>
                <div>
                  <h4 className="font-bold text-text-primary text-lg leading-tight">
                    {formData.nombre || formData.apellido ? `${formData.nombre} ${formData.apellido}` : 'Nuevo Socio'}
                  </h4>
                  <p className="text-text-secondary text-sm font-mono mt-1">DNI {formData.dni || '---'}</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-2 border-b border-subtle">
                  <span className="text-text-secondary text-sm">Plan</span>
                  <span className="text-text-primary font-medium">{formData.plan}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-subtle">
                  <span className="text-text-secondary text-sm">Cuota mensual</span>
                  <span className="text-text-primary font-medium">{formData.cuota}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-subtle">
                  <span className="text-text-secondary text-sm">Primer cobro</span>
                  <span className="text-text-primary font-medium">{formData.cobro}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-subtle">
                  <span className="text-text-secondary text-sm">Renovación</span>
                  <span className="text-text-primary font-medium">{formData.renovacion}</span>
                </div>
              </div>

              <Button variant="primary" className="w-full py-3 text-base flex items-center justify-center gap-2 mb-4">
                <Check className="w-5 h-5" /> Crear y generar QR
              </Button>
              
              <p className="text-xs text-text-secondary text-center flex items-start gap-1">
                <span className="text-primary font-bold mt-0.5">*</span>
                Al crear se genera el QR de acceso y se envía al email del socio.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
