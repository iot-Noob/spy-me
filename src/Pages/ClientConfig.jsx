//--------------imports start--------------
import React, { useState, useEffect, useRef } from "react";
import { notifyUser } from "../Helper/WindowsNotification";
import WebRTCManager from "../Helper/WebRTCManager";
import { toast } from "react-toastify";
import { getClients, updateAnswer } from "../Helper/Requests";
import { IoMdRefresh } from "react-icons/io";
import { addLocalMedia } from "../Helper/LocalStreamer";
//--------------imports End--------------

const ClientConfig = () => {
  //--------------State Manager start--------------
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  let peerRef = useRef(null);
  let [refresh, setRefresh] = useState(false);
  let [cd, Scd] = useState();
  let [peerStatus, setPeerStatus] = useState();
  let localVideoRef = useRef(null);
  //--------------State Manager End--------------

  //--------------Peer manager start--------------

  let refresh_client = () => {
    setRefresh((prev) => !prev);
  };

  const createPeerForUser = () => {
    if (peerRef.current) {
      // if old peer exists, clean it first
      console.log(`Cleaning old pee...`);
      peerRef.current.close();
      peerRef.current.destroy?.();
    }

    const newPeer = new WebRTCManager();
    newPeer.createPeer(true);
    peerRef.current = newPeer;
    toast.success("Peer creation sucess");
  };
  const deletePeerForUser = () => {
    if (peerRef.current) {
      try {
        peerRef.current.close();
        peerRef.current.destroy?.();
        delete peerRef.current; // remove reference
        console.log("Deleted peer object ", selectedClient);
        toast.success(`Peer for  destroyed successfully.`);
        refresh_client();
        return true;
      } catch (err) {
        console.error(`Failed to destroy peer for ${selectedClient}:`, err);
        toast.error(`Failed to destroy peer for ${selectedClient}`);

        return false;
      }
    } else {
      console.warn(`Peer does not exist for ${selectedClient}`);
      toast.error(`Peer does not exist for ${selectedClient}`);
      return false;
    }
  };
  const stopAudio = (localStream) => {
    if (!localStream) return;

    localStream.getAudioTracks().forEach((track) => {
      track.enabled = false; // disables sending audio to remote peer
      // OR completely stop it:
      // track.stop();
    });
  };
  const showPeerForUser = () => {
    const peer = peerRef.current;

    if (!peer) {
      console.log("No peer currently exists.");
      return;
    }

    console.log("Current peer:", peer);
  };

  let showStatusForPeer = () => {
    const peer = peerRef.current;
    if (!peer) return null;

    try {
      const status = peer.getStatus(); // get current peer status
      console.log(status);
      // Update peerStatus state for the selected client
      setPeerStatus(status);

      // if (status?.peerConnectionState !== "connected") {
      //   peerRef?.current?.close();
      //   peerRef?.current?.destroy?.();
        
      // }

      // setPeerStatus((prev) => ({
      //   ...prev,
      //   [selectedClient]: {
      //     status: status,
      //     peer: peer,
      //   },
      // }));
    } catch (err) {
      toast.error(`User ${selectedClient} → Error getting status: ${err}`);
      return null;
    }
  };

  //--------------Peer manager end--------------

  //

  let fetch_clients = async () => {
    //fetch clients from api and show them on table
    let clientList = await getClients(); // { client_ids: [...] }

    let promises = clientList.client_ids.map((cid) => getClients(cid)); // now hits ?id=cid
    let temp = await Promise.all(promises);

    console.log(temp);
    setClients(temp);
  };

  //

  //--------------Business Logic Start--------------
  // Dummy clients for UI purposes
  useEffect(() => {
    fetch_clients();
  }, [refresh]);

  const handleSetAnswer = async () => {
    try {
      let clientDetails = "";
      if (!peerRef.current) {
        console.error("Peer not init,Initialise new peer ");
        createPeerForUser();
      } else {
        for (let c of clients) {
          const clientId = Object.keys(c)[0];
          if (clientId === selectedClient) {
            clientDetails = c[clientId];
            Scd(clientDetails);
            break;
          }
        }
        //--------Add media data start--------
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        console.log("lcoal_fucking_stream:::",localStream)
        // peerRef.current.addStream(localStream);
        // if(peerStatus?.peerConnectionState !== "connected"){
        //   stopAudio(localStream)
        // }
        //--------Add media data End--------
        if (clientDetails.sdp && clientDetails.ice?.length > 0) {
          let sdp = clientDetails.sdp;
          let ice = clientDetails.ice;
          let ans = await peerRef.current.createAnswer(
            { type: "offer", sdp: sdp },
            ice,
            localStream
          );
          let aid = peerRef.current.iceCandidates;
          console.log("answer:::", ans);
          console.log("ice:::", aid);
          try {
            let res = await updateAnswer({
              client_id: selectedClient,
              answer_sdp: ans.sdp,
              ice: aid,
            }).catch((reason) => {
              throw new Error(`Error get rsponse from api due to ${reason}`);
            });
            if (res.status === 200) {
              toast.success("Answer signal update sucess!!");
            }
          } catch (err) {
            throw new Error(`Error occur uypdate api due to\n\n ${err}`);
          }
        } else {
          console.error("SDP and ice settings missing");
        }
      }
    } catch (err) {
      toast.error(`Error create answer due to ${err}`);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      showStatusForPeer();
    }, 1000); // update every 1 second (adjust as needed)

    return () => clearInterval(interval); // cleanup on unmount
  }, []);
  //--------------Business Logic End--------------

  //--------------UIUX Start--------------
  return (
    <div className="p-4 max-w-md mx-auto">
      <label className="block mb-2 font-semibold" htmlFor="client-select">
        Select Client
      </label>
      <select
        id="client-select"
        className="select select-bordered w-full mb-4"
        value={selectedClient}
        onChange={(e) => {
          const clientId = e.target.value;

          // Destroy old peer
          if (peerRef.current) {
            deletePeerForUser();
          }

          setSelectedClient(clientId);

          // Update client details
          const clientObj = clients.find((c) => Object.keys(c)[0] === clientId);
          if (clientObj) {
            Scd(clientObj[clientId]);
          } else {
            Scd(null);
          }

          // Immediately create a new peer for this client
          createPeerForUser();
        }}
      >
        <option value="" disabled>
          -- Select a Client --
        </option>
        {clients.map((client, idx) => {
          const id = Object.keys(client)[0];
          return (
            <option key={idx} value={id}>
              {id}
            </option>
          );
        })}
      </select>

      <button
        onClick={handleSetAnswer}
        className="btn btn-primary w-full"
        disabled={
          !selectedClient ||
          !(cd?.sdp && cd?.ice?.length > 0) ||
          peerStatus?.peerConnectionState === "connected"
        }
      >
        Set Answer
      </button>
      <button
        disabled={peerStatus?.peerConnectionState === "connected"}
        onClick={() => {
          refresh_client();
        }}
        className="btn btn-primary  "
      >
        <IoMdRefresh size={17} />
      </button>
    </div>
  );
};

export default ClientConfig;
//--------------UIUX Start--------------
