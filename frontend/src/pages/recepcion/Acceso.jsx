import React, { useState, useRef, useEffect } from 'react';

export default function Acceso() {
  const [dni, setDni] = useState('');
  const [status, setStatus] = useState(null); // 'active', 'expired', 'not_found'
  const [isCameraActive, setIsCameraActive] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  const handleScan = (e) => {
    e.preventDefault();
    if (!dni.trim()) return;

    if (dni.startsWith('1')) {
      setStatus('active');
    } else if (dni.startsWith('2')) {
      setStatus('expired');
    } else {
      setStatus('not_found');
    }
    
    setTimeout(() => {
      setDni('');
      setStatus(null);
      inputRef.current?.focus();
    }, 4000);
  };

  return (
    <div className="h-full flex flex-col max-w-[1200px] mx-auto">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Control de accesos</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-bold tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              EN VIVO
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">Estación de recepción - sin molinetes</p>
        </div>
        <div className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/20 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          Aforo 136/200
        </div>
      </div>

      <div className="flex-1 border-t border-[#2A2A2A] pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Scanner */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4 flex flex-col">
          <div className="flex-1 bg-[#0A0A0A] rounded-xl flex flex-col items-center justify-center relative overflow-hidden border border-[#222] min-h-[400px]">
            {isCameraActive ? (
              <>
                <div className="relative w-48 h-48 mb-8">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#FF5C00]"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#FF5C00]"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#FF5C00]"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#FF5C00]"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-500 font-mono text-sm absolute bottom-8">esperando QR del socio...</p>
              </>
            ) : (
              <form onSubmit={handleScan} className="w-full max-w-sm px-8">
                <input
                  ref={inputRef}
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ingresar DNI..."
                  className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-center text-white focus:outline-none focus:border-[#FF5C00]"
                />
                <button type="submit" className="hidden">Submit</button>
              </form>
            )}
          </div>
          
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setIsCameraActive(false)}
              className="flex-1 py-3 bg-[#2A2A2A] hover:bg-[#333] rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 border border-[#333]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
              DNI manual
            </button>
            <button 
              onClick={() => setIsCameraActive(true)}
              className="flex-1 py-3 bg-[#FF5C00] hover:bg-[#e05200] rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Activar cámara
            </button>
          </div>
        </div>

        {/* Right Side: Validation Panel */}
        <div className={`bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] flex flex-col overflow-hidden ${
          status === 'active' ? 'border-l-4 border-l-green-500' :
          status === 'expired' ? 'border-l-4 border-l-red-500' :
          status === 'not_found' ? 'border-l-4 border-l-yellow-500' :
          'border-l-4 border-l-[#333]'
        }`}>
          {status ? (
            <div className="flex flex-col h-full p-6">
              {/* Header Status */}
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  status === 'active' ? 'bg-green-500' :
                  status === 'expired' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}>
                  {status === 'active' && <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  {status === 'expired' && <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                  {status === 'not_found' && <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${
                    status === 'active' ? 'text-green-500' :
                    status === 'expired' ? 'text-red-500' :
                    'text-yellow-500'
                  }`}>
                    {status === 'active' ? 'Acceso permitido' :
                     status === 'expired' ? 'Acceso denegado' : 'Atención'}
                  </h2>
                  <p className="text-xs text-gray-500">validado en 42 ms · {status === 'active' ? 'entrada registrada' : 'acceso bloqueado'}</p>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-[#222] rounded-xl p-4 flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full border border-[#444] bg-[#1A1A1A] flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Nombre del Socio</h3>
                  <p className="text-sm text-gray-400">DNI 30.123.456</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-auto">
                <div className="bg-[#222] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">Membresía</p>
                  {status === 'active' ? (
                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       Activa · Premium
                     </span>
                  ) : status === 'expired' ? (
                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                       Vencida
                     </span>
                  ) : (
                    <span className="text-gray-400 text-sm">No registrada</span>
                  )}
                </div>
                <div className="bg-[#222] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">Vence</p>
                  <p className="text-sm font-bold text-white">28 Jun 2026</p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button className="flex-1 py-3 bg-transparent border border-[#333] hover:bg-[#2A2A2A] rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                   Registrar salida
                </button>
                <button className="flex-1 py-3 bg-[#FF5C00] hover:bg-[#e05200] rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                   Confirmar entrada
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <svg className="w-16 h-16 text-[#333] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <h3 className="text-xl font-bold text-gray-400 mb-2">Esperando escaneo</h3>
              <p className="text-sm text-gray-600">El resultado de la validación aparecerá aquí.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
