import React from 'react';
import AppLayout from '../components/layout/AppLayout';

export default function AttendanceScreen() {
  const attendees = [
    { name: 'Ana M.', dni: '30.111.222', plan: 'Premium', planColor: 'bg-[#ffe8dc] text-orange-600', status: 'presente' },
    { name: 'Bruno P.', dni: '32.444.555', plan: 'Básico', planColor: 'bg-[#2a2a2a] text-text-secondary', status: 'presente' },
    { name: 'Carla S.', dni: '28.777.888', plan: 'Gold', planColor: 'bg-[#fff4ce] text-yellow-600', status: 'ausente' },
    { name: 'Diego R.', dni: '35.666.999', plan: 'Premium', planColor: 'bg-[#ffe8dc] text-orange-600', status: 'presente' },
    { name: 'Elena V.', dni: '29.222.333', plan: 'Premium', planColor: 'bg-[#ffe8dc] text-orange-600', status: 'sin_marcar' },
    { name: 'Fede G.', dni: '31.888.777', plan: 'Gold', planColor: 'bg-[#fff4ce] text-yellow-600', status: 'sin_marcar' },
    { name: 'Gaby T.', dni: '26.555.444', plan: 'Básico', planColor: 'bg-[#2a2a2a] text-text-secondary', status: 'sin_marcar' },
    { name: 'Héctor M.', dni: '33.999.111', plan: 'Premium', planColor: 'bg-[#ffe8dc] text-orange-600', status: 'presente' },
  ];

  const getRowBg = (status) => {
    if (status === 'presente') return 'bg-[#c5f0d3] hover:bg-[#b2eac4]';
    if (status === 'ausente') return 'bg-[#ffd5d5] hover:bg-[#ffc6c6]';
    return 'bg-bg-surface hover:bg-bg-raised';
  };

  const getTextColor = (status) => {
    if (status === 'presente' || status === 'ausente') return 'text-gray-900';
    return 'text-text-primary';
  };

  const getDniColor = (status) => {
    if (status === 'presente' || status === 'ausente') return 'text-gray-600';
    return 'text-text-tertiary';
  };

  return (
    <AppLayout>
    <div className="p-8 w-full max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Asistencia - Funcional</h1>
          <p className="text-sm text-text-secondary">Lun 9 Jun • 08:00 - 08:45 • Sala A</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-transparent border border-subtle text-text-primary rounded-lg hover:bg-bg-raised transition-colors text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Exportar
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-text-primary rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            Cerrar asistencia
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Main Table Area */}
        <div className="flex-1 bg-bg-surface rounded-xl border border-subtle overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="flex items-center gap-4 p-5 border-b border-subtle">
            <span className="text-text-primary font-semibold">Inscriptos</span>
            <span className="bg-[#2c3e50] text-[#60a5fa] px-3 py-1.5 rounded-full text-xs font-bold border border-[#3b82f6]/30 flex items-center gap-1.5">
               <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
               8/20
            </span>
            <div className="flex-1"></div>
            <span className="bg-[#14532d]/40 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30 flex items-center gap-1">
              ✓ 4 presentes
            </span>
            <span className="bg-[#7f1d1d]/40 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30 flex items-center gap-1">
              ✕ 1 ausentes
            </span>
            <span className="text-text-secondary text-sm ml-2">3 sin marcar</span>
          </div>

          {/* Table Columns */}
          <div className="grid grid-cols-[3fr_2fr_2fr_auto] gap-4 p-4 text-xs font-bold text-text-tertiary tracking-wider">
            <div className="pl-8">SOCIO</div>
            <div>DNI</div>
            <div>PLAN</div>
            <div className="text-center w-[200px]">ASISTENCIA</div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col p-2 gap-1">
            {attendees.map((a, idx) => (
              <div key={idx} className={`grid grid-cols-[3fr_2fr_2fr_auto] gap-4 items-center p-3 rounded-lg transition-colors ${getRowBg(a.status)}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${a.status === 'ausente' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <div className={`w-9 h-9 rounded-full bg-black/20 flex items-center justify-center text-sm ${getTextColor(a.status)}`}>
                     <svg className="w-5 h-5 opacity-60" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                  </div>
                  <span className={`font-bold text-sm ${getTextColor(a.status)}`}>{a.name}</span>
                </div>
                
                <div className={`text-sm ${getDniColor(a.status)}`}>{a.dni}</div>
                
                <div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${a.planColor}`}>
                    {a.plan}
                  </span>
                </div>
                
                <div className="flex justify-center gap-2 w-[200px]">
                  <button className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${a.status === 'presente' ? 'bg-[#4ade80] text-text-primary border-[#4ade80]' : 'bg-bg-raised text-text-secondary border-subtle hover:text-text-primary hover:bg-[#333]'}`}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    Presente
                  </button>
                  <button className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${a.status === 'ausente' ? 'bg-[#ef4444] text-text-primary border-[#ef4444]' : 'bg-bg-raised text-text-secondary border-subtle hover:text-text-primary hover:bg-[#333]'}`}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    Ausente
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-[340px] flex flex-col gap-6">
          
          {/* Resumen */}
          <div className="bg-bg-surface rounded-xl p-6 border border-subtle border-l-4 border-l-orange-500">
            <h3 className="text-text-primary font-bold mb-6">Resumen de la clase</h3>
            <div className="flex flex-col divide-y divide-gray-800/60">
              <div className="flex justify-between items-center text-sm pb-4">
                <span className="text-text-secondary">Inscriptos</span>
                <span className="text-text-primary font-bold">18 / 20</span>
              </div>
              <div className="flex justify-between items-center text-sm py-4">
                <span className="text-text-secondary">Presentes</span>
                <span className="text-green-500 font-bold">4</span>
              </div>
              <div className="flex justify-between items-center text-sm py-4">
                <span className="text-text-secondary">Ausentes</span>
                <span className="text-red-500 font-bold">1</span>
              </div>
              <div className="flex justify-between items-center text-sm py-4">
                <span className="text-text-secondary">Sin confirmar</span>
                <span className="text-yellow-500 font-bold">3</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-4">
                <span className="text-text-secondary">Tasa asistencia</span>
                <span className="text-green-500 font-bold">50%</span>
              </div>
            </div>
          </div>

          {/* Lista de espera */}
          <div className="bg-bg-surface rounded-xl p-6 border border-subtle">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-text-primary font-bold">Lista de espera</h3>
              <span className="bg-[#fff4ce] text-yellow-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            </div>
            <p className="text-text-tertiary text-xs mb-6">3 esperando</p>
            
            <div className="flex flex-col divide-y divide-gray-800/60 mb-6">
              {['Iris N.', 'Javier B.', 'Karina F.'].map((name, i) => (
                <div key={name} className="flex justify-between items-center py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-raised flex items-center justify-center border border-subtle text-text-secondary">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                    </div>
                    <span className="text-text-secondary text-sm font-medium">{name}</span>
                  </div>
                  <button className="bg-blue-500 hover:bg-blue-600 text-text-primary px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">
                    Habilitar
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-text-tertiary italic">
              <span className="text-red-500">※</span> Si hay ausencias, podés habilitar al siguiente en la lista.
            </p>
          </div>

          {/* Acciones */}
          <div className="bg-bg-surface rounded-xl p-6 border border-subtle">
            <h3 className="text-text-primary font-bold mb-4">Acciones</h3>
            <button className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-text-primary py-3 rounded-xl font-bold transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Cerrar asistencia
            </button>
          </div>

        </div>
      </div>
    </div>
    </AppLayout>
  );
}
