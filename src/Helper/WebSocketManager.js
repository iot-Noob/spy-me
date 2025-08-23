// WebSocketManager.js
import { v4 as uuidv4 } from "uuid";

export default class WebSocketManager {
  constructor(url, { id, onMessage, onOpen, onClose, onError } = {}) {
    this.url = url;
    this.clientId = id || uuidv4();
    this.ws = null;
    this.isConnected = false;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.messageQueue = []; // store if sending before connected
  }
  
  connect() {
    if (!this.url) throw new Error("WebSocket URL is required");

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.send({ type: "register", clientId: this.clientId });

      // flush queued messages
      this.messageQueue.forEach((msg) => this.ws.send(msg));
      this.messageQueue = [];

      if (this.onOpen) this.onOpen();
    };

this.ws.onmessage = (event) => {
  console.log("Raw WS message:", event.data);
  try {
    const data = JSON.parse(event.data);
    console.log("Parsed WS message:", data);
    if (this.onMessage) this.onMessage(data);
  } catch (err) {
    console.error("Invalid message:", event.data);
  }
};


    this.ws.onclose = () => {
      this.isConnected = false;
      if (this.onClose) this.onClose();
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      if (this.onError) this.onError(err);
    };
  }

  send(payload) {
    const msg = JSON.stringify({
      clientId: this.clientId,
      ...payload,
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      console.warn("Queueing message, WS not ready yet");
      this.messageQueue.push(msg);
    }
  }

disconnect() {
  if (this.ws) {
    if (this.ws.readyState === WebSocket.OPEN) {
      // only send disconnect if connection is alive
      this.ws.send(JSON.stringify({ type: "disconnect", clientId: this.clientId }));
    }

    this.ws.onopen = null;
    this.ws.onmessage = null;
    this.ws.onclose = null;
    this.ws.onerror = null;

    this.ws.close();
    this.ws = null;
    this.isConnected = false;
  }
}


  setUrl(newUrl) {
    this.url = newUrl;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }

  setId(newId) {
    this.clientId = newId;
  }
}
