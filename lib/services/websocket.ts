// Real-time WebSocket Service for Live Updates
'use client';

export interface WebSocketMessage {
  type: 'computation_update' | 'approval_update' | 'user_activity' | 'system_status';
  workspaceId: string;
  data: any;
  timestamp: Date;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners = new Map<string, Set<(message: WebSocketMessage) => void>>();
  private isConnected = false;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(workspaceId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      // In production, this would be wss://your-domain.com/ws
      const wsUrl = `ws://localhost:3000/ws?workspaceId=${workspaceId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send initial subscription message
        this.send({
          type: 'subscribe',
          workspaceId,
          timestamp: new Date()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.attemptReconnect(workspaceId);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect(workspaceId);
    }
  }

  private attemptReconnect(workspaceId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(workspaceId);
    }, delay);
  }

  private handleMessage(message: WebSocketMessage): void {
    const typeListeners = this.listeners.get(message.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Error in WebSocket message listener:', error);
        }
      });
    }

    // Also notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Error in global WebSocket listener:', error);
        }
      });
    }
  }

  subscribe(
    messageType: string | '*',
    listener: (message: WebSocketMessage) => void
  ): () => void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }
    
    this.listeners.get(messageType)!.add(listener);

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(messageType);
      if (typeListeners) {
        typeListeners.delete(listener);
        if (typeListeners.size === 0) {
          this.listeners.delete(messageType);
        }
      }
    };
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// React hook for using WebSocket in components
import { useEffect, useState, useCallback } from 'react';

export function useWebSocket(workspaceId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = WebSocketService.getInstance();

  useEffect(() => {
    ws.connect(workspaceId);
    
    const unsubscribe = ws.subscribe('*', (message) => {
      setLastMessage(message);
    });

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setIsConnected(ws.getConnectionStatus());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [workspaceId]);

  const subscribe = useCallback((
    messageType: string,
    listener: (message: WebSocketMessage) => void
  ) => {
    return ws.subscribe(messageType, listener);
  }, []);

  const send = useCallback((message: any) => {
    ws.send(message);
  }, []);

  return {
    isConnected,
    lastMessage,
    subscribe,
    send
  };
}

// Utility hook for specific message types
export function useWebSocketSubscription(
  workspaceId: string,
  messageType: string,
  onMessage: (message: WebSocketMessage) => void
) {
  const { subscribe } = useWebSocket(workspaceId);

  useEffect(() => {
    const unsubscribe = subscribe(messageType, onMessage);
    return unsubscribe;
  }, [messageType, onMessage, subscribe]);
}