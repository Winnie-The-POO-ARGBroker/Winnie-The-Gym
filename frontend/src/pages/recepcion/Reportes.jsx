import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Download } from 'lucide-react';

export default function Reportes() {
  const tabs = ['Resumen', 'Morosidad', 'Asistencia', 'Ingresos'];

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-gray-400 text-sm mt-1">Resumen ejecutivo</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Download className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>

      <div className="flex gap-2 mb-8">
        {tabs.map((tab, idx) => (
          <button
            key={tab}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              idx === 0
                ? 'bg-[#ff5a36] text-white'
                : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:bg-[#2a2a2a]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Evolución de ingresos */}
        <Card className="flex flex-col min-h-[300px]">
          <h3 className="font-semibold text-white mb-1">Evolución de ingresos</h3>
          <p className="text-sm text-gray-500 mb-6">Recaudación mensual</p>
          
          <div className="flex-1 flex items-center justify-center relative mb-8">
            <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible">
              <path 
                d="M 0,60 L 50,70 L 100,50 L 150,60 L 200,40 L 250,55 L 300,30 L 350,45 L 400,20" 
                fill="none" 
                stroke="#4caf50" 
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Este mes</p>
              <p className="text-3xl font-bold text-[#4caf50]">$ 4.8M</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">VS. Anterior</p>
              <p className="text-2xl font-bold text-[#4caf50]">+12%</p>
            </div>
          </div>
        </Card>

        {/* Asistencia semanal */}
        <Card className="flex flex-col min-h-[300px]">
          <h3 className="font-semibold text-white mb-6">Asistencia semanal</h3>
          
          <div className="flex-1 flex items-end gap-2 px-4 pb-6 pt-10">
            {[40, 60, 55, 75, 85, 60, 45].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3">
                <div 
                  className="w-full bg-[#3b82f6] rounded-t-sm"
                  style={{ height: `${height}%` }}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-4 text-xs text-gray-500 font-medium">
            <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
          </div>
        </Card>

        {/* Morosidad */}
        <Card>
          <h3 className="font-semibold text-white mb-6">Morosidad</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Morosos</p>
              <p className="text-3xl font-bold text-[#ff5a36] mb-3">34</p>
              <div className="w-full bg-[#2a2a2a] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#ff5a36] h-full w-[25%]"></div>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Adeudado</p>
              <p className="text-2xl font-bold text-white">$412k</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Tasa</p>
              <p className="text-2xl font-bold text-yellow-500">8.2%</p>
            </div>
          </div>
        </Card>

        {/* Membresías activas */}
        <Card>
          <h3 className="font-semibold text-white mb-6">Membresías activas</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Activas</p>
              <p className="text-3xl font-bold text-[#4caf50]">1.240</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Por vencer</p>
              <p className="text-2xl font-bold text-yellow-500">86</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Nuevas/Mes</p>
              <p className="text-2xl font-bold text-[#1976d2]">+24</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
