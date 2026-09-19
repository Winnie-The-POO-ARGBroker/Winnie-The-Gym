import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Camera, CreditCard, CameraOff } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function ScannerPanel({
  isManualMode,
  manualDni,
  onManualDniChange,
  onValidateDni,
  onActivateCamera,
  onActivateManual,
  onScan,
  onCameraError,
  cameraError,
  isPaused,
}) {
  return (
    <Card className="flex flex-col p-6">
      {cameraError && (
        <div className="mb-4 bg-error-500/10 border border-error-500 text-error-500 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
          <CameraOff className="w-5 h-5 shrink-0" />
          <p>No se pudo acceder a la cámara. Por favor, ingrese el DNI manualmente.</p>
        </div>
      )}
      <div className="flex-1 bg-bg-base rounded-lg border border-subtle flex items-center justify-center relative overflow-hidden mb-6">
        {isManualMode ? (
          <div className="w-full space-y-4 px-4 z-10">
            <h3 className="text-text-primary font-medium text-center">Ingreso Manual de DNI</h3>
            <Input
              type="text"
              value={manualDni}
              onChange={(e) => onManualDniChange(e.target.value)}
              placeholder="Ej. 30111222"
              className="text-center text-xl font-bold tracking-widest"
              autoFocus
            />
            <Button variant="primary" className="w-full" onClick={onValidateDni}>
              Validar DNI
            </Button>
          </div>
        ) : isPaused ? (
          <div className="w-full h-full min-h-[250px] flex items-center justify-center bg-black/10">
            <p className="text-text-tertiary animate-pulse font-medium">Validando acceso...</p>
          </div>
        ) : (
          <div className="w-full h-full min-h-[250px] relative">
            <Scanner
              onScan={(result) => {
                if (result && result.length > 0) {
                  onScan(result[0].rawValue);
                }
              }}
              onError={(error) => {
                console.error("Camera error:", error);
                if (onCameraError) onCameraError(error);
              }}
              components={{
                audio: false,
                finder: false,
              }}
              styles={{
                container: { width: '100%', height: '100%' },
              }}
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary"></div>
              </div>
            </div>
          </div>
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
