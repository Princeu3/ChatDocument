"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FileAttachment } from "@/types/chat";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
}

interface UseWebSocketOptions {
  onMessageSaved?: (data: { id: string; role: string; content: string }) => void;
  onStreamStart?: () => void;
  onStreamChunk?: (content: string) => void;
  onStreamEnd?: (data: { id: string; content: string }) => void;
  onTitleUpdated?: (data: { conversation_id: string; title: string }) => void;
  onError?: (message: string) => void;
}

// Create a stable connection manager outside of React
function createWebSocketManager() {
  let ws: WebSocket | null = null;
  let clientId = "";
  let pingInterval: NodeJS.Timeout | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let listeners = new Set<() => void>();
  let messageListeners = new Set<(msg: WebSocketMessage) => void>();
  let connectionCount = 0;

  function getSnapshot() {
    return ws?.readyState === WebSocket.OPEN;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function notifyListeners() {
    listeners.forEach((listener) => listener());
  }

  function addMessageListener(listener: (msg: WebSocketMessage) => void) {
    messageListeners.add(listener);
    return () => {
      messageListeners.delete(listener);
    };
  }

  function connect() {
    connectionCount++;

    // Already connected or connecting
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Clear any pending reconnect
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    ws = new WebSocket(`${WS_URL}/ws/${clientId}`);

    ws.onopen = () => {
      console.log("WebSocket connected");
      notifyListeners();

      // Ping to keep alive
      pingInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        messageListeners.forEach((listener) => listener(message));
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      cleanup();
      notifyListeners();

      // Only reconnect if there are still active connections
      if (connectionCount > 0) {
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  function cleanup() {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  }

  function disconnect() {
    connectionCount--;

    // Only fully disconnect if no more connections
    if (connectionCount <= 0) {
      connectionCount = 0;
      cleanup();

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      if (ws) {
        ws.close();
        ws = null;
      }
    }
  }

  function send(data: object): boolean {
    if (ws?.readyState !== WebSocket.OPEN) {
      return false;
    }
    ws.send(JSON.stringify(data));
    return true;
  }

  return {
    connect,
    disconnect,
    send,
    subscribe,
    getSnapshot,
    addMessageListener,
  };
}

// Singleton manager
const wsManager = createWebSocketManager();

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);

  // Store options in ref to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Use React 18's useSyncExternalStore for connection state
  const isConnected = useSyncExternalStore(
    wsManager.subscribe,
    wsManager.getSnapshot,
    () => false // Server snapshot
  );

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case "message_saved":
          optionsRef.current.onMessageSaved?.(
            message.data as { id: string; role: string; content: string }
          );
          break;

        case "stream_start":
          setIsStreaming(true);
          optionsRef.current.onStreamStart?.();
          break;

        case "stream_chunk":
          optionsRef.current.onStreamChunk?.(message.data.content as string);
          break;

        case "stream_end":
          setIsStreaming(false);
          optionsRef.current.onStreamEnd?.(
            message.data as { id: string; content: string }
          );
          break;

        case "title_updated":
          optionsRef.current.onTitleUpdated?.(
            message.data as { conversation_id: string; title: string }
          );
          break;

        case "error":
          setIsStreaming(false);
          optionsRef.current.onError?.(message.data.message as string);
          break;
      }
    };

    return wsManager.addMessageListener(handleMessage);
  }, []);

  // Connect/disconnect following React's Effect pattern
  useEffect(() => {
    wsManager.connect();
    return () => {
      wsManager.disconnect();
    };
  }, []);

  const sendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      attachments: FileAttachment[] = []
    ) => {
      return wsManager.send({
        type: "chat",
        conversation_id: conversationId,
        content,
        attachments,
      });
    },
    []
  );

  return {
    isConnected,
    isStreaming,
    sendMessage,
  };
}
