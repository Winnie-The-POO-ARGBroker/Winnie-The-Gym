import React from 'react';
import AppLayout from '../components/layout/AppLayout';

export default function CreateClassScreen() {
  return (
    <AppLayout>
      <div className="p-8 w-full max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Crear nueva clase</h1>
          <p className="text-sm text-text-secondary">Completá los datos para publicarla</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2 bg-transparent border border-subtle text-text-primary rounded-lg hover:bg-bg-raised transition-colors text-sm font-semibold">
            Cancelar
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-transparent border border-subtle text-text-primary rounded-lg hover:bg-bg-raised transition-colors text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            Previsualizar
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-text-primary rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            Publicar clase
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Main Form Area */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Información General */}
          <div className="bg-bg-surface rounded-xl p-6 border border-subtle border-l-4 border-l-orange-500">
            <h2 className="text-lg font-bold text-text-primary mb-6">Información general</h2>
            <div className="flex gap-6 mb-6">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm text-text-secondary font-medium">Nombre de la clase *</label>
                <input 
                  type="text" 
                  defaultValue="Funcional Intensivo" 
                  className="bg-bg-raised border border-orange-500/50 rounded-lg p-3 text-text-primary focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm text-text-secondary font-medium">Actividad</label>
                <select className="bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary focus:outline-none focus:border-orange-500">
                  <option>Funcional</option>
                  <option>Crossfit</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-secondary font-medium">Descripción</label>
              <textarea 
                rows="3"
                placeholder="Clase de funcional de alta intensidad..."
                className="bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary focus:outline-none focus:border-orange-500 resize-none"
              ></textarea>
            </div>
          </div>

          {/* Horario y lugar */}
          <div className="bg-bg-surface rounded-xl p-6 border border-subtle border-l-4 border-l-blue-500">
            <h2 className="text-lg font-bold text-text-primary mb-6">Horario y lugar</h2>
            <div className="grid grid-cols-4 gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary font-medium">Día</label>
                <select className="bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary">
                  <option>Lunes</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary font-medium">Hora inicio</label>
                <div className="relative">
                  <input type="time" defaultValue="08:00" className="w-full bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary font-medium">Duración</label>
                <div className="relative">
                  <input type="text" defaultValue="45 min" className="w-full bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary font-medium">Sala</label>
                <div className="relative">
                  <select className="w-full bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary appearance-none">
                    <option>Sala A</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-sm text-text-secondary font-medium">Recurrencia semanal</label>
              <div className="flex gap-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => {
                  const isActive = i === 0 || i === 2 || i === 4;
                  return (
                    <button 
                      key={day} 
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                        isActive 
                          ? 'bg-orange-500 text-text-primary' 
                          : 'bg-bg-raised text-text-secondary border border-subtle hover:border-strong'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cupos y reservas */}
          <div className="bg-bg-surface rounded-xl p-6 border border-subtle border-l-4 border-l-green-500">
            <h2 className="text-lg font-bold text-text-primary mb-6">Cupos y reservas</h2>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary font-medium">Cupo máximo</label>
                <input type="number" defaultValue={20} className="bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary font-medium">Lista de espera</label>
                <input type="number" defaultValue={5} className="bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary font-medium">Cancelación sin cargo</label>
                <input type="text" defaultValue="2 horas antes" className="bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary" />
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-sm text-text-secondary font-medium">Planes habilitados para reservar</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border border-subtle bg-bg-raised"></div>
                  <span className="text-text-secondary text-sm">Básico</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-text-primary">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <span className="bg-[#ffe8dc] text-orange-600 px-3 py-1 rounded-full text-xs font-bold">Premium</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-text-primary">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <span className="bg-[#fff4ce] text-yellow-600 px-3 py-1 rounded-full text-xs font-bold">Gold</span>
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-[380px] flex flex-col gap-6">
          
          {/* Vista previa */}
          <div className="bg-bg-surface rounded-xl p-6 border border-subtle border-l-4 border-l-orange-500">
            <h3 className="text-text-primary font-bold mb-6">Vista previa de la clase</h3>
            
            <div className="flex flex-col gap-2 mb-6">
              <h4 className="text-xl font-bold text-text-primary">Funcional Intensivo</h4>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded text-xs font-semibold border border-orange-500/30">Funcional</span>
                <span>L/M/V - 08:00</span>
              </div>
              <p className="text-text-secondary text-sm mt-1">Sala A • 45min</p>
              <p className="text-text-tertiary text-xs mt-2">0/20 - aún sin inscriptos</p>
            </div>

            <div className="flex flex-col gap-4 text-sm">
              <div className="flex justify-between items-center border-b border-subtle pb-3">
                <span className="text-text-tertiary">Instructor</span>
                <span className="text-text-secondary">Carlos R.</span>
              </div>
              <div className="flex justify-between items-center border-b border-subtle pb-3">
                <span className="text-text-tertiary">Primera clase</span>
                <span className="text-text-secondary">Lun 9 Jun</span>
              </div>
              <div className="flex justify-between items-center border-b border-subtle pb-3">
                <span className="text-text-tertiary">Recurrencia</span>
                <span className="text-text-secondary">L/M/V semanal</span>
              </div>
              <div className="flex justify-between items-center border-b border-subtle pb-3">
                <span className="text-text-tertiary">Planes</span>
                <span className="text-text-secondary">Premium y Gold</span>
              </div>
            </div>

            <p className="text-xs text-text-tertiary italic mt-6">
              <span className="text-red-500">※</span> Los socios verán esta clase en el buscador una vez publicada.
            </p>
          </div>

          {/* Acciones */}
          <div className="bg-bg-surface rounded-xl p-6 border border-subtle">
            <h3 className="text-text-primary font-bold mb-4">Acciones</h3>
            <div className="flex flex-col gap-3">
              <button className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-text-primary py-3 rounded-xl font-bold transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Publicar clase
              </button>
              <button className="w-full flex items-center justify-center gap-2 bg-transparent border border-subtle hover:bg-bg-raised text-text-primary py-3 rounded-xl font-semibold transition-colors">
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                Guardar borrador
              </button>
              <button className="w-full flex items-center justify-center gap-2 bg-transparent border border-subtle hover:bg-bg-raised text-text-primary py-3 rounded-xl font-semibold transition-colors mt-2">
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                Duplicar clase existente
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
    </AppLayout>
  );
}
