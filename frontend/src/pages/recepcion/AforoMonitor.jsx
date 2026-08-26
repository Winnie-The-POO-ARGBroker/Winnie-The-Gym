import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import OccupancyCard from '../../components/recepcion/OccupancyCard';
import RecentEventsPanel from '../../components/recepcion/RecentEventsPanel';
import AforoStatBar from '../../components/recepcion/AforoStatBar';
import { Wifi } from 'lucide-react';

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

  return (
    <AppLayout>
      <TopBar
        title="Monitor de Aforo"
        subtitle="Tiempo real"
        showLive={true}
        rightContent={
          <div className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${isConnected ? 'bg-success-500/10 text-success-500 border border-success-500/20' : 'bg-error-500/10 text-error-500 border border-error-500/20'}`}>
            <Wifi className="w-4 h-4" />
            {isConnected ? 'WebSocket Conectado' : 'Desconectado'}
          </div>
        }
      />
      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <OccupancyCard aforo={aforo} maxAforo={maxAforo} />
          <RecentEventsPanel events={recentEvents} />
        </div>
        <AforoStatBar
          promedioHoy={112}
          picoMaximo={189}
          picoHora="18:30"
          ingresoUltimaHora={45}
          egresoUltimaHora={23}
        />
      </div>
    </AppLayout>
  );
}
