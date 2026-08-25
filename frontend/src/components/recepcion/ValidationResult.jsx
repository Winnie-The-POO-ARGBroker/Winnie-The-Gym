import Button from '../ui/Button';
import { QrCode, CheckCircle2, XCircle, AlertCircle, LogOut, Check, User } from 'lucide-react';

export default function ValidationResult({ status, onConfirmEntry, onRegisterExit }) {
  return (
    <div className={`rounded-xl border border-subtle flex flex-col p-8 transition-colors duration-300 ${
      status === 'idle' ? 'bg-bg-surface' :
      status === 'success' ? 'bg-bg-surface border-l-[6px] border-l-success-500' :
      status === 'error' ? 'bg-bg-surface border-l-[6px] border-l-error-500' :
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
              status === 'success' ? 'bg-success-500 text-white' :
              status === 'error' ? 'bg-error-500 text-white' :
              'bg-warning-500 text-white'
            }`}>
              {status === 'success' && <CheckCircle2 className="w-8 h-8" />}
              {status === 'error' && <XCircle className="w-8 h-8" />}
              {status === 'warning' && <AlertCircle className="w-8 h-8" />}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${
                status === 'success' ? 'text-success-500' :
                status === 'error' ? 'text-error-500' :
                'text-warning-500'
              }`}>
                {status === 'success' ? 'Acceso permitido' :
                 status === 'error' ? 'Acceso denegado' :
                 'Atención'}
              </h2>
              <p className="text-text-tertiary text-sm mt-1">
                {status === 'success' && 'validado en 42 ms • entrada registrada'}
                {status === 'error' && 'validado en 45 ms • bloqueado'}
                {status === 'warning' && 'validado en 40 ms • revisión sugerida'}
              </p>
            </div>
          </div>

          <div className="bg-bg-raised rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-bg-surface border border-subtle flex items-center justify-center">
                <User className="w-8 h-8 text-text-tertiary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Nombre del Socio</h3>
                <p className="text-text-tertiary text-sm font-mono mt-1">DNI 30.123.456</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-bg-raised rounded-xl p-4 flex flex-col justify-between">
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase">Membresía</p>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium w-fit ${
                status === 'error' ? 'bg-error-500/20 text-error-500' : 'bg-success-500/20 text-success-500'
              }`}>
                {status === 'error' ? <XCircle className="w-3.5 h-3.5"/> : <CheckCircle2 className="w-3.5 h-3.5"/>}
                {status === 'error' ? 'Vencida' : 'Activa · Premium'}
              </div>
            </div>
            <div className="bg-bg-raised rounded-xl p-4 flex flex-col justify-between">
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase">Vence</p>
              <p className="text-sm font-medium text-text-primary px-1">
                {status === 'error' ? '28 May 2026' : '28 Jun 2026'}
              </p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-4">
            <Button variant="secondary" className="flex gap-2 w-full justify-center py-3" onClick={onRegisterExit}>
              <LogOut className="w-4 h-4" /> Registrar salida
            </Button>
            <Button variant="primary" className="flex gap-2 w-full justify-center py-3" onClick={onConfirmEntry}>
              <Check className="w-4 h-4" /> Confirmar entrada
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
