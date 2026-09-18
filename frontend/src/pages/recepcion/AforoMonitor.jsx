import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import OccupancyCard from '../../components/recepcion/OccupancyCard';
import RecentEventsPanel from '../../components/recepcion/RecentEventsPanel';
import AforoStatBar from '../../components/recepcion/AforoStatBar';
import Badge from '../../components/ui/Badge';
import { Wifi, Loader2 } from 'lucide-react';
import useWebSocket from '../../hooks/useWebSocket';
import { useAforoStats, useAccessLogs } from '../../hooks/queries/useDashboardData';

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / 60000);
  
  if (diffInMinutes < 1) return 'hace un momento';
  if (diffInMinutes === 1) return 'hace 1 minuto';
  if (diffInMinutes < 60) return `hace ${diffInMinutes} minutos`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return 'hace 1 hora';
  if (diffInHours < 24) return `hace ${diffInHours} horas`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'hace 1 día';
  return `hace ${diffInDays} días`;
}

export default function AforoMonitor() {
  const [aforo, setAforo] = useState(0);
  const maxAforo = 200;
  
  // Real stats
  const { data: stats } = useAforoStats();
  const { data: logsData } = useAccessLogs(5);
  
  const recentEvents = (logsData || []).map((log, index) => {
    let name = '';
    if (log.user_nombre) {
      name = `${log.user_nombre} ${log.user_apellido || ''}`.trim();
    }
    return {
      id: log.id || index,
      type: log.access_type === 'ENTRY' ? 'in' : 'out',
      name: name || 'Desconocido',
      time: getTimeAgo(log.timestamp)
    };
  });

  const { isConnected, isConnecting, lastMessage } = useWebSocket('/ws/aforo/');

  useEffect(() => {
    if (lastMessage && lastMessage.aforo_actual !== undefined) {
      setAforo(lastMessage.aforo_actual);
    }
  }, [lastMessage]);

  let statusBadge = null;
  if (isConnecting) {
    statusBadge = (
      <Badge variant="warning" className="px-4 py-2 flex items-center gap-2 text-sm font-medium">
        <Loader2 className="w-4 h-4 animate-spin" />
        Reconectando...
      </Badge>
    );
  } else if (isConnected) {
    statusBadge = (
      <Badge variant="success" className="px-4 py-2 flex items-center gap-2 text-sm font-medium">
        <Wifi className="w-4 h-4" />
        Conectado
      </Badge>
    );
  } else {
    statusBadge = (
      <Badge variant="danger" className="px-4 py-2 flex items-center gap-2 text-sm font-medium">
        <Wifi className="w-4 h-4" />
        Desconectado
      </Badge>
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
          promedioHoy={stats?.promedioHoy || '0'}
          picoMaximo={stats?.picoMaximo || '0'}
          picoHora={stats?.picoHora || '--:--'}
          ingresoUltimaHora={stats?.ingresoUltimaHora || '0'}
          egresoUltimaHora={stats?.egresoUltimaHora || '0'}
        />
      </div>
    </AppLayout>
  );
}
