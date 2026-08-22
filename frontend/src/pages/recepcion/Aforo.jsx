import React, { useState, useEffect } from 'react';

export default function Aforo() {
  const [occupancy, setOccupancy] = useState(45); // Valor simulado inicial
  const MAX_CAPACITY = 100;

  useEffect(() => {
    // Simulación de WebSocket para aforo en tiempo real
    const interval = setInterval(() => {
      setOccupancy((prev) => {
        // Simular cambios aleatorios (-3 a +3)
        const change = Math.floor(Math.random() * 7) - 3;
        const newValue = prev + change;
        if (newValue < 0) return 0;
        if (newValue > MAX_CAPACITY) return MAX_CAPACITY;
        return newValue;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const percentage = (occupancy / MAX_CAPACITY) * 100;
  
  let statusColor = 'text-emerald-500';
  let bgColor = 'bg-emerald-500';
  let shadowColor = 'shadow-emerald-500/50';
  let statusText = 'Normal';

  if (percentage >= 85) {
    statusColor = 'text-red-500';
    bgColor = 'bg-red-500';
    shadowColor = 'shadow-red-500/50';
    statusText = 'Capacidad Máxima';
  } else if (percentage >= 60) {
    statusColor = 'text-orange-500';
    bgColor = 'bg-orange-500';
    shadowColor = 'shadow-orange-500/50';
    statusText = 'Concurrido';
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-[#1A1A1A] rounded-3xl p-10 border border-[#333] relative overflow-hidden">
        
        {/* Adorno superior */}
        <div className={`absolute top-0 left-0 w-full h-2 ${bgColor} transition-colors duration-500`}></div>

        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Monitor de Aforo</h1>
            <p className="text-neutral-400 mt-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${bgColor} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${bgColor}`}></span>
              </span>
              En vivo (WebSocket)
            </p>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold uppercase tracking-wider ${statusColor}`}>{statusText}</div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-10">
          {/* Círculo de Aforo */}
          <div className={`relative flex items-center justify-center w-64 h-64 rounded-full border-[12px] border-neutral-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] ${shadowColor} shadow-2xl transition-all duration-500`}>
            {/* Anillo de progreso simulado con strokeDasharray */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-neutral-700/50"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * percentage) / 100}
                strokeLinecap="round"
                className={`${statusColor} transition-all duration-1000 ease-out`}
              />
            </svg>
            
            <div className="text-center z-10">
              <span className="text-7xl font-black block">{occupancy}</span>
              <span className="text-neutral-400 font-bold uppercase tracking-widest text-sm">/ {MAX_CAPACITY}</span>
            </div>
          </div>

          <div className="mt-12 w-full grid grid-cols-3 gap-4">
            <div className="bg-[#121212] rounded-2xl p-4 text-center border border-[#333]">
              <div className="text-gray-500 text-xs mb-1 uppercase font-bold tracking-wider">Entradas hoy</div>
              <div className="text-2xl font-bold text-white">142</div>
            </div>
            <div className="bg-[#121212] rounded-2xl p-4 text-center border border-[#333]">
              <div className="text-gray-500 text-xs mb-1 uppercase font-bold tracking-wider">Ocupación</div>
              <div className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</div>
            </div>
            <div className="bg-[#121212] rounded-2xl p-4 text-center border border-[#333]">
              <div className="text-gray-500 text-xs mb-1 uppercase font-bold tracking-wider">Pico (18:00)</div>
              <div className="text-2xl font-bold text-white">89</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
