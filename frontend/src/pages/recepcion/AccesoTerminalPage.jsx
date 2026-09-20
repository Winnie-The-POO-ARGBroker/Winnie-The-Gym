import { useState, useRef } from 'react';
import { toast } from 'sonner';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import ScannerPanel from '../../components/recepcion/ScannerPanel';
import ValidationResult from '../../components/recepcion/ValidationResult';
import { scanQR, manualAccess } from '../../services/accessService';
import useWebSocket from '../../hooks/useWebSocket';

const SCAN_RESULT_DISPLAY_MS = 8000;
const SCAN_DEBOUNCE_MS = 5000;

export default function AccesoTerminalPage() {
  const [scanResult, setScanResult] = useState(null); // null o { status, message, log, denialReason }
  const [isProcessing, setIsProcessing] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualDni, setManualDni] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const lastScanRef = useRef(0);

  const { lastMessage } = useWebSocket('/ws/aforo/');
  const aforoActual = lastMessage?.aforo_actual ?? '--';

  const processAccess = async (fn) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const data = await fn();
      setScanResult({
        status: data.status === 'GRANTED' ? 'success' : 'error',
        message: data.message,
        denialReason: data.denial_reason,
        log: data.access_log
      });
    } catch (err) {
      // Manejar respuesta 403 con datos del access_log si vinieron
      const errData = err?.response?.data;
      if (errData && errData.status === 'DENIED') {
        setScanResult({
          status: 'error',
          message: errData.message,
          denialReason: errData.denial_reason,
          log: errData.access_log
        });
      } else {
        const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Error al validar acceso';
        setScanResult({
          status: 'error',
          message: detail,
          denialReason: 'ERROR_SERVIDOR',
          log: null
        });
        toast.error(detail);
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanResult(null), SCAN_RESULT_DISPLAY_MS);
    }
  };

  const handleValidateDni = () => {
    if (!manualDni) return;
    processAccess(() => manualAccess(manualDni, 'ENTRY'));
    setManualDni('');
  };

  const handleScanQR = (token) => {
    const now = Date.now();
    if (now - lastScanRef.current < SCAN_DEBOUNCE_MS) return;
    lastScanRef.current = now;
    
    processAccess(() => scanQR(token, 'ENTRY'));
  };

  return (
    <AppLayout>
      <TopBar
        title="Control de Accesos"
        subtitle="Estación de recepción"
        showLive={true}
        rightContent={
          <div className="bg-bg-raised border border-subtle px-4 py-2 rounded-lg font-bold text-text-primary text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            Aforo {aforoActual}/200
          </div>
        }
      />
      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          <ScannerPanel
            isManualMode={isManualMode}
            manualDni={manualDni}
            onManualDniChange={setManualDni}
            onValidateDni={handleValidateDni}
            onActivateCamera={() => {
              setIsManualMode(false);
              setCameraError(false);
            }}
            onActivateManual={() => setIsManualMode(true)}
            onScan={handleScanQR}
            cameraError={cameraError}
            onCameraError={() => {
              setCameraError(true);
              setIsManualMode(true);
            }}
            isPaused={isProcessing || !!scanResult}
          />
          <ValidationResult
            result={scanResult}
            onConfirmEntry={() => setScanResult(null)}
          />
        </div>
      </div>
    </AppLayout>
  );
}
