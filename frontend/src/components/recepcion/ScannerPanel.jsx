import { useState, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Camera, CreditCard, CameraOff, Flashlight, Volume2, VolumeX } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

/**
 * Returns a human-readable message for camera errors (fix #156-a).
 * @param {Error|null} error
 * @returns {string}
 */
function getCameraErrorMessage(error) {
  if (!error) return 'No se pudo acceder a la cámara.';
  const name = error?.name || error?.kind || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permiso denegado. Habilitá la cámara en el navegador.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No se detectó cámara. Verificá el hardware o usá DNI manual.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Cámara ocupada por otra app.';
  }
  return 'No se pudo acceder a la cámara. Por favor, ingrese el DNI manualmente.';
}

export default function ScannerPanel({
  isManualMode,
  manualDni,
  onManualDniChange,
  onValidateDni,
  onDniKeyDown,
  onActivateCamera,
  onActivateManual,
  onScan,
  onCameraError,
  cameraError,
  isPaused,
  isMuted,
  onToggleMute,
}) {
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  const handleScannerError = useCallback((error) => {
    console.error('Camera error:', error);
    if (onCameraError) onCameraError(error);
  }, [onCameraError]);

  const handleToggleTorch = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevice = devices.find((d) => d.kind === 'videoinput');
      if (!videoDevice) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: videoDevice.deviceId },
      });
      const track = stream.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn((prev) => !prev);
      }
    } catch {
      // Torch not supported; ignore.
    }
  }, [torchOn]);

  // Try to detect torch availability after scanner mounts
  const handleCameraReady = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.();
      if (caps?.torch) setTorchAvailable(true);
      // Don't keep the stream — scanner manages it.
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
  }, []);

  return (
    <Card className="flex flex-col p-6">
      {/* Camera error banner with specific message — fix #156-a */}
      {cameraError && (
        <div className="mb-4 bg-error-500/10 border border-error-500 text-error-500 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
          <CameraOff className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{getCameraErrorMessage(cameraError)}</p>
            <button
              onClick={() => {
                if (onActivateCamera) onActivateCamera();
              }}
              className="mt-2 text-xs font-semibold underline underline-offset-2 hover:opacity-80"
            >
              Reintentar cámara
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 bg-bg-base rounded-lg border border-subtle flex items-center justify-center relative overflow-hidden mb-6">
        {isManualMode ? (
          <div className="w-full space-y-4 px-4 z-10">
            <h3 className="text-text-primary font-medium text-center">Ingreso Manual de DNI</h3>
            {/* fix #156-e: inputMode numeric, autofocus, Enter submits */}
            <Input
              type="text"
              inputMode="numeric"
              value={manualDni}
              onChange={(e) => onManualDniChange(e.target.value.replace(/\s/g, ''))}
              onKeyDown={onDniKeyDown}
              placeholder="Ej. 30111222"
              className="text-center text-xl font-bold tracking-widest"
              autoFocus
            />
            <Button variant="primary" className="w-full" onClick={onValidateDni}>
              Validar DNI
            </Button>
          </div>
        ) : (
          // fix #156-b: use paused prop instead of unmounting scanner
          <div className="w-full h-full min-h-[250px] relative">
            {isPaused && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 rounded-lg">
                <p className="text-white animate-pulse font-medium">Validando acceso...</p>
              </div>
            )}
            <Scanner
              // fix #156-c: restrict to qr_code, prefer environment camera
              formats={['qr_code']}
              constraints={{ facingMode: 'environment' }}
              paused={isPaused}
              onScan={(result) => {
                if (result && result.length > 0) {
                  onScan(result[0].rawValue);
                }
              }}
              onError={handleScannerError}
              onLoad={handleCameraReady}
              components={{
                audio: false,
                finder: false,
              }}
              styles={{
                container: { width: '100%', height: '100%' },
              }}
            />
            {/* QR finder overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary"></div>
              </div>
            </div>
            {/* Torch toggle — fix #156-c */}
            {torchAvailable && (
              <button
                onClick={handleToggleTorch}
                aria-label={torchOn ? 'Apagar linterna' : 'Encender linterna'}
                className={`absolute bottom-3 right-3 z-10 p-2 rounded-full border ${
                  torchOn
                    ? 'bg-warning-500 text-white border-warning-500'
                    : 'bg-bg-raised/80 text-text-secondary border-subtle'
                }`}
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <Button variant="secondary" className="w-full flex justify-center gap-2" onClick={onActivateManual}>
          <CreditCard className="w-4 h-4" /> DNI manual
        </Button>
        <Button variant="primary" className="w-full flex justify-center gap-2" onClick={onActivateCamera}>
          <Camera className="w-4 h-4" /> Activar cámara
        </Button>
      </div>

      {/* Mute toggle — fix #156-f */}
      <div className="flex justify-end">
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {isMuted ? 'Activar sonido' : 'Silenciar'}
        </button>
      </div>
    </Card>
  );
}
