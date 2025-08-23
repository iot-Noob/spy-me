// hooks/useWebSocketClient.js
import { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

const useWebSocketClient = (
  initialUrl,
  { id, onMessage, onOpen, onClose, onError } = {}
) => {
  const [wsUrl, setWsUrl] = useState(initialUrl);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const clientIdRef = useRef(id || uuidv4());
  const clientId = clientIdRef.current;

  // ---- Send data ----
  const sendMessage = useCallback(
    (payload) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          const message = JSON.stringify({
            clientId,
            ...payload,
          });
          wsRef.current.send(message);
          setMessages((prev) => [...prev, { outgoing: true, ...payload }]);
        } catch (err) {
          console.error("Send error:", err);
          setError(err);
        }
      } else {
        console.warn("WebSocket not ready");
      }
    },
    [clientId]
  );

  // ---- Disconnect manually ----
  const disconnect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "disconnect", clientId }));
      }
      wsRef.current?.close();
      setIsConnected(false);
    } catch (err) {
      console.error("Disconnect error:", err);
      setError(err);
    }
  }, [clientId]);

  // ---- WebSocket setup ----
  useEffect(() => {
    if (!wsUrl) return; // don’t connect if no url

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      sendMessage({ type: "register" });
      if (onOpen) onOpen();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, { outgoing: false, ...data }]);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error("Invalid message:", event.data);
        setError(err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (onClose) onClose();
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError(err);
      if (onError) onError(err);
    };

    wsRef.current = ws;

    return () => {
      disconnect();
    };
  }, [
    wsUrl,
    clientId,
    sendMessage,
    disconnect,
    onMessage,
    onOpen,
    onClose,
    onError,
  ]);

  // ---- API ----
  const setId = useCallback((newId) => {
    clientIdRef.current = newId;
  }, []);

  const setUrl = useCallback((newUrl) => {
    setWsUrl(newUrl);
  }, []);

  return {
    wsRef,
    setUrl,
    setId,
    clientId,
    isConnected,
    messages,
    error,
    sendMessage,
    disconnect,
    setMessages
  };
};

export default useWebSocketClient;
