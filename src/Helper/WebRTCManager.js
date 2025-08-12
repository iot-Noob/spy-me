export default class WebRTCManager {
  constructor(config = {}) {
    this.config = config.iceServers
      ? config
      : {
          iceServers: [
            { urls: "stun:stun.l.google.com:5349" },
            { urls: "stun:stun1.l.google.com:3478" },
            { urls: "stun:stun1.l.google.com:5349" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:5349" },
            { urls: "stun:stun3.l.google.com:3478" },
            { urls: "stun:stun3.l.google.com:5349" },
            { urls: "stun:stun4.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:5349" },
          ],
        };

    this.peer = null;
    this.dataChannel = null;
    this.eventHandlers = {};
  }

  on(event, handler) {
    this.eventHandlers[event] = handler;
  }

  emit(event, ...args) {
    if (typeof this.eventHandlers[event] === "function") {
      this.eventHandlers[event](...args);
    }
  }

  createPeer() {
    try {
      this.peer = new RTCPeerConnection(this.config);

      this.peer.onicecandidate = (e) => {
        if (e.candidate) this.emit("ice-candidate", e.candidate);
      };

      this.peer.ontrack = (e) => {
        this.emit("track", e.streams[0]);
      };

      this.peer.ondatachannel = (e) => {
        this.dataChannel = e.channel;
        this._setupDataChannel(true);
      };

      this.peer.onconnectionstatechange = () => {
        this.emit("connection-state", this.peer.connectionState);
        if (
          this.peer.connectionState === "disconnected" ||
          this.peer.connectionState === "failed"
        ) {
          this.emit("disconnected");
        }
      };

      this.emit("peer-created", this.peer);
    } catch (err) {
      console.error("Failed to create peer connection:", err);
      throw err; // re-throw to let caller handle it
    }
  }

  createDataChannel(label = "data") {
    if (!this.peer) throw new Error("Peer not created yet.");
    try {
      this.dataChannel = this.peer.createDataChannel(label);
      this._setupDataChannel(false);
      return this.dataChannel;
    } catch (err) {
      console.error("Failed to create data channel:", err);
      throw err;
    }
  }

  _setupDataChannel(isReceiver) {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => this.emit("data-open", isReceiver);
    this.dataChannel.onclose = () => this.emit("data-close", isReceiver);
    this.dataChannel.onerror = (err) =>
      this.emit("data-error", err, isReceiver);
    this.dataChannel.onmessage = (e) =>
      this.emit("data-message", e.data, isReceiver);
  }

  addStream(stream) {
    if (!this.peer) throw new Error("Peer not created yet.");
    try {
      stream.getTracks().forEach((track) => this.peer.addTrack(track, stream));
    } catch (err) {
      console.error("Failed to add stream tracks:", err);
      throw err;
    }
  }

  async createOffer(description = null) {
    try {
      if (!this.peer) this.createPeer();

      if (description) {
        // Use the passed SDP description as local description
        await this.peer.setLocalDescription(
          new RTCSessionDescription(description)
        );
        return description; // Return the passed description
      } else {
        // Create a new offer if no description passed
        const offer = await this.peer.createOffer();
        await this.peer.setLocalDescription(offer);
        return offer;
      }
    } catch (err) {
      console.error("Failed to create or set offer:", err);
      throw err;
    }
  }

  combined_offer = async (desc) => {
    try {
      if (!this.peer) {
        this.createPeer();
      }
      return await this.createOffer(desc);
    } catch (err) {
      throw new Error(`Error combine offer due to ${err}`);
    }
  };

  async createAnswer(remoteOffer) {
    try {
      if (!this.peer) this.createPeer();
      await this.peer.setRemoteDescription(
        new RTCSessionDescription(remoteOffer)
      );
      const answer = await this.peer.createAnswer();
      await this.peer.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.error("Failed to create answer:", err);
      throw err;
    }
  }

  async setRemoteDescription(desc) {
    try {
      await this.peer.setRemoteDescription(new RTCSessionDescription(desc));
    } catch (err) {
      console.error("Failed to set remote description:", err);
      throw err;
    }
  }

  async addIceCandidate(candidate) {
    try {
      await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
      throw err;
    }
  }

  send(data) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(data);
    } else {
      const warnMsg = "Data channel not open";
      console.warn(warnMsg);
      throw new Error(warnMsg);
    }
  }

  getStatus() {
    return {
      peerConnectionState: this.peer?.connectionState || "not-created",
      iceConnectionState: this.peer?.iceConnectionState || "not-created",
      dataChannelState: this.dataChannel?.readyState || "no-channel",
    };
  }

  close() {
    try {
      if (this.dataChannel) this.dataChannel.close();
      if (this.peer) this.peer.close();
    } catch (err) {
      console.error("Error closing connection:", err);
    } finally {
      this.peer = null;
      this.dataChannel = null;
      this.emit("closed");
    }
  }
}
