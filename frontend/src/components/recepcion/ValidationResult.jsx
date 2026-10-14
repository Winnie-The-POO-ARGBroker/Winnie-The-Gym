import Button from '../ui/Button';
import { QrCode, CheckCircle2, XCircle, AlertCircle, Check, User } from 'lucide-react';
import { getTimeAgo } from '../../utils/formatDate';
import { getDenialLabel } from '../../constants/accessDenialReasons';

/**
 * Resolves the access type from the result (fix #148).
 * Prefers result.accessType (set by AccesoTerminalPage from response),
 * then falls back to log.access_type.
 */
function resolveAccessType(result) {
  return result?.accessType || result?.log?.access_type || null;
}

/**
 * ValidationResult — displays the outcome of a QR or manual access scan.
 *
 * Props:
 *  result         — scan result object (status, message, denialReason, log, allowOverride)
 *  onConfirmEntry — callback to clear the result panel
 *  onOverride     — (staff only) callback when "Registrar igual" is clicked
 *  isStaff        — when false, override button is hidden (socios never see it)
 */
export default function ValidationResult({ result, onConfirmEntry, onOverride, isStaff = true }) {
  const status = result?.status || 'idle';
  const message = result?.message || '';
  const denialReason = result?.denialReason || result?.log?.denial_reason;
  const log = result?.log || {};
  const allowOverride = result?.allowOverride ?? false;
  const isError = status === 'error';
  const isSuccess = status === 'success';
  const isWarning = status === 'warning';

  const accessType = resolveAccessType(result);
  const isExit = accessType === 'EXIT';

  // fix #148: dynamic heading and badge label based on access_type
  const headingText = isSuccess
    ? (isExit ? 'Salida registrada' : 'Entrada registrada')
    : isError
      ? 'Acceso denegado'
      : 'Atención';

  const accessTypeLabelText = isExit ? 'Salida' : 'Entrada';

  // Resolved human-readable denial label
  const denialLabel = getDenialLabel(denialReason, message);

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
                {headingText}
              </h2>
              <p className="text-text-tertiary text-sm mt-1 font-medium max-w-sm">
                {isError && denialReason ? denialLabel : message}
              </p>
            </div>
          </div>

          <div className="bg-bg-raised rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-bg-surface border border-subtle flex items-center justify-center">
                <User className="w-8 h-8 text-text-tertiary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">
                  {log.user_nombre ? `${log.user_nombre} ${log.user_apellido || ''}`.trim() : 'Desconocido'}
                </h3>
                <p className="text-text-tertiary text-sm mt-1">{log.user_email || 'Sin datos'}</p>
              </div>
            </div>
          </div>

          {/* Warning detail — shows denial reason for warnings */}
          {isWarning && denialReason && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-warning-500/10 border border-warning-500/30">
              <p className="text-sm text-warning-500 font-medium">{denialLabel}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-bg-raised rounded-xl p-4 flex flex-col justify-between">
              {/* fix #148: dynamic label based on access_type */}
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase">
                {isExit ? 'Tipo de Egreso' : 'Tipo de Ingreso'}
              </p>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium w-fit ${
                isError ? 'bg-error-500/20 text-error-500' :
                isWarning ? 'bg-warning-500/20 text-warning-500' :
                'bg-success-500/20 text-success-500'
              }`}>
                {isError ? <XCircle className="w-3.5 h-3.5"/> :
                 isWarning ? <AlertCircle className="w-3.5 h-3.5"/> :
                 <CheckCircle2 className="w-3.5 h-3.5"/>}
                {/* fix #148: ENTRY → "Entrada", EXIT → "Salida" */}
                {accessType === 'ENTRY'
                  ? 'Entrada'
                  : accessType === 'EXIT'
                    ? 'Salida'
                    : accessTypeLabelText}
              </div>
            </div>
            <div className="bg-bg-raised rounded-xl p-4 flex flex-col justify-between">
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase">Hora</p>
              <p className="text-sm font-medium text-text-primary px-1">
                {log.timestamp ? `${new Date(log.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (${getTimeAgo(log.timestamp)})` : '--:--'}
              </p>
            </div>
          </div>

          {/* Warning override actions — staff only (#149) */}
          {isWarning && allowOverride && isStaff && onOverride ? (
            <div className="mt-auto grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="flex gap-2 w-full justify-center py-3"
                onClick={onConfirmEntry}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="flex gap-2 w-full justify-center py-3 bg-warning-500 hover:bg-warning-600 border-warning-500"
                onClick={onOverride}
              >
                Registrar igual
              </Button>
            </div>
          ) : (
            <div className="mt-auto grid grid-cols-1 gap-4">
              <Button variant="secondary" className="flex gap-2 w-full justify-center py-3" onClick={onConfirmEntry}>
                <Check className="w-4 h-4" /> Limpiar pantalla
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
