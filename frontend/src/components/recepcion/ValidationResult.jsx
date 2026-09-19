import Button from '../ui/Button';
import { QrCode, CheckCircle2, XCircle, AlertCircle, LogOut, Check, User } from 'lucide-react';
import { getTimeAgo } from '../../utils/formatDate';

const DENIAL_REASONS = {
  UNKNOWN_USER: 'Usuario desconocido o DNI incorrecto',
  USER_SUSPENDED: 'Usuario suspendido',
  MEMBERSHIP_INACTIVE: 'Membresía inactiva o vencida',
  REPLAY_ATTACK: 'Código QR ya fue utilizado',
  TOKEN_EXPIRED: 'Código QR expirado',
};

export default function ValidationResult({ result, onConfirmEntry, onRegisterExit }) {
  const status = result?.status || 'idle';
  const message = result?.message || '';
  const denialReason = result?.denialReason || result?.log?.denial_reason;
  const log = result?.log || {};
  const isError = status === 'error';
  const isSuccess = status === 'success';
  const isWarning = status === 'warning';

  return (
    <div className={`rounded-xl border border-subtle flex flex-col p-8 transition-colors duration-300 ${
      status === 'idle' ? 'bg-bg-surface' :
      isSuccess ? 'bg-bg-surface border-l-[6px] border-l-success-500' :
      isError ? 'bg-bg-surface border-l-[6px] border-l-error-500' :
      'bg-bg-surface border-l-[6px] border-l-warning-500'
    }`}>
      {status === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary">
          <QrCode className="w-16 h-16 mb-4 opacity-50" />
          <p>Esperando escaneo...</p>
        </div>
      )}

      {status !== 'idle' && (
        <>
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isSuccess ? 'bg-success-500 text-white' :
              isError ? 'bg-error-500 text-white' :
              'bg-warning-500 text-white'
            }`}>
              {isSuccess && <CheckCircle2 className="w-8 h-8" />}
              {isError && <XCircle className="w-8 h-8" />}
              {isWarning && <AlertCircle className="w-8 h-8" />}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${
                isSuccess ? 'text-success-500' :
                isError ? 'text-error-500' :
                'text-warning-500'
              }`}>
                {isSuccess ? 'Acceso permitido' :
                 isError ? 'Acceso denegado' :
                 'Atención'}
              </h2>
              <p className="text-text-tertiary text-sm mt-1 font-medium max-w-sm">
                {isError && denialReason ? DENIAL_REASONS[denialReason] || message : message}
              </p>
            </div>
          </div>

          <div className="bg-bg-raised rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-bg-surface border border-subtle flex items-center justify-center">
                <User className="w-8 h-8 text-text-tertiary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">{log.user_name || 'Desconocido'}</h3>
                <p className="text-text-tertiary text-sm mt-1">{log.user_email || 'Sin datos'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-bg-raised rounded-xl p-4 flex flex-col justify-between">
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase">Tipo de Ingreso</p>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium w-fit ${
                isError ? 'bg-error-500/20 text-error-500' : 'bg-success-500/20 text-success-500'
              }`}>
                {isError ? <XCircle className="w-3.5 h-3.5"/> : <CheckCircle2 className="w-3.5 h-3.5"/>}
                {log.access_type === 'ENTRY' ? 'Entrada' : log.access_type === 'EXIT' ? 'Salida' : 'Desconocido'}
              </div>
            </div>
            <div className="bg-bg-raised rounded-xl p-4 flex flex-col justify-between">
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase">Hora</p>
              <p className="text-sm font-medium text-text-primary px-1">
                {log.timestamp ? `${new Date(log.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (${getTimeAgo(log.timestamp)})` : '--:--'}
              </p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-1 gap-4">
            <Button variant="secondary" className="flex gap-2 w-full justify-center py-3" onClick={onConfirmEntry}>
              <Check className="w-4 h-4" /> Limpiar pantalla
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
