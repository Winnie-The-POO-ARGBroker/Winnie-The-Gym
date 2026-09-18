import { useState } from 'react';
import { toast } from 'sonner';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import ScannerPanel from '../../components/recepcion/ScannerPanel';
import ValidationResult from '../../components/recepcion/ValidationResult';
import { scanQR, manualAccess } from '../../services/accessService';

export default function AccesoTerminal() {
  const [scanResult, setScanResult] = useState(null); // null o { status, message, log, denialReason }
  const [isProcessing, setIsProcessing] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualDni, setManualDni] = useState('');

  const processAccess = async (promise) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const data = await promise;
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
      setTimeout(() => setScanResult(null), 8000); // clear after 8s
    }
  };

  const handleValidateDni = () => {
    if (!manualDni) return;
    processAccess(manualAccess(manualDni, 'ENTRY'));
    setManualDni('');
  };

  const handleScanQR = (token) => {
    processAccess(scanQR(token, 'ENTRY'));
  };

  return (
    <AppLayout>
      <TopBar
        title="Control de Accesos"
        subtitle="Estación de recepción"
        showLive={true}
      />
      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          <ScannerPanel
            isManualMode={isManualMode}
            manualDni={manualDni}
            onManualDniChange={setManualDni}
            onValidateDni={handleValidateDni}
            onActivateCamera={() => setIsManualMode(false)}
            onActivateManual={() => setIsManualMode(true)}
            onScan={handleScanQR}
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
