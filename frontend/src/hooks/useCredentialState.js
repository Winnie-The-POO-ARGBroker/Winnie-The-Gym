import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import api from '../services/api';

/**
 * The backend sends `expires_at` as UNIX seconds (an integer). `new Date(1792341600)`
 * reads it as milliseconds (January 1970), which made the countdown read 0 and the
 * QR refresh in a loop. Accept seconds, milliseconds and ISO strings.
 *
 * @param {number|string|null|undefined} value
 * @returns {Date|null}
 */
export function parseExpiresAt(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = typeof value === 'number'
    ? new Date(value < 1e12 ? value * 1000 : value)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * useCredentialState — encapsulates all QR credential logic for CredencialDigitalPage.
 *
 * Features:
 * - Fetches QR token from backend and tracks expires_at for accurate countdown.
 * - On visibilitychange: refreshes token if expired when returning to foreground.
 * - Network errors: marks QR as stale, retries once with backoff.
 * - Single toast per failure cycle (no spam).
 * - Fetches /api/access/credencial/estado/ for disabled-state rendering.
 *
 * @param {boolean} enabled - Fetch only when member data is ready.
 * @returns {{ qrToken, timeLeft, maxTime, isRefreshing, isStale, credentialState, refresh }}
 */
export default function useCredentialState({ enabled = false } = {}) {
  const [qrToken, setQrToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  /** true when the QR could not be refreshed due to a network failure */
  const [isStale, setIsStale] = useState(false);
  const [credentialState, setCredentialState] = useState(null); // { habilitado, motivo, cta }

  /** Prevents duplicate toast spam on repeated failures */
  const toastShownRef = useRef(false);
  /** Tracks retry count per failure cycle (reset on success) */
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 1;
  /** StrictMode guard — prevents double-fire on initial mount */
  const initialFetchDoneRef = useRef(false);

  // Derived maxTime from the first QR response — default 30s
  const maxTimeRef = useRef(30);

  const fetchCredencialEstado = useCallback(async () => {
    try {
      const res = await api.get('/access/credencial/estado/');
      setCredentialState(res.data);
    } catch {
      // Non-critical: silently ignore; the page still shows the QR
    }
  }, []);

  const refreshQR = useCallback(async ({ manual = false, isRetry = false } = {}) => {
    if (isRefreshing && !isRetry) return;
    setIsRefreshing(true);

    try {
      const res = await api.get('/access/qr/generate/');
      const token = res.data.qr_token;
      // Anchor on `expires_in` (relative to the server): comparing the server's
      // `expires_at` with the device clock breaks on phones with a wrong clock.
      const expiresIn = Number(res.data.expires_in);
      const backendExpiresAt = Number.isFinite(expiresIn) && expiresIn > 0
        ? new Date(Date.now() + expiresIn * 1000)
        : parseExpiresAt(res.data.expires_at);

      setQrToken(token);
      setIsStale(false);
      toastShownRef.current = false;
      retryCountRef.current = 0;

      if (backendExpiresAt) {
        const expiresDate = backendExpiresAt;
        setExpiresAt(expiresDate);
        const secondsLeft = Math.max(0, Math.round((expiresDate - Date.now()) / 1000));
        maxTimeRef.current = secondsLeft || 30;
        setTimeLeft(secondsLeft || 30);
      } else {
        // Fallback: 30-second countdown if backend doesn't send expires_at
        setExpiresAt(null);
        maxTimeRef.current = 30;
        setTimeLeft(30);
      }

      if (manual) {
        toast.success('Código QR actualizado');
      }
    } catch (error) {
      if (retryCountRef.current < MAX_RETRIES && !isRetry) {
        // Retry once with 2s backoff
        retryCountRef.current += 1;
        setTimeout(() => refreshQR({ manual: false, isRetry: true }), 2000);
      } else {
        // Mark QR as stale after exhausting retries
        setIsStale(true);
        if (!toastShownRef.current) {
          toast.error('No se pudo actualizar el QR. Revisá tu conexión.');
          toastShownRef.current = true;
        }
        retryCountRef.current = 0;
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Initial load — guarded against StrictMode double-fire
  useEffect(() => {
    if (!enabled) return;
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;
    refreshQR();
    fetchCredencialEstado();
    return () => {
      // On cleanup (StrictMode unmount/remount), reset the guard so the
      // second mount still fires but the duplicate call from the first is blocked.
      initialFetchDoneRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Countdown timer — drives from expiresAt when available, otherwise local decrement
  useEffect(() => {
    if (!qrToken) return;

    const timer = setInterval(() => {
      if (expiresAt) {
        const secondsLeft = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        setTimeLeft(secondsLeft);
        // While the last refresh failed (stale) or a retry is pending, wait: the retry,
        // the manual button and visibilitychange handle recovery. Insisting every
        // second hammered the API when offline.
        if (secondsLeft <= 0 && !isStale && retryCountRef.current === 0) {
          refreshQR();
        }
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            refreshQR();
            return maxTimeRef.current;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
    // refreshQR is stable (useCallback) — adding it avoids stale closure
  }, [qrToken, expiresAt, refreshQR, isStale]);

  // visibilitychange: refresh if QR is expired when user returns to the tab/app
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const expired = expiresAt
        ? Date.now() >= expiresAt.getTime()
        : timeLeft <= 0;

      if (expired || isStale) {
        refreshQR();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, expiresAt, timeLeft, isStale, refreshQR]);

  return {
    qrToken,
    timeLeft,
    maxTime: maxTimeRef.current,
    isRefreshing,
    isStale,
    credentialState,
    refresh: (manual = true) => refreshQR({ manual }),
  };
}
