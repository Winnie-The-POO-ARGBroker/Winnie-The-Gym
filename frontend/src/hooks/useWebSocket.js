import { useState, useEffect, useRef, useCallback } from 'react';
import useAuthStore from '../stores/authStore';
import { getApiNavigator } from '../services/api';

const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 30000;

export default function useWebSocket(path) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  const pingIntervalRef = useRef(null);

  const connect = useCallback(() => {
    // Determine the base WebSocket URL from the API URL
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const wsBaseUrl = apiBaseUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
    
    const token = useAuthStore.getState().accessToken;
    
    if (!token) {
      setIsConnecting(false);
      return;
    }

    const wsUrl = `${wsBaseUrl}${path}?token=${token}`;

    setIsConnecting(true);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0; // Reset attempts on successful connection
        
        // Mantener viva la conexión para que el proxy/servidor no la cierre por inactividad
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 25000); // 25 segundos
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          setLastMessage(event.data);
        }
      };

      ws.onclose = async (event) => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        setIsConnected(false);
        setIsConnecting(false);
        
        // Si el backend rechaza por token expirado/inválido (código 4401), intentar renovar el token
        if (event.code === 4401) {
          console.warn('WebSocket auth failed (4401). Attempting to refresh token...');
          const success = await useAuthStore.getState().refreshAuthToken();
          
          if (success) {
            console.log('Token refreshed successfully. Reconnecting WebSocket...');
            // Reseteamos los intentos para darle una chance limpia a la nueva sesión
            reconnectAttempts.current = 0; 
            connect();
            return;
          } else {
            console.error('Token refresh failed. Redirecting to login.');
            clearTimeout(reconnectTimeoutRef.current);
            useAuthStore.getState().clearAuth();
            const nav = getApiNavigator();
            if (nav) nav('/login');
            else window.location.href = '/login';
            return;
          }
        }
        
        // If forbidden (4403), stop retrying.
        if (event.code === 4403) {
          console.error('WebSocket connection forbidden (4403). Max permissions reached.');
          setError(new Error('No tienes permisos para acceder a esta información en tiempo real.'));
          return;
        }
        
        // Exponential backoff logic
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          const backoff = Math.min(
            INITIAL_BACKOFF_MS * (2 ** (reconnectAttempts.current - 1)),
            MAX_BACKOFF_MS
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoff);
        } else {
          setError(new Error('Max reconnection attempts reached.'));
        }
      };

      ws.onerror = (err) => {
        setError(err);
        // We let onclose handle the reconnection
      };
    } catch (err) {
      setError(err);
      setIsConnecting(false);
    }
  }, [path]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  return { isConnected, isConnecting, lastMessage, error, sendMessage };
}
