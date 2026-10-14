import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import OccupancyCard from '../../components/recepcion/OccupancyCard';
import RecentEventsPanel from '../../components/recepcion/RecentEventsPanel';
import AforoStatBar from '../../components/recepcion/AforoStatBar';
import Badge from '../../components/ui/Badge';
import { Wifi, Loader2, WifiOff, AlertTriangle, X, Users, LogOut, Calendar } from 'lucide-react';
import useWebSocket from '../../hooks/useWebSocket';
import { useAforoStats, useAccessLogs } from '../../hooks/queries/useDashboardData';
import { useGymConfig } from '../../hooks/queries/useGymConfig';
import { getTimeAgo } from '../../utils/formatDate';
import { getPresentes, salidaManual, cerrarDia } from '../../services/accessService';
import { AFORO_THRESHOLD_CRITICAL_PCT } from '../../constants/aforo';
import useAuth from '../../hooks/useAuth';
import { toast } from 'sonner';

/**
 * Format a timestamp to local time string (HH:MM).
 */
function formatTime(ts) {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Membership status badge style.
 */
function MembresiaStatusBadge({ estado }) {
  const classes = {
    activo: 'bg-success-500/10 text-success-500 border-success-500/20',
    vencida: 'bg-error-500/10 text-error-500 border-error-500/20',
    suspendido: 'bg-warning-500/10 text-warning-500 border-warning-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${classes[estado] || classes.vencida}`}>
      {estado ?? '—'}
    </span>
  );
}

export default function AforoMonitorPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'administrador';

  const [aforo, setAforo] = useState(0);
  const { data: gymConfig } = useGymConfig();
  const maxAforo = gymConfig?.aforo_maximo ?? 200;

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
      time: getTimeAgo(log.timestamp),
    };
  });

  // fix #153: aforo.alert banner state
  const [aforoAlert, setAforoAlert] = useState(null); // null | { level, message, pct }

  // fix #154: Presentes panel state
  const [presentes, setPresentes] = useState([]);
  const [presentesLoading, setPresentesLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [exitLoading, setExitLoading] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [cerrarLoading, setCerrarLoading] = useState(false);

  const { isConnected, isConnecting, isReconnecting, lastMessage } = useWebSocket('/ws/aforo/');

  useEffect(() => {
    if (!lastMessage) return;

    // Update aforo counter
    if (lastMessage.aforo_actual !== undefined) {
      setAforo(lastMessage.aforo_actual);
    }

    // fix #153: handle aforo.alert messages from WS
    if (lastMessage.type === 'aforo.alert') {
      const pct = lastMessage.pct ?? 0;
      const threshold = gymConfig?.aforo_umbral_alerta_pct ?? AFORO_THRESHOLD_CRITICAL_PCT;
      setAforoAlert({
        level: lastMessage.level,
        message: lastMessage.message,
        pct,
        threshold,
      });
    }

    // fix #153: auto-dismiss alert if aforo drops below threshold - 5pp
    if (lastMessage.aforo_actual !== undefined && aforoAlert) {
      const currentPct = maxAforo > 0
        ? (lastMessage.aforo_actual / maxAforo) * 100
        : 0;
      const dismissThreshold = aforoAlert.threshold - 5;
      if (currentPct < dismissThreshold) {
        setAforoAlert(null);
      }
    }
  }, [lastMessage, maxAforo, gymConfig, aforoAlert]);

  // Load presentes on mount and after mutations
  const loadPresentes = useCallback(async () => {
    setPresentesLoading(true);
    try {
      const data = await getPresentes();
      setPresentes(data?.presentes ?? []);
    } catch (err) {
      console.error('Failed to load presentes:', err);
    } finally {
      setPresentesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresentes();
  }, [loadPresentes]);

  // fix #154: WS aforo.update should refresh presentes list
  useEffect(() => {
    if (lastMessage?.type === 'aforo.update') {
      loadPresentes();
    }
  }, [lastMessage, loadPresentes]);

  const handleSalidaManual = useCallback(async (ids) => {
    setExitLoading(true);
    try {
      const result = await salidaManual(Array.from(ids), 'Salida manual');
      toast.success(`${result.created_count} salida(s) registrada(s)`);
      setSelectedIds(new Set());
      await loadPresentes();
    } catch (err) {
      toast.error('Error al registrar salida');
    } finally {
      setExitLoading(false);
    }
  }, [loadPresentes]);

  const handleCerrarDia = useCallback(async () => {
    setCerrarLoading(true);
    try {
      const result = await cerrarDia();
      toast.success(result.message ?? `Día cerrado: ${result.closed_count} salida(s)`);
      setShowCerrarModal(false);
      await loadPresentes();
    } catch (err) {
      toast.error('Error al cerrar el día');
    } finally {
      setCerrarLoading(false);
    }
  }, [loadPresentes]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === presentes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(presentes.map((p) => p.socio_id)));
    }
  }, [selectedIds.size, presentes]);

  const toggleSelectOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  let statusBadge = null;
  if (isConnecting && !isReconnecting) {
    statusBadge = (
      <Badge variant="warning" className="px-4 py-2 flex items-center gap-2 text-sm font-medium">
        <Loader2 className="w-4 h-4 animate-spin" />
        Conectando...
      </Badge>
    );
  } else if (isReconnecting) {
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
        <WifiOff className="w-4 h-4" />
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

        {/* fix #153: aforo.alert persistent banner */}
        {aforoAlert && (
          <div
            role="alert"
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border font-medium text-sm ${
              aforoAlert.level === 'critical'
                ? 'bg-error-500/10 border-error-500 text-error-500'
                : 'bg-warning-500/10 border-warning-500 text-warning-500'
            }`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="flex-1">{aforoAlert.message}</span>
            <button
              onClick={() => setAforoAlert(null)}
              aria-label="Cerrar alerta"
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

        {/* fix #154: Presentes ahora panel */}
        <div className="bg-bg-surface rounded-2xl border border-subtle shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-bg-raised/40">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-text-secondary" />
              <h2 className="font-bold text-text-primary">Presentes ahora</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-info-500/10 text-info-500 border border-info-500/20">
                {presentes.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={() => handleSalidaManual(selectedIds)}
                  disabled={exitLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error-500 text-white text-xs font-bold hover:bg-error-600 transition-colors disabled:opacity-60"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {exitLoading ? 'Registrando...' : `Registrar salida masiva (${selectedIds.size})`}
                </button>
              )}
              {/* fix #154: Cerrar día — admin only */}
              {isAdmin && (
                <button
                  onClick={() => setShowCerrarModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-raised border border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Cerrar día
                </button>
              )}
            </div>
          </div>

          {presentesLoading ? (
            <div className="p-8 text-center text-text-tertiary text-sm">Cargando presentes...</div>
          ) : presentes.length === 0 ? (
            <div className="p-8 text-center text-text-tertiary text-sm">No hay socios presentes en este momento.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle text-xs font-bold text-text-tertiary uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === presentes.length && presentes.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-subtle"
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">N° Socio</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Entrada</th>
                    <th className="px-4 py-3 text-left">Tiempo adentro</th>
                    <th className="px-4 py-3 text-left">Membresía</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {presentes.map((p) => (
                    <tr key={p.socio_id} className="hover:bg-bg-raised/40 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.socio_id)}
                          onChange={() => toggleSelectOne(p.socio_id)}
                          className="rounded border-subtle"
                          aria-label={`Seleccionar ${p.nombre}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-text-secondary text-xs">{p.numero_socio}</td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {p.nombre} {p.apellido}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{formatTime(p.entrada_timestamp)}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {p.minutos_adentro != null
                          ? p.minutos_adentro >= 60
                            ? `${Math.floor(p.minutos_adentro / 60)}h ${p.minutos_adentro % 60}min`
                            : `${p.minutos_adentro}min`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <MembresiaStatusBadge estado={p.estado_membresia} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSalidaManual(new Set([p.socio_id]))}
                          disabled={exitLoading}
                          className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg bg-error-500/10 text-error-500 text-xs font-semibold hover:bg-error-500/20 transition-colors disabled:opacity-60"
                        >
                          <LogOut className="w-3 h-3" />
                          Registrar salida
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cerrar día confirmation modal */}
      {showCerrarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cerrar-dia-title"
        >
          <div className="bg-bg-surface rounded-2xl border border-subtle shadow-xl p-8 max-w-md w-full mx-4">
            <h3 id="cerrar-dia-title" className="text-lg font-bold text-text-primary mb-2">
              Confirmar cierre del día
            </h3>
            <p className="text-text-secondary text-sm mb-6">
              Se registrará la salida de todos los socios actualmente presentes ({presentes.length}).
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCerrarModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarDia}
                disabled={cerrarLoading}
                className="px-5 py-2 rounded-xl bg-error-500 text-white text-sm font-bold hover:bg-error-600 transition-colors disabled:opacity-60"
              >
                {cerrarLoading ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
