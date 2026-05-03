import {
  insertIncomingMessage,
  markOutgoingMessageAsSent,
  type IncomingMessagePayload,
  type MessageAckPayload,
} from '@/database/repositories/messageRepository';
import { getSecureJwt } from '@/services/auth/secureAuthStorage';

const DEFAULT_WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3002';
const PING_INTERVAL_MS = 25000;
const PONG_TIMEOUT_MS = 10000;
const MAX_RECONNECT_DELAY_MS = 30000;

type SocketStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';
type SocketListener = (status: SocketStatus) => void;

type SocketEvent =
  | { type: 'ping'; payload?: never }
  | { type: 'pong'; payload?: never }
  | { type: 'RECEIVE_MESSAGE'; payload: IncomingMessagePayload }
  | { type: 'MESSAGE_ACK'; payload: MessageAckPayload }
  | { type: 'MESSAGE_SENT'; payload: MessageAckPayload };

type SendMessagePayload = {
  clientId: string;
  chatId: string;
  body?: string | null;
  mediaUrl?: string;
  objectKey?: string;
  type: 'text' | 'image';
  createdAt: number;
};

class ChatSocket {
  private socket: WebSocket | null = null;
  private status: SocketStatus = 'idle';
  private listeners = new Set<SocketListener>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  subscribe(listener: SocketListener) {
    this.listeners.add(listener);
    listener(this.status);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async connect() {
    if (this.socket && (this.status === 'connecting' || this.status === 'connected')) {
      return;
    }

    const jwt = await getSecureJwt();

    if (!jwt) {
      this.setStatus('closed');
      return;
    }

    this.shouldReconnect = true;
    this.clearReconnectTimer();
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const url = `${DEFAULT_WS_URL}?token=${encodeURIComponent(jwt)}`;
    this.socket = new WebSocket(url);
    this.socket.onopen = this.handleOpen;
    this.socket.onmessage = this.handleMessage;
    this.socket.onerror = this.handleError;
    this.socket.onclose = this.handleClose;
  }

  disconnect() {
    this.shouldReconnect = false;
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
    this.setStatus('closed');
  }

  sendMessage(payload: SendMessagePayload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(
      JSON.stringify({
        type: 'SEND_MESSAGE',
        payload,
      }),
    );

    return true;
  }

  private handleOpen = () => {
    this.reconnectAttempts = 0;
    this.setStatus('connected');
    this.startHeartbeat();
  };

  private handleMessage = (event: WebSocketMessageEvent) => {
    const data = parseSocketEvent(event.data);

    if (!data) {
      return;
    }

    switch (data.type) {
      case 'ping':
        this.sendRaw({ type: 'pong' });
        break;
      case 'pong':
        this.clearPongTimeout();
        break;
      case 'RECEIVE_MESSAGE':
        void insertIncomingMessage(data.payload);
        break;
      case 'MESSAGE_ACK':
      case 'MESSAGE_SENT':
        void markOutgoingMessageAsSent(data.payload);
        break;
    }
  };

  private handleError = () => {
    this.socket?.close();
  };

  private handleClose = () => {
    this.clearTimers();
    this.socket = null;

    if (!this.shouldReconnect) {
      this.setStatus('closed');
      return;
    }

    this.scheduleReconnect();
  };

  private startHeartbeat() {
    this.clearTimers();
    this.pingTimer = setInterval(() => {
      this.sendRaw({ type: 'ping' });
      this.pongTimeout = setTimeout(() => {
        this.socket?.close();
      }, PONG_TIMEOUT_MS);
    }, PING_INTERVAL_MS);
  }

  private scheduleReconnect() {
    this.reconnectAttempts += 1;
    this.setStatus('reconnecting');

    const delay = Math.min(
      1000 * 2 ** Math.min(this.reconnectAttempts - 1, 5),
      MAX_RECONNECT_DELAY_MS,
    );

    this.reconnectTimer = setTimeout(() => {
      void this.connect();
    }, delay);
  }

  private sendRaw(event: Pick<SocketEvent, 'type'>) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  private setStatus(status: SocketStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  private clearTimers() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    this.clearPongTimeout();
  }

  private clearPongTimeout() {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const chatSocket = new ChatSocket();

function parseSocketEvent(data: WebSocketMessageEvent['data']): SocketEvent | null {
  if (typeof data !== 'string') {
    return null;
  }

  try {
    return JSON.parse(data) as SocketEvent;
  } catch {
    return null;
  }
}
