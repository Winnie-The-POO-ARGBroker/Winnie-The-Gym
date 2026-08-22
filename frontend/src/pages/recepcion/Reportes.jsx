import React, { useState } from 'react';

export default function Reportes() {
  const [activeTab, setActiveTab] = useState('resumen');

  return (
    <div className="max-w-[1200px] mx-auto h-full flex flex-col pb-10">
      
      {/* Header and Buttons */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {activeTab === 'resumen' && 'Reportes'}
            {activeTab === 'morosidad' && 'Reporte de morosidad'}
            {activeTab === 'asistencia' && 'Reporte de asistencia'}
            {activeTab === 'ingresos' && 'Reporte de ingresos'}
          </h1>
          <p className="text-sm text-gray-500">
            {activeTab === 'resumen' && 'Resumen ejecutivo'}
            {activeTab === 'morosidad' && 'Periodo: Junio 2026'}
            {activeTab === 'asistencia' && 'Últimos 30 días'}
            {activeTab === 'ingresos' && 'Últimos 12 meses'}
          </p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'morosidad' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#333] hover:bg-[#2A2A2A] text-white text-sm font-medium rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filtros
            </button>
          )}
          {activeTab === 'asistencia' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#333] hover:bg-[#2A2A2A] text-white text-sm font-medium rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Rango
            </button>
          )}
          <button className="flex items-center gap-2 px-5 py-2 bg-[#FF5C00] hover:bg-[#e05200] text-white text-sm font-bold rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            {activeTab === 'resumen' ? 'Exportar PDF' : 'Exportar'}
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 mb-8 border-b border-[#2A2A2A] pb-4">
        {['resumen', 'morosidad', 'asistencia', 'ingresos'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors capitalize border ${
              activeTab === tab 
                ? 'bg-[#FF5C00] text-white border-[#FF5C00]' 
                : 'bg-[#1A1A1A] text-gray-400 border-[#2A2A2A] hover:text-white hover:bg-[#222]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* -------------------- VISTA: RESUMEN -------------------- */}
      {activeTab === 'resumen' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col min-h-[300px]">
              <h3 className="text-sm font-bold text-white mb-1">Evolución de ingresos</h3>
              <p className="text-xs text-gray-500 mb-8">Recaudación mensual</p>
              
              <div className="flex-1 relative flex items-center justify-center">
                {/* SVG Line Chart to perfectly match Figma */}
                <svg className="w-full h-32 absolute top-0" preserveAspectRatio="none" viewBox="0 0 100 40">
                  <path d="M0,25 L15,22 L30,12 L45,15 L60,10 L80,2 L100,8" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-auto pt-6">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Este mes</p>
                  <p className="text-3xl font-bold text-[#22c55e]">$ 4.8M</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Vs. Anterior</p>
                  <p className="text-3xl font-bold text-[#22c55e]">+12%</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col min-h-[300px]">
              <h3 className="text-sm font-bold text-white mb-6">Asistencia semanal</h3>
              <div className="flex-1 flex items-end gap-3 px-2">
                {['L','M','X','J','V','S','D'].map((day, i) => (
                  <div key={day} className="flex-1 flex flex-col justify-end items-center h-full">
                    <div className="w-full bg-[#3b82f6] rounded-t-[4px]" style={{ height: `${[45, 60, 55, 75, 90, 80, 40][i]}%` }}></div>
                    <span className="text-[10px] text-gray-500 font-bold mt-3 uppercase">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-4 border-l-red-500 rounded-xl p-6">
              <h3 className="text-sm font-bold text-white mb-6">Morosidad</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Morosos</p>
                  <p className="text-3xl font-bold text-[#ef4444]">34</p>
                  {/* Subtle red line below */}
                  <div className="h-1 w-8 bg-red-500 rounded-full mt-2"></div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Adeudado</p>
                  <p className="text-3xl font-bold text-white">$412k</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Tasa</p>
                  <p className="text-3xl font-bold text-yellow-500">8.2%</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-sm font-bold text-white mb-6">Membresías activas</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Activas</p>
                  <p className="text-3xl font-bold text-[#22c55e]">1.240</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Por vencer</p>
                  <p className="text-3xl font-bold text-yellow-500">86</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Nuevas/Mes</p>
                  <p className="text-3xl font-bold text-[#3b82f6]">+24</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* -------------------- VISTA: MOROSIDAD -------------------- */}
      {activeTab === 'morosidad' && (
        <>
          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-4 border-l-[#ef4444] rounded-xl p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Socios Morosos</p>
              </div>
              <p className="text-4xl font-bold text-[#ef4444]">34</p>
            </div>
            
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-4 border-l-[#ef4444] rounded-xl p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Monto Adeudado</p>
              </div>
              <p className="text-4xl font-bold text-[#ef4444]">$ 412k</p>
            </div>
            
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col justify-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Tasa Morosidad</p>
              <p className="text-4xl font-bold text-yellow-500 mb-1">8.2%</p>
              <p className="text-[10px] text-gray-500">↓ 1.4% vs. mayo</p>
            </div>
            
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col justify-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Atraso Medio</p>
              <p className="text-4xl font-bold text-white">6 días</p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-white">Detalle de socios morosos</h3>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Buscar socio..." className="bg-[#121212] border border-[#333] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]" />
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-[10px] text-gray-500 uppercase tracking-wider">
                  <th className="pb-4 font-bold w-1/4">Socio</th>
                  <th className="pb-4 font-bold">Plan</th>
                  <th className="pb-4 font-bold">Monto</th>
                  <th className="pb-4 font-bold">Atraso</th>
                  <th className="pb-4 font-bold">Estado</th>
                  <th className="pb-4 font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { p: 'Premium', m: '$ 12.000', a: '12 días', e: 'Vencido', color: 'bg-red-500/20 text-red-400', txtColor: 'text-red-500' },
                  { p: 'Básico', m: '$ 6.500', a: '8 días', e: 'Vencido', color: 'bg-red-500/20 text-red-400', txtColor: 'text-red-500' },
                  { p: 'Gold', m: '$ 18.000', a: '5 días', e: 'Por vencer', color: 'bg-yellow-500/20 text-yellow-500', txtColor: 'text-yellow-500' },
                  { p: 'Básico', m: '$ 6.500', a: '3 días', e: 'Por vencer', color: 'bg-yellow-500/20 text-yellow-500', txtColor: 'text-yellow-500' },
                  { p: 'Premium', m: '$ 12.000', a: '1 día', e: 'Por vencer', color: 'bg-yellow-500/20 text-yellow-500', txtColor: 'text-yellow-500' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#2A2A2A] hover:bg-[#222] transition-colors">
                    <td className="py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-[#444] bg-[#222] flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <div className="w-20 h-2 bg-[#333] rounded-full"></div> {/* Placeholder for name */}
                    </td>
                    <td className="py-4 text-gray-400 font-medium">{row.p}</td>
                    <td className="py-4 text-white font-medium">{row.m}</td>
                    <td className={`py-4 font-medium ${row.txtColor}`}>{row.a}</td>
                    <td className="py-4">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.color}`}>
                        {row.e}
                      </span>
                    </td>
                    <td className="py-4">
                      <button className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold rounded-lg transition-colors">
                        Notificar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* -------------------- VISTA: ASISTENCIA -------------------- */}
      {activeTab === 'asistencia' && (
        <>
          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Visitas Totales</p>
              </div>
              <p className="text-4xl font-bold text-[#3b82f6]">6.420</p>
            </div>
            
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col justify-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Promedio Diario</p>
              <p className="text-4xl font-bold text-[#22c55e]">214</p>
            </div>
            
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col justify-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Hora Pico</p>
              <p className="text-4xl font-bold text-[#FF5C00]">18-20h</p>
            </div>
            
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col justify-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Permanencia Media</p>
              <p className="text-4xl font-bold text-white">47 min</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col h-auto min-h-[400px]">
              <h3 className="text-sm font-bold text-white mb-1">Asistencia por día</h3>
              <p className="text-[10px] text-gray-500 mb-8">Visitas diarias del mes</p>
              
              <div className="flex-1 flex items-end gap-1.5">
                {Array.from({length: 30}).map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
                    <div 
                      className="w-full bg-[#3b82f6] rounded-[2px]"
                      style={{ height: `${30 + Math.random() * 70}%` }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 flex flex-col h-auto min-h-[400px]">
              <h3 className="text-sm font-bold text-white mb-1">Ocupación por franja</h3>
              <p className="text-[10px] text-gray-500 mb-8">Mapa de calor semanal</p>
              
              <div className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-[auto_1fr] gap-4">
                  {/* Y Axis labels */}
                  <div className="flex flex-col justify-around text-[10px] text-gray-500 font-bold uppercase py-2">
                    <span>Mañana</span>
                    <span>Mediodía</span>
                    <span>Tarde</span>
                    <span>Noche</span>
                  </div>
                  
                  {/* Heatmap Grid */}
                  <div className="grid grid-rows-4 gap-2">
                    {Array.from({length: 4}).map((_, rowI) => (
                      <div key={rowI} className="grid grid-cols-7 gap-2">
                        {Array.from({length: 7}).map((_, colI) => {
                           const colors = [
                             'bg-[#222]', // very low
                             'bg-[#3b82f6]/40', // low blue
                             'bg-[#3b82f6]', // high blue
                             'bg-[#FF5C00]/60', // orange
                             'bg-[#FF5C00]' // high orange
                           ];
                           const randomColor = colors[Math.floor(Math.random() * colors.length)];
                           return <div key={colI} className={`w-full aspect-square rounded-[4px] ${randomColor}`}></div>;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                {/* X Axis labels */}
                <div className="grid grid-cols-[auto_1fr] gap-4 mt-2">
                  <div className="w-12"></div> {/* Spacer to align with Y labels */}
                  <div className="grid grid-cols-7 gap-2 text-[10px] text-gray-500 font-bold uppercase text-center pl-1">
                    <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-gray-500 mt-6 leading-relaxed">
                ※ Identifica horas pico para dimensionar cupos de clases y personal.
              </p>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
