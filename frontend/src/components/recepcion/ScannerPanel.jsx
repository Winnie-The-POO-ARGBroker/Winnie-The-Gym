import Card from '../ui/Card';
import Button from '../ui/Button';
import { QrCode, CreditCard, Camera } from 'lucide-react';

export default function ScannerPanel({
  isManualMode,
  manualDni,
  onManualDniChange,
  onValidateDni,
  onActivateCamera,
  onActivateManual,
}) {
  return (
    <Card className="flex flex-col p-6">
      <div className="flex-1 bg-bg-base rounded-lg border border-subtle flex items-center justify-center relative overflow-hidden mb-6">
        {isManualMode ? (
          <div className="w-full max-w-xs space-y-4 px-4 z-10">
            <h3 className="text-text-primary font-medium text-center">Ingreso Manual de DNI</h3>
            <input
              type="text"
              value={manualDni}
              onChange={(e) => onManualDniChange(e.target.value)}
              placeholder="Ej. 30111222 (termina en 2 da error)"
              className="w-full bg-bg-raised border border-primary rounded-lg text-text-primary placeholder:text-text-tertiary px-4 py-3 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button variant="primary" className="w-full" onClick={onValidateDni}>
              Validar DNI
            </Button>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center text-primary opacity-50">
                  <QrCode className="w-24 h-24" />
                </div>
              </div>
            </div>
            <p className="absolute bottom-8 text-text-tertiary font-mono text-sm">esperando QR del socio...</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="secondary" className="w-full flex justify-center gap-2" onClick={onActivateManual}>
          <CreditCard className="w-4 h-4" /> DNI manual
        </Button>
        <Button variant="primary" className="w-full flex justify-center gap-2" onClick={onActivateCamera}>
          <Camera className="w-4 h-4" /> Activar cámara
        </Button>
      </div>
    </Card>
  );
}
