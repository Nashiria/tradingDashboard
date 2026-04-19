import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import { AlertTriggerEvent } from '../models/Alert';
import { useAuth } from './AuthContext';
import {
  parseMarketDataMessage,
  sendHeartbeat,
} from '../services/marketDataSocket';

interface WebSocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
  notifications: AlertTriggerEvent[];
  dismissNotification: (alertId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  ws: null,
  isConnected: false,
  notifications: [],
  dismissNotification: () => undefined,
});

const MAX_RECONNECT_ATTEMPTS = 3;

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { token } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<AlertTriggerEvent[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(
    (attempt = 0) => {
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const baseUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
      const wsUrl = token
        ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
        : baseUrl;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      setWs(socket);

      socket.onopen = () => {
        setIsConnected(true);

        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          sendHeartbeat(socket);
        }, 30000);
      };

      socket.onmessage = (event) => {
        const message = parseMarketDataMessage(event.data);
        if (message?.type === 'PONG') {
          // Heartbeat acknowledged
        } else if (message?.type === 'ERROR') {
          console.warn(
            'WebSocket subscription error:',
            message.message,
            message.invalidTickers,
          );
        } else if (message?.type === 'ALERT_TRIGGERED') {
          setNotifications((previous) =>
            [
              message.data,
              ...previous.filter(
                (item) => item.alert.id !== message.data.alert.id,
              ),
            ].slice(0, 4),
          );
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        setWs(null);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        wsRef.current = null;

        if (!shouldReconnectRef.current || attempt >= MAX_RECONNECT_ATTEMPTS) {
          return;
        }

        const timeout = Math.min(1000 * Math.pow(2, attempt), 30000);
        reconnectTimeoutRef.current = setTimeout(
          () => connect(attempt + 1),
          timeout,
        );
      };

      socket.onerror = () => {
        socket.close();
      };
    },
    [token],
  );

  useEffect(() => {
    shouldReconnectRef.current = true;
    setNotifications([]);
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        // Prevent onclose from triggering a reconnect when unmounting intentionally
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider
      value={{
        ws,
        isConnected,
        notifications,
        dismissNotification: (alertId: string) =>
          setNotifications((previous) =>
            previous.filter((item) => item.alert.id !== alertId),
          ),
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
