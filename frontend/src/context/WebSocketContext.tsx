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

export type WebSocketConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting';

interface WebSocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
  connectionState: WebSocketConnectionState;
  notifications: AlertTriggerEvent[];
  dismissNotification: (alertId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  ws: null,
  isConnected: false,
  connectionState: 'connecting',
  notifications: [],
  dismissNotification: () => undefined,
});

const MAX_RECONNECT_DELAY_MS = 30000;

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, isLoading } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] =
    useState<WebSocketConnectionState>('connecting');
  const [notifications, setNotifications] = useState<AlertTriggerEvent[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback((attempt = 0) => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const baseUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
    const wsUrl = baseUrl;
    setConnectionState(attempt === 0 ? 'connecting' : 'reconnecting');
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    setWs(socket);

    socket.onopen = () => {
      setIsConnected(true);
      setConnectionState('connected');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }

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

      if (!shouldReconnectRef.current) {
        return;
      }

      setConnectionState('reconnecting');
      const timeout = Math.min(
        1000 * Math.pow(2, attempt),
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectTimeoutRef.current = setTimeout(
        () => connect(attempt + 1),
        timeout,
      );
    };

    socket.onerror = () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    shouldReconnectRef.current = true;
    setNotifications([]);
    setConnectionState('connecting');
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
  }, [connect, user?.id, isLoading]);

  return (
    <WebSocketContext.Provider
      value={{
        ws,
        isConnected,
        connectionState,
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
