import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Users, Activity, TrendingUp, UserPlus, UserMinus, Wifi } from 'lucide-react';

export default function AforoMonitor() {
  const [aforo, setAforo] = useState(136);
  const maxAforo = 200;
  const [isConnected, setIsConnected] = useState(false);
  const [recentEvents, setRecentEvents] = useState([
    { id: 1, type: 'in', name: 'Ana González', time: 'hace 2 min' },
    { id: 2, type: 'out', name: 'Carlos López', time: 'hace 5 min' },
    { id: 3, type: 'in', name: 'María Pérez', time: 'hace 8 min' },
  ]);

  // Mock WebSocket connection
  useEffect(() => {
    setIsConnected(true);
    const interval = setInterval(() => {
      const isEntry = Math.random() > 0.4;
      setAforo(prev => {
        if (isEntry && prev < maxAforo) return prev + 1;
        if (!isEntry && prev > 0) return prev - 1;
        return prev;
      });
      
      setRecentEvents(prev => [
        {
          id: Date.now(),
          type: isEntry ? 'in' : 'out',
          name: isEntry ? 'Socio Ingresa' : 'Socio Sale',
          time: 'ahora'
        },
        ...prev.slice(0, 4)
      ]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const aforoPercentage = (aforo / maxAforo) * 100;
  const isHighCapacity = aforoPercentage > 85;

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Monitor de Aforo</h1>
          <p className="text-gray-400 text-sm mt-1">Tiempo real</p>
        </div>
        <div className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${isConnected ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
          <Wifi className="w-4 h-4" />
          {isConnected ? 'WebSocket Conectado' : 'Desconectado'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2 relative overflow-hidden flex flex-col justify-center min-h-[300px]">
          <div className="absolute top-6 left-6 flex items-center gap-2 text-gray-400">
            <Activity className="w-5 h-5" />
            <span className="font-semibold uppercase tracking-wider text-sm">Ocupación Actual</span>
          </div>
          
          <div className="text-center z-10">
            <div className="flex items-baseline justify-center gap-2">
              <span className={`text-8xl font-black tracking-tighter ${isHighCapacity ? 'text-[#ff5a36]' : 'text-white'}`}>
                {aforo}
              </span>
              <span className="text-3xl text-gray-500 font-bold">/ {maxAforo}</span>
            </div>
            <p className="text-gray-400 mt-4 text-lg">
              {aforoPercentage.toFixed(1)}% de capacidad
            </p>
          </div>

          {/* Progress bar background */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#2a2a2a]">
            <div 
              className={`h-full transition-all duration-1000 ${isHighCapacity ? 'bg-[#ff5a36]' : 'bg-[#4caf50]'}`}
              style={{ width: `${aforoPercentage}%` }}
            />
          </div>
        </Card>

        <Card className="flex flex-col">
          <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Actividad Reciente
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4">
            {recentEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-[#2a2a2a]/50 border border-[#3a3a3a]">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${event.type === 'in' ? 'bg-green-500/20 text-green-500' : 'bg-[#ff5a36]/20 text-[#ff5a36]'}`}>
                    {event.type === 'in' ? <UserPlus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{event.name}</p>
                    <p className="text-xs text-gray-500">{event.type === 'in' ? 'Entrada' : 'Salida'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{event.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <Card className="p-4">
          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Promedio Hoy</p>
          <p className="text-2xl font-bold text-white">112</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Pico Máximo</p>
          <p className="text-2xl font-bold text-white">189 <span className="text-xs text-gray-500 font-normal">a las 18:30</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Ingresos (Última hora)</p>
          <p className="text-2xl font-bold text-green-500">+45</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Egresos (Última hora)</p>
          <p className="text-2xl font-bold text-[#ff5a36]">-23</p>
        </Card>
      </div>
    </div>
  );
}
