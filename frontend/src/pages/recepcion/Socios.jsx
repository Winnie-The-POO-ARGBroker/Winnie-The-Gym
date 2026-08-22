import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  nombre: z.string().min(2, 'Obligatorio'),
  apellido: z.string().min(2, 'Obligatorio'),
  dni: z.string().min(7, 'DNI inválido'),
  fechaNacimiento: z.string().optional(),
  genero: z.string().optional(),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(8, 'Teléfono inválido'),
  plan: z.string().min(1, 'Selecciona un plan'),
  formaPago: z.string().min(1, 'Obligatorio'),
  fechaInicio: z.string().optional(),
  renovacion: z.string().optional(),
});

export default function Socios() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plan: 'Premium - $ 12.000/mes',
      formaPago: 'Tarjeta de crédito',
      fechaInicio: '01/06/2026',
      renovacion: 'Automática mensual'
    }
  });

  const [fileAttached, setFileAttached] = useState(false);
  const watchedValues = watch();

  const onSubmit = async (data) => {
    console.log('Datos del socio:', data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert('Socio registrado con éxito');
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFileAttached(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Nuevo socio</h1>
        <div className="flex gap-3">
          <button type="button" className="px-5 py-2 text-sm font-medium text-white bg-transparent hover:bg-[#333] rounded-lg border border-[#333] transition-colors">
            Cancelar
          </button>
          <button 
            type="submit" 
            form="socioForm"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-white bg-[#FF5C00] hover:bg-[#e05200] rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {isSubmitting ? 'Creando...' : 'Crear socio'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pb-10">
        
        {/* Formularios - Izquierda (Ocupa 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <form id="socioForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Card 1: Datos Personales */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] border-l-4 border-l-[#FF5C00] p-6">
              <h2 className="text-sm font-bold text-white mb-4">Datos personales</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Nombre</label>
                    <input
                      {...register('nombre')}
                      className="w-full bg-transparent border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                      placeholder="Ana"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Apellido</label>
                    <input
                      {...register('apellido')}
                      className="w-full bg-transparent border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                      placeholder="Gonzalez"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">DNI</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                      </div>
                      <input
                        {...register('dni')}
                        className="w-full bg-transparent border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                        placeholder="30.111.222"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Fecha nacimiento</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <input
                        {...register('fechaNacimiento')}
                        className="w-full bg-transparent border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                        placeholder="dd/mm/aaaa"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Género</label>
                    <select
                      {...register('genero')}
                      className="w-full bg-transparent border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors appearance-none"
                    >
                      <option className="bg-[#1A1A1A]">Femenino</option>
                      <option className="bg-[#1A1A1A]">Masculino</option>
                      <option className="bg-[#1A1A1A]">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <input
                        {...register('email')}
                        className="w-full bg-transparent border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                        placeholder="ana@mail.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Teléfono</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <input
                        {...register('telefono')}
                        className="w-full bg-transparent border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                        placeholder="+54 11..."
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Card 2: Plan y pago */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-sm font-bold text-white mb-4">Plan y pago</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Plan</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <div className="w-4 h-4 rounded border border-gray-500"></div>
                      </div>
                      <select
                        {...register('plan')}
                        className="w-full bg-transparent border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors appearance-none"
                      >
                        <option className="bg-[#1A1A1A]">Premium - $ 12.000/mes</option>
                        <option className="bg-[#1A1A1A]">Básico - $ 6.500/mes</option>
                        <option className="bg-[#1A1A1A]">Gold - $ 18.000/mes</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Forma de pago</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      </div>
                      <select
                        {...register('formaPago')}
                        className="w-full bg-transparent border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors appearance-none"
                      >
                        <option className="bg-[#1A1A1A]">Tarjeta de crédito</option>
                        <option className="bg-[#1A1A1A]">Efectivo</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Fecha de inicio</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <input
                        {...register('fechaInicio')}
                        className="w-full bg-transparent border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Renovación</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </div>
                      <select
                        {...register('renovacion')}
                        className="w-full bg-transparent border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors appearance-none"
                      >
                        <option className="bg-[#1A1A1A]">Automática mensual</option>
                        <option className="bg-[#1A1A1A]">Manual</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Salud (Opcional) */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 relative">
              <div className="absolute top-6 right-6 px-2 py-1 bg-[#2A2A2A] rounded text-[10px] uppercase font-bold text-[#999999]">
                Recomendado
              </div>
              <h2 className="text-sm font-bold text-white mb-4">Salud (opcional)</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Apto médico</label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-full bg-transparent border border-[#333] rounded-lg px-3 py-2.5 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <span className="text-sm text-gray-400">{fileAttached ? 'Archivo adjunto' : 'Adjuntar PDF'}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Vence</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <input
                        className="w-full bg-transparent border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                        placeholder="dd/mm/aaaa"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Observaciones / Lesiones</label>
                  <textarea
                    rows={3}
                    className="w-full bg-transparent border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00] transition-colors resize-none"
                    placeholder="Sin observaciones"
                  ></textarea>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Resumen - Derecha (Ocupa 1/3) */}
        <div className="lg:col-span-1">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] border-l-4 border-l-[#4ADE80] p-6 sticky top-6">
            <h2 className="text-sm font-bold text-white mb-6">Resumen</h2>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full border border-[#333] flex items-center justify-center bg-[#2A2A2A]">
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">
                  {watchedValues.nombre || 'Nombre'} {watchedValues.apellido || 'Apellido'}
                </h3>
                <p className="text-xs text-gray-500">DNI {watchedValues.dni || '00.000.000'}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-[#2A2A2A]">
                <span className="text-gray-500">Plan</span>
                <span className="text-white text-right">{watchedValues.plan ? watchedValues.plan.split('-')[0].trim() : '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#2A2A2A]">
                <span className="text-gray-500">Cuota mensual</span>
                <span className="text-white text-right font-medium">{watchedValues.plan ? watchedValues.plan.split('-')[1]?.trim() : '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#2A2A2A]">
                <span className="text-gray-500">Primer cobro</span>
                <span className="text-white text-right">{watchedValues.fechaInicio || '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#2A2A2A]">
                <span className="text-gray-500">Renovación</span>
                <span className="text-white text-right">{watchedValues.renovacion || '-'}</span>
              </div>
            </div>

            <button 
              type="submit" 
              form="socioForm"
              disabled={isSubmitting}
              className="w-full py-3 text-sm font-bold text-white bg-[#FF5C00] hover:bg-[#e05200] rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Crear y generar QR
            </button>

            <p className="text-xs text-gray-500 text-center px-4 leading-relaxed">
              Al crear, se generará el QR de acceso y se enviará un email del socio.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
