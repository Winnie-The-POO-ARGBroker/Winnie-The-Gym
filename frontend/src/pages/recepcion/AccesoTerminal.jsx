import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { QrCode, CreditCard, Camera, CheckCircle2, XCircle, AlertCircle, LogOut, Check, User } from 'lucide-react';

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

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Control de accesos
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1.5 font-medium border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              EN VIVO
            </span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Estación de recepción - sin molinetes</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-[#5bc0de]">
          <span className="font-semibold text-white">Aforo</span> 136/200
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left Side - Scanner */}
        <Card className="flex flex-col">
          <div className="flex-1 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a] flex items-center justify-center relative overflow-hidden mb-6">
            {isManualMode ? (
              <div className="w-full max-w-xs space-y-4 px-4 z-10">
                <h3 className="text-white font-medium text-center">Ingreso Manual de DNI</h3>
                <input 
                  type="text" 
                  value={manualDni}
                  onChange={(e) => setManualDni(e.target.value)}
                  placeholder="Ej. 30111222 (termina en 2 da error)" 
                  className="w-full bg-[#111111] border border-[#ff5a36] rounded-lg text-white placeholder-gray-500 px-4 py-3 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-1 focus:ring-[#ff5a36]" 
                />
                <Button variant="primary" className="w-full" onClick={() => {
                  if (!manualDni) return;
                  const lastChar = manualDni.trim().slice(-1);
                  let result = 'success';
                  if (['0', '2', '4', '6'].includes(lastChar)) result = 'error';
                  if (['3', '5', '7'].includes(lastChar)) result = 'warning';
                  simulateScan(result);
                  setManualDni('');
                }}>
                  Validar DNI
                </Button>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-64 h-64">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#ff5a36]"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#ff5a36]"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#ff5a36]"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#ff5a36]"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-[#ff5a36] opacity-50">
                      <QrCode className="w-24 h-24" />
                    </div>
                  </div>
                </div>
                <p className="absolute bottom-8 text-gray-500 font-mono text-sm">esperando QR del socio...</p>
              </>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button variant="secondary" className="w-full flex gap-2" onClick={() => setIsManualMode(true)}>
              <CreditCard className="w-4 h-4" /> DNI manual
            </Button>
            <Button variant="primary" className="w-full flex gap-2" onClick={() => setIsManualMode(false)}>
              <Camera className="w-4 h-4" /> Activar cámara
            </Button>
          </div>
          
          {/* Debug controls for demo */}
          <div className="mt-4 flex gap-2 justify-center">
             <button onClick={() => simulateScan('success')} className="w-3 h-3 rounded-full bg-green-500"></button>
             <button onClick={() => simulateScan('error')} className="w-3 h-3 rounded-full bg-red-500"></button>
             <button onClick={() => simulateScan('warning')} className="w-3 h-3 rounded-full bg-yellow-500"></button>
          </div>
        </Card>

        {/* Right Side - Validation Result */}
        <div className={`rounded-xl border border-[#2a2a2a] flex flex-col p-8 transition-colors duration-300 ${
          status === 'idle' ? 'bg-[#1a1a1a]' :
          status === 'success' ? 'bg-[#1a1a1a] border-l-[6px] border-l-[#4caf50]' :
          status === 'error' ? 'bg-[#1a1a1a] border-l-[6px] border-l-[#f44336]' :
          'bg-[#1a1a1a] border-l-[6px] border-l-[#ffc107]'
        }`}>
          {status === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
               <QrCode className="w-16 h-16 mb-4 opacity-50" />
               <p>Esperando escaneo...</p>
            </div>
          )}

          {status !== 'idle' && (
            <>
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  status === 'success' ? 'bg-[#4caf50] text-white' :
                  status === 'error' ? 'bg-[#f44336] text-white' :
                  'bg-[#ffc107] text-white'
                }`}>
                  {status === 'success' && <CheckCircle2 className="w-8 h-8" />}
                  {status === 'error' && <XCircle className="w-8 h-8" />}
                  {status === 'warning' && <AlertCircle className="w-8 h-8" />}
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${
                    status === 'success' ? 'text-[#4caf50]' :
                    status === 'error' ? 'text-[#f44336]' :
                    'text-[#ffc107]'
                  }`}>
                    {status === 'success' ? 'Acceso permitido' :
                     status === 'error' ? 'Acceso denegado' :
                     'Atención'}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {status === 'success' && 'validado en 42 ms • entrada registrada'}
                    {status === 'error' && 'validado en 45 ms • bloqueado'}
                    {status === 'warning' && 'validado en 40 ms • revisión sugerida'}
                  </p>
                </div>
              </div>

              <div className="bg-[#2a2a2a] rounded-xl p-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#3a3a3a] flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Nombre del Socio</h3>
                    <p className="text-gray-500 text-sm font-mono mt-1">DNI 30.123.456</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#2a2a2a] rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-xs text-gray-500 font-semibold mb-2 uppercase">Membresía</p>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium w-fit ${
                    status === 'error' ? 'bg-[#f44336]/20 text-[#f44336]' : 'bg-[#4caf50]/20 text-[#4caf50]'
                  }`}>
                    {status === 'error' ? <XCircle className="w-3.5 h-3.5"/> : <CheckCircle2 className="w-3.5 h-3.5"/>}
                    {status === 'error' ? 'Vencida' : 'Activa · Premium'}
                  </div>
                </div>
                <div className="bg-[#2a2a2a] rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-xs text-gray-500 font-semibold mb-2 uppercase">Vence</p>
                  <p className="text-sm font-medium text-white px-1">
                    {status === 'error' ? '28 May 2026' : '28 Jun 2026'}
                  </p>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-4">
                <Button variant="outline" className="text-gray-300 hover:text-white flex gap-2 w-full justify-center py-3">
                  <LogOut className="w-4 h-4" /> Registrar salida
                </Button>
                <Button className="bg-[#ff5a36] hover:bg-[#ff4520] text-white flex gap-2 w-full justify-center py-3">
                  <Check className="w-4 h-4" /> Confirmar entrada
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
