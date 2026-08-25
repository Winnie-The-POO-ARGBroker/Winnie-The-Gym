import { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import ScannerPanel from '../../components/recepcion/ScannerPanel';
import ValidationResult from '../../components/recepcion/ValidationResult';

export default function AccesoTerminal() {
  const [status, setStatus] = useState('idle'); // idle, success, error, warning
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualDni, setManualDni] = useState('');

  // Dummy function to simulate scanning
  const simulateScan = (type) => {
    setStatus(type);
    if (type !== 'idle') {
      setTimeout(() => setStatus('idle'), 5000); // reset after 5s
    }
  };

  const handleValidateDni = () => {
    if (!manualDni) return;
    const lastChar = manualDni.trim().slice(-1);
    let result = 'success';
    if (['0', '2', '4', '6'].includes(lastChar)) result = 'error';
    if (['3', '5', '7'].includes(lastChar)) result = 'warning';
    simulateScan(result);
    setManualDni('');
  };

  return (
    <AppLayout>
      <TopBar
        title="Control de Accesos"
        subtitle="Estación de recepción"
        showLive={true}
        rightContent={
          <div className="bg-bg-surface border border-subtle px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <span className="font-semibold text-text-primary">Aforo</span>
            <span className="text-text-secondary">136/200</span>
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
            onActivateCamera={() => setIsManualMode(false)}
            onActivateManual={() => setIsManualMode(true)}
          />
          <ValidationResult
            status={status}
            onConfirmEntry={() => {}}
            onRegisterExit={() => {}}
          />
        </div>
      </div>
    </AppLayout>
  );
}
