import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import ScannerPanel from '../../components/recepcion/ScannerPanel';
import ValidationResult from '../../components/recepcion/ValidationResult';
import { scanQR, manualAccess } from '../../services/accessService';
import useWebSocket from '../../hooks/useWebSocket';
import { Wifi, WifiOff } from 'lucide-react';

const SCAN_RESULT_DISPLAY_MS = 8000;
/** Per-token debounce: ignore re-scan of the same token within 2s (fix #156-i) */
const TOKEN_DEBOUNCE_MS = 2000;
/** Network timeout for fetch calls — fix #156-d */
const FETCH_TIMEOUT_MS = 8000;

/**
 * Plays a short beep using Web Audio API.
 * @param {boolean} granted - true for high-pitched success, false for low-pitched denial.
 */
function playBeep(granted) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = granted ? 880 : 330;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + (granted ? 0.15 : 0.4));
    osc.onended = () => ctx.close();
  } catch {
    // Browser may block AudioContext without user interaction; fail silently.
  }
}

function vibrateDevice(granted) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(granted ? [80] : [200, 100, 200]);
    }
  } catch {
    // vibration API not supported; ignore.
  }
}

export default function AccesoTerminalPage() {
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualDni, setManualDni] = useState('');
  const [cameraError, setCameraError] = useState(null); // null | Error object
  /** 'ENTRY' | 'EXIT' — terminal mode selector (fix #148) */
  const [accessMode, setAccessMode] = useState('ENTRY');
  /** Connection health indicator (fix #156-d) */
  const [isServerReachable, setIsServerReachable] = useState(true);
  /** Mute toggle (fix #156-f) */
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('terminal_muted') === 'true';
    } catch {
      return false;
    }
  });

  /** Ref for auto-clear timer — prevents clearing a new result (fix #156-h) */
  const clearTimerRef = useRef(null);
  /** Map of token → timestamp for per-token debounce (fix #156-i) */
  const lastTokenScanRef = useRef(new Map());
  /** Ref for result div focus management (fix #156-g) */
  const resultRef = useRef(null);

  const { lastMessage } = useWebSocket('/ws/aforo/');
  const aforoActual = lastMessage?.aforo_actual ?? '--';

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('terminal_muted', String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const showResult = useCallback((result) => {
    // Cancel any pending auto-clear (fix #156-h)
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    setScanResult(result);
    // Move focus to result area for a11y (fix #156-g) — via effect below
    clearTimerRef.current = setTimeout(() => setScanResult(null), SCAN_RESULT_DISPLAY_MS);
  }, []);

  // Focus the result panel after it renders (fix #156-g)
  useEffect(() => {
    if (scanResult && resultRef.current) {
      resultRef.current.focus();
    }
  }, [scanResult]);

  // Cleanup timer on unmount (fix #156-h)
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  const processAccess = useCallback(async (fn) => {
    if (isProcessing) return;
    setIsProcessing(true);
    const timeoutId = setTimeout(() => {
      setIsServerReachable(false);
    }, FETCH_TIMEOUT_MS);

    try {
      const data = await fn();
      clearTimeout(timeoutId);
      setIsServerReachable(true);
      const granted = data.status === 'GRANTED';
      const result = {
        status: granted ? 'success' : 'error',
        message: data.message,
        denialReason: data.denial_reason,
        log: data.access_log,
        accessType: data.access_type,
      };
      showResult(result);
      if (!isMuted) {
        playBeep(granted);
        vibrateDevice(granted);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Network timeout / no connection (fix #156-d)
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout') || !navigator.onLine) {
        setIsServerReachable(false);
        showResult({
          status: 'error',
          message: 'No hay conexión con el servidor',
          denialReason: 'NETWORK_ERROR',
          log: null,
        });
        return;
      }
      setIsServerReachable(true);
      const errData = err?.response?.data;
      if (errData && errData.status === 'DENIED') {
        showResult({
          status: 'error',
          message: errData.message,
          denialReason: errData.denial_reason,
          log: errData.access_log,
          accessType: errData.access_type,
        });
        if (!isMuted) {
          playBeep(false);
          vibrateDevice(false);
        }
      } else {
        const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Error al validar acceso';
        showResult({
          status: 'error',
          message: detail,
          denialReason: 'ERROR_SERVIDOR',
          log: null,
        });
        toast.error(detail);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isMuted, showResult]);

  const handleValidateDni = useCallback(() => {
    const normalized = manualDni.replace(/\s/g, '');
    // Client-side validation: 7-8 digits (fix #156-e)
    if (!/^\d{7,8}$/.test(normalized)) {
      toast.error('El DNI debe tener 7 u 8 dígitos numéricos');
      return;
    }
    processAccess(() => manualAccess(normalized, accessMode));
    setManualDni('');
  }, [manualDni, accessMode, processAccess]);

  const handleScanQR = useCallback((token) => {
    const now = Date.now();
    const lastScan = lastTokenScanRef.current.get(token) ?? 0;
    // Per-token debounce: ignore re-scan within 2s (fix #156-i)
    if (now - lastScan < TOKEN_DEBOUNCE_MS) return;
    lastTokenScanRef.current.set(token, now);

    processAccess(() => scanQR(token, accessMode));
  }, [accessMode, processAccess]);

  const handleDniKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleValidateDni();
    }
  }, [handleValidateDni]);

  return (
    <AppLayout>
      <TopBar
        title="Control de Accesos"
        subtitle="Estación de recepción"
        showLive={true}
        rightContent={
          <div className="flex items-center gap-3">
            {/* Connection indicator — fix #156-d */}
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${
              isServerReachable
                ? 'bg-success-500/10 border-success-500/30 text-success-500'
                : 'bg-error-500/10 border-error-500/30 text-error-500'
            }`}>
              {isServerReachable
                ? <Wifi className="w-3.5 h-3.5" />
                : <WifiOff className="w-3.5 h-3.5" />}
              {isServerReachable ? 'Online' : 'Sin conexión'}
            </div>
            <div className="bg-bg-raised border border-subtle px-4 py-2 rounded-lg font-bold text-text-primary text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              Aforo {aforoActual}/200
            </div>
          </div>
        }
      />
      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        {/* Terminal mode selector — fix #148 */}
        <div className="flex justify-center">
          <div
            role="group"
            aria-label="Modo de acceso"
            className="inline-flex rounded-xl border border-subtle bg-bg-raised p-1 gap-1"
          >
            {(['ENTRY', 'EXIT']).map((mode) => (
              <button
                key={mode}
                onClick={() => setAccessMode(mode)}
                aria-pressed={accessMode === mode}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                  accessMode === mode
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {mode === 'ENTRY' ? 'Entrada' : 'Salida'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          <ScannerPanel
            isManualMode={isManualMode}
            manualDni={manualDni}
            onManualDniChange={setManualDni}
            onValidateDni={handleValidateDni}
            onDniKeyDown={handleDniKeyDown}
            onActivateCamera={() => {
              setIsManualMode(false);
              setCameraError(null);
            }}
            onActivateManual={() => setIsManualMode(true)}
            onScan={handleScanQR}
            cameraError={cameraError}
            onCameraError={(err) => {
              setCameraError(err);
              setIsManualMode(true);
            }}
            isPaused={isProcessing}
            isMuted={isMuted}
            onToggleMute={toggleMute}
          />
          {/* aria-live region + focusable result panel — fix #156-g */}
          <div
            ref={resultRef}
            tabIndex={-1}
            aria-live="polite"
            aria-atomic="true"
            className="outline-none"
          >
            <ValidationResult
              result={scanResult}
              onConfirmEntry={() => {
                if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
                setScanResult(null);
              }}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
