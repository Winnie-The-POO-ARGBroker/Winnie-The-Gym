import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import OccupancyCard from '../../components/recepcion/OccupancyCard';
import RecentEventsPanel from '../../components/recepcion/RecentEventsPanel';
import AforoStatBar from '../../components/recepcion/AforoStatBar';
import { Wifi, Loader2 } from 'lucide-react';
import useWebSocket from '../../hooks/useWebSocket';

export default function AforoMonitor() {
  const [aforo, setAforo] = useState(0);
  const maxAforo = 200;
  
  // As the backend currently only sends the total aforo in the message,
  // we will keep recent events statically or clear it until the backend sends event details.
  // For visual consistency with the mockup, we will keep the hardcoded ones initially.
  const [recentEvents] = useState([
    { id: 1, type: 'in', name: 'Ana González', time: 'hace 2 min' },
    { id: 2, type: 'out', name: 'Carlos López', time: 'hace 5 min' },
    { id: 3, type: 'in', name: 'María Pérez', time: 'hace 8 min' },
  ]);

  const { isConnected, isConnecting, lastMessage } = useWebSocket('/ws/aforo/');

  useEffect(() => {
    if (lastMessage && lastMessage.aforo_actual !== undefined) {
      setAforo(lastMessage.aforo_actual);
    }
  }, [lastMessage]);

  let statusBadge = null;
  if (isConnecting) {
    statusBadge = (
      <div className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium bg-warning-500/10 text-warning-500 border border-warning-500/20">
        <Loader2 className="w-4 h-4 animate-spin" />
        Reconectando...
      </div>
    );
  } else if (isConnected) {
    statusBadge = (
      <div className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium bg-success-500/10 text-success-500 border border-success-500/20">
        <Wifi className="w-4 h-4" />
        Conectado
      </div>
    );
  } else {
    statusBadge = (
      <div className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium bg-error-500/10 text-error-500 border border-error-500/20">
        <Wifi className="w-4 h-4" />
        Desconectado
      </div>
    );
  }

  return (
    <AppLayout>
      <TopBar
        title="Monitor de Aforo"
        subtitle="Tiempo real"
        showLive={true}
        rightContent={statusBadge}
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
