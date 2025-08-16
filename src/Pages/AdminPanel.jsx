/*
-----------------------Imports start-----------------------
*/

import React, { useEffect, useRef, useState, useMemo } from "react";
import { MdEdit } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import { IoIosAddCircle } from "react-icons/io";
import { RxUpdate } from "react-icons/rx";
import { ImPhoneHangUp } from "react-icons/im";
import { IoCallOutline } from "react-icons/io5";
import RtcSettingsModal from "../Components/RtcSettingsModal";
import {
  getClients,
  deleteClient,
  registerSDP,
  heartbeat,
  updateSDP,
} from "../Helper/Requests";
import CustModal from "../Components/CustModal";
import ActionModal from "../Components/ActionModal";
import { toast } from "react-toastify";
import { FaRegEye } from "react-icons/fa";
import TestPortal from "../Components/TestPortal";
import WebRTCManager from "../Helper/WebRTCManager";
import { MdDownload } from "react-icons/md";
/*
----------------Imports end----------------
*/
const AdminPanel = () => {
  /*
----------------State manager start----------------
*/
  const [clients, setClients] = useState([]);
  let rtcSettingsModalToggler = useRef(false);
  const [refresh, setRefresh] = useState(false);
  let [showDelModal, setShowDelModal] = useState(false);
  let [selectedUserId, setSelectUserId] = useState("");
  let [selectedUserData, setSelectedUserData] = useState({});
  let [showViewDataModal, setShowViewModal] = useState(false);
  let peerRef = useRef({});
  let [localIceCand, setLocalIceCand] = useState({});
  let [updatingUsers, setUpdatingUsers] = useState({});
  let [userSDP, setUserSDP] = useState({});

  /*
----------------State manager End----------------
*/

  //----------------Business logic start----------------

  //----------------Peer Handler start----------------

  const createPeerForUser = (userId) => {
    if (peerRef.current[userId]) {
      // if old peer exists, clean it first
      console.log(`Cleaning old peer for ${userId}...`);
      peerRef.current[userId].close();
      peerRef.current[userId].destroy?.();
    }

    const newPeer = new WebRTCManager();
    newPeer.createPeer(true);
    peerRef.current[userId] = newPeer;
  };

  const deletePeerForUser = (id) => {
    if (peerRef.current[id]) {
      try {
        peerRef.current[id].close();
        peerRef.current[id].destroy?.();
        delete peerRef.current[id]; // remove reference
        console.log("Deleted peer object for", id);
        toast.success(`Peer for ${id} destroyed successfully.`);
        refresh_client();
        return true;
      } catch (err) {
        console.error(`Failed to destroy peer for ${id}:`, err);
        toast.error(`Failed to destroy peer for ${id}`);
        return false;
      }
    } else {
      console.warn(`Peer does not exist for ${id}`);
      toast.error(`Peer does not exist for ${id}`);
      return false;
    }
  };
  const showPeerForUser = () => {
    try {
      const peers = peerRef.current;
      const ids = Object.keys(peers);

      if (ids.length === 0) {
        console.log("No peers currently exist.");
        return;
      }

      console.log("Current peers:");
      ids.forEach((id) => {
        console.log(`User ID: ${id}`, peers[id]);
      });
    } catch (err) {
      console.error("Error showing peers due to", err);
    }
  };
  //----------------Peer Handler End----------------

  let fetch_clients = async () => {
    //fetch clients from api and show them on table
    let clientList = await getClients(); // { client_ids: [...] }

    let promises = clientList.client_ids.map((cid) => getClients(cid)); // now hits ?id=cid
    let temp = await Promise.all(promises); // [{ id1: {...} }, { id2: {...} }]

    setClients(temp);
  };

  let refresh_client = () => {
    setRefresh((prev) => !prev);
  };

  useEffect(() => {
    fetch_clients();
  }, [refresh]);

  //----------------Handle delete users function logic----------------
  let select_delete_users = (id) => {
    if (!id) {
      toast.warn("ID missing!!");
      return;
    }

    setSelectUserId(id);
    setShowDelModal(true);
  };
  //----------------end----------------

  //----------------actual delete logic----------------

  let delete_user = async () => {
    try {
      if (peerRef.current[selectedUserId]) {
        console.log(
          "delete peer for ",
          selectedUserId,
          peerRef.current[selectedUserId]
        );
      }
      let dr = await deleteClient(selectedUserId);

      if (dr.status === 200) {
        toast.success(`Deleted user "${selectedUserId}" successfully`);

        refresh_client();
      }
    } catch (err) {
      toast.error(`Error deleting user ${selectedUserId} due to \n\n ${err}`);
    } finally {
      refresh_client();
      setShowDelModal(false);
      setSelectUserId("");
    }
  };

  //----------------actual delete logic end----------------

  //----------------Init WEBRTC start----------------

  // cleanup all peers on unmount
  useEffect(() => {
    return () => {
      Object.keys(peerRef.current).forEach((uid) => {
        console.log(`Disconnecting peer for ${uid}...`);
        peerRef.current[uid].close();
        peerRef.current[uid].destroy?.();
      });
      peerRef.current = {}; // clear reference
      console.log("All peers cleaned up!");
    };
  }, []);

  // ------------INIT webrtc END----------------

  // ------------Update Logic start----------------

  let update_data = async () => {
    if (!peerRef.current[selectedUserId]) {
      createPeerForUser(selectedUserId);
      showPeerForUser();
    }

    setUpdatingUsers((prev) => ({ ...prev, [selectedUserId]: true }));
    try {
      console.log(
        "updating user wiht active peer:::",
        peerRef.current[selectedUserId]
      );
      const offer = await peerRef.current[selectedUserId].createOffer();
      const iceCandidates = peerRef.current[selectedUserId].iceCandidates;

      if (offer && iceCandidates.length > 0) {
        setLocalIceCand((prev) => ({
          ...prev,
          [selectedUserId]: iceCandidates,
        }));
        setUserSDP((prev) => ({ ...prev, [selectedUserId]: offer.sdp }));
        let icd = localIceCand[selectedUserId];
        let sdp = userSDP[selectedUserId];
        console.log("ice candidate:::", icd);
        console.log("SDP:::", sdp);
        console.log("update existing signal data");
        if (selectedUserId) {
          try {
            let rnd = await updateSDP({
              client_id: selectedUserId,
              sdp: offer.sdp,
              ice: iceCandidates,
            }).catch((reason) =>
              toast.error(`Error add data to db due to\n\n${reason}`)
            );
            if (rnd.status === 200) {
              let hb = await heartbeat({
                client_id: selectedUserId,
                status: "disconnected",
              });
              if (hb.status === 200) {
                console.log("Heart beat update sucess");
              } else {
                console.error(
                  "Fail to update heartbeat due to ",
                  hb.data.details
                );
              }
              toast.success("Update signal data to db");
            }
          } catch (err) {
            toast.error(`Error add signal data to api due to ${err}`);
          } finally {
            refresh_client();
          }
        }
      }
    } catch (err) {
      toast.error(`Error update due to ${err}`);
    } finally {
      setUpdatingUsers((prev) => ({ ...prev, [selectedUserId]: false }));
    }
  };

  // ------------Update Logic End----------------

  //----------------Business logic End----------------

  //----------------Main Code Start----------------
  return (
    <>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Client Management</h2>
          <button
            className="btn btn-circle btn-primary"
            title="Add Client"
            onClick={() => {
              rtcSettingsModalToggler.current.showModal();
            }}
          >
            <IoIosAddCircle size={28} />
          </button>
        </div>

        <table className="table table-zebra w-full min-w-[500px]">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Heartbeat</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-500">
                  No clients found.
                </td>
              </tr>
            ) : (
              clients.map((client, idx) => {
                const id = Object.keys(client)[0]; // "test"
                const details = client[id]; // { sdp, status, last_heartbeat, ice }

                return (
                  <tr key={idx}>
                    <td>{id}</td>
                    <td>
                      <span
                        className={`badge ${
                          details.status === "connected"
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {details.status}
                      </span>
                    </td>
                    <td>
                      {new Date(details.last_heartbeat * 1000).toLocaleString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="btn btn-circle btn-xs btn-info"
                          title="View  Client"
                          onClick={async () => {
                            setSelectUserId(id);

                            try {
                              // Fetch latest client data before showing modal
                              const latestClient = await getClients(id);
                              const latestDetails = latestClient[id];
                              setSelectedUserData((prev) => ({
                                ...prev,
                                [id]: latestDetails,
                              }));
                              setShowViewModal(true);
                            } catch (err) {
                              toast.error(`Failed to load client data: ${err}`);
                            }
                          }}
                        >
                          <FaRegEye size={16} />
                        </button>
                        <button
                          disabled={updatingUsers[id]}
                          className={`btn btn-circle btn-xs ${
                            peerRef.current[id] ? "btn-primary" : "btn-error"
                          }`}
                          title={
                            peerRef.current[id]
                              ? "Download Peer"
                              : "Delete peer"
                          }
                          onClick={() => {
                            if (peerRef.current[id]) {
                              deletePeerForUser(id);
                            } else {
                              select_delete_users(id);
                              setSelectedUserData((prev) => ({
                                ...prev,
                                [id]: details,
                              }));
                            }
                          }}
                        >
                          {peerRef.current[id] ? (
                            <MdDownload size={16} />
                          ) : (
                            <AiFillDelete size={16} />
                          )}
                        </button>
                        <button
                          disabled={updatingUsers[id]}
                          onClick={async () => {
                            setSelectUserId(id);
                            await update_data();
                          }}
                          className="btn btn-circle btn-xs btn-primary"
                          title="Update SDP"
                        >
                          <RxUpdate size={16} />
                        </button>
                        <button
                          disabled={!peerRef.current[id] || updatingUsers[id]}
                          className="btn btn-circle btn-xs btn-primary"
                          title="Call Client"
                        >
                          <IoCallOutline size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <ActionModal
        onConfirm={() => {
          delete_user();
        }}
        showModal={showDelModal}
        onClose={() => {
          setShowDelModal(false);
        }}
        message={"Are you sure you want to delete this user"}
        title={`Delete user ${selectedUserId}`}
      />
      <RtcSettingsModal
        dialogRef={rtcSettingsModalToggler}
        rfrsh={refresh_client}
      />
      <TestPortal
        key={refresh}
        showModal={showViewDataModal}
        data={selectedUserData[selectedUserId]}
        onClose={() => {
          setShowViewModal(false);
          setSelectedUserData({});
        }}
      />
    </>
  );
};
//-----------------------Main Code End---------------------
export default AdminPanel;
