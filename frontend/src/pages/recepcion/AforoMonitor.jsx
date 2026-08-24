import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import AppLayout from '../../components/layout/AppLayout';
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
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto h-full flex flex-col w-full">
        <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Monitor de Aforo</h1>
          <p className="text-text-secondary text-sm mt-1">Tiempo real</p>
        </div>
        <div className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${isConnected ? 'bg-success-500/10 text-success-500 border border-success-500/20' : 'bg-error-500/10 text-error-500 border border-error-500/20'}`}>
          <Wifi className="w-4 h-4" />
          {isConnected ? 'WebSocket Conectado' : 'Desconectado'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2 relative overflow-hidden flex flex-col justify-center min-h-[300px]">
          <div className="absolute top-6 left-6 flex items-center gap-2 text-text-secondary">
            <Activity className="w-5 h-5" />
            <span className="font-semibold uppercase tracking-wider text-sm">Ocupación Actual</span>
          </div>
          
          <div className="text-center z-10">
            <div className="flex items-baseline justify-center gap-2">
              <span className={`text-8xl font-black tracking-tighter ${isHighCapacity ? 'text-orange-500' : 'text-text-primary'}`}>
                {aforo}
              </span>
              <span className="text-3xl text-text-tertiary font-bold">/ {maxAforo}</span>
            </div>
            <p className="text-text-secondary mt-4 text-lg">
              {aforoPercentage.toFixed(1)}% de capacidad
            </p>
          </div>

          {/* Progress bar background */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-bg-raised">
            <div 
              className={`h-full transition-all duration-1000 ${isHighCapacity ? 'bg-orange-500' : 'bg-success-500'}`}
              style={{ width: `${aforoPercentage}%` }}
            />
          </div>
        </Card>

        <Card className="flex flex-col p-6">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Actividad Reciente
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4">
            {recentEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-raised border border-subtle">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${event.type === 'in' ? 'bg-success-500/20 text-success-500' : 'bg-error-500/20 text-error-500'}`}>
                    {event.type === 'in' ? <UserPlus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{event.name}</p>
                    <p className="text-xs text-text-secondary">{event.type === 'in' ? 'Entrada' : 'Salida'}</p>
                  </div>
                </div>
                <span className="text-xs text-text-tertiary">{event.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <Card className="p-4">
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Promedio Hoy</p>
          <p className="text-2xl font-bold text-text-primary">112</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Pico Máximo</p>
          <p className="text-2xl font-bold text-text-primary">189 <span className="text-xs text-text-tertiary font-normal">a las 18:30</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Ingresos (Última hora)</p>
          <p className="text-2xl font-bold text-success-500">+45</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Egresos (Última hora)</p>
          <p className="text-2xl font-bold text-orange-500">-23</p>
        </Card>
      </div>
      </div>
    </AppLayout>
  );
}
