import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
    <div className="max-w-6xl mx-auto h-full flex flex-col pb-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Nuevo socio</h1>
        <div className="flex gap-3">
          <Button variant="outline">Cancelar</Button>
          <Button variant="primary" className="gap-2">
            <Check className="w-4 h-4" /> Crear socio
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 flex-1">
        {/* Form Column */}
        <div className="col-span-2 space-y-6 overflow-y-auto pr-4 custom-scrollbar">
          
          {/* Datos Personales */}
          <Card className="p-6 border-[#2a2a2a] border-l-2 border-l-[#ff5a36]">
            <h2 className="text-lg font-semibold text-white mb-6">Datos personales</h2>
            
            <div className="grid grid-cols-2 gap-5 mb-5">
              <Input label="NOMBRE" placeholder="Ej. Ana" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              <Input label="APELLIDO" placeholder="Ej. González" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-3 gap-5 mb-5">
              <Input label="DNI" placeholder="Ej. 30.111.222" icon={FileText} value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
              <Input label="FECHA NACIMIENTO" placeholder="dd/mm/aaaa" icon={Calendar} />
              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">GÉNERO</label>
                <select className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#ff5a36] focus:border-[#ff5a36] py-2.5 px-3 appearance-none">
                  <option>Femenino</option>
                  <option>Masculino</option>
                  <option>Otro</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <Input label="EMAIL" type="email" placeholder="ana@mail.com" icon={Mail} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <Input label="TELÉFONO" type="tel" placeholder="+54 11..." icon={Phone} />
            </div>
          </Card>

          {/* Plan y Pago */}
          <Card className="p-6 border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-white mb-6">Plan y pago</h2>
            
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">PLAN</label>
                <select className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#ff5a36] focus:border-[#ff5a36] py-2.5 px-3 appearance-none">
                  <option>Premium · $ 12.000/mes</option>
                  <option>Básico · $ 8.000/mes</option>
                </select>
              </div>
              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">FORMA DE PAGO</label>
                <select className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#ff5a36] focus:border-[#ff5a36] py-2.5 px-3 appearance-none">
                  <option>Tarjeta de crédito</option>
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <Input label="FECHA DE INICIO" placeholder="01/06/2026" icon={Calendar} defaultValue="01/06/2026" />
              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">RENOVACIÓN</label>
                <select className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#ff5a36] focus:border-[#ff5a36] py-2.5 px-3 appearance-none">
                  <option>Automática mensual</option>
                  <option>Manual</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Salud */}
          <Card className="p-6 border-[#2a2a2a]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Salud (opcional)</h2>
              <span className="text-xs bg-[#2a2a2a] text-gray-300 px-2 py-1 rounded">Recomendado</span>
            </div>
            
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">APTO MÉDICO</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ff5a36] focus:border-[#ff5a36] transition-colors py-2 pl-10 pr-3 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#2a2a2a] file:text-white hover:file:bg-[#3a3a3a] cursor-pointer"
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
          <Card className="border-[#2a2a2a] sticky top-0 border-l-2 border-l-[#4caf50]">
            <h3 className="font-semibold text-white mb-6">Resumen</h3>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h4 className="font-bold text-white text-lg leading-tight">
                  {formData.nombre || formData.apellido ? `${formData.nombre} ${formData.apellido}` : 'Nuevo Socio'}
                </h4>
                <p className="text-gray-500 text-sm font-mono mt-1">DNI {formData.dni || '---'}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                <span className="text-gray-400 text-sm">Plan</span>
                <span className="text-white font-medium">{formData.plan}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                <span className="text-gray-400 text-sm">Cuota mensual</span>
                <span className="text-white font-medium">{formData.cuota}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                <span className="text-gray-400 text-sm">Primer cobro</span>
                <span className="text-white font-medium">{formData.cobro}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                <span className="text-gray-400 text-sm">Renovación</span>
                <span className="text-white font-medium">{formData.renovacion}</span>
              </div>
            </div>

            <Button variant="primary" className="w-full py-3 text-base gap-2 mb-4">
              <Check className="w-5 h-5" /> Crear y generar QR
            </Button>
            
            <p className="text-xs text-gray-500 text-center flex items-start gap-1">
              <span className="text-[#ff5a36] font-bold mt-0.5">*</span>
              Al crear se genera el QR de acceso y se envía al email del socio.
            </p>
          </Card>
        </div>
      </div>
      
      {/* Scrollbar styles to hide it but keep functionality */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #2a2a2a;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
