import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import TestPortal from "../Components/TestPortal";
import { MdEdit } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import ActionModal from "../Components/ActionModal";
import { IoIosAddCircle } from "react-icons/io";
import CustModal from "../Components/CustModal";
import {} from "../Store/WebRTC";
import { useDispatch, useSelector } from "react-redux";
import WebRTCManager from "../Helper/WebRTCManager";
import RtcSettingsModal from "../Components/RtcSettingsModal";
import { RxUpdate } from "react-icons/rx";
const API_BASE = import.meta.env.VITE_API_URL;

const AdminPanel = () => {
  const [data, setData] = useState([]);
  const [modOpen, setModOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [scid, Sscid] = useState();
  const [confMod, setConfMod] = useState(false);
  let [trig, setTig] = useState(false);

  let update_fetch = () => {
    let ctm = setTimeout(() => {
      setTig(true);
    }, 100);
    setTig(false);
    return () => clearTimeout(ctm);
  };

  let dispatch = useDispatch();

  let custModRef = useRef();
  let pref = useRef();

  let handle_cust_mod = () => {
    custModRef.current.showModal();
  };

  useEffect(() => {
    console.log("create new webrtc connection.");
    let rtcManager = new WebRTCManager();

    pref.current = rtcManager;
  }, []);

  const all_clients = async () => {
    try {
      const rdata = await axios.get(`${API_BASE}/get_clients`);
      const clientIds = rdata?.data?.client_ids || [];

      const details = await Promise.all(
        clientIds.map(async (id) => {
          const res = await axios.get(`${API_BASE}/get_clients?id=${id}`);
          return res.data;
        })
      ).catch((err) => {
        toast.error(`Error fetch data ${err}`);
      });

      setData(details);
    } catch (err) {
      console.error("Error fetching clients:", err);
      toast.error("Failed to load clients");
    }
  };

  useEffect(() => {
    all_clients();
  }, [trig]);

  const openModal = (clientDetails) => {
    setSelectedClient(clientDetails);
    setModOpen(true);
  };

  const closeModal = () => {
    setModOpen(false);
    setSelectedClient(null);
    Sscid(null);
  };

  let handle_delete = async () => {
    try {
      if (!selectedClient) {
        toast.error("Error: no client selected");
        return;
      }

      const dr = await axios.delete(
        `${API_BASE}/delete_client/${selectedClient}`
      );

      if (dr.status === 200) {
        toast.success(`Deleted user ${selectedClient} successfully`);
        all_clients();
        setSelectedClient(null);
      } else {
        // If response status not 200, try to show server message or fallback
        const errorMsg = dr.statusText || "Unknown error";
        throw new Error(errorMsg);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        toast.error(`Error deleting client: ${err.response.data.detail}`);
      } else {
        toast.error(`Error deleting client: ${err.message || err}`);
      }
      console.error("Error deleting client:", err);
    } finally {
      setConfMod(false);
      setSelectedClient(null);
      Sscid(null);
    }
  };

  let recreatePeerOnExistingSDP = async (desc) => {
    try {
      return await pref.current.combined_offer(desc);
    } catch (err) {
      toast.error(`Error create Peer existing due to ${err}`);
      console.error("Error recreating peer with existing SDP:", err);
      throw err;
    }
  };

  let add_settings = async (id) => {
    try {
      if (!pref.current.peer) {
        pref.current.createPeer(); // Initialize peer connection
      }

      pref.current.createDataChannel("hbeat");

      const offer = await pref.current.createOffer();

      const response = await axios.post(`${API_BASE}/register_sdp`, {
        client_id: id,
        sdp: offer.sdp,
      });

      if (response.status === 200) {
        update_fetch();
        toast.success("Successfully added user");
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        toast.error(`Error adding data: ${err.response.data.detail}`);
      } else {
        toast.error(`Error adding data: ${err.message || err}`);
      }
      console.error("Error creating offer or registering SDP:", err);
    } finally {
      custModRef.current.close();
      setSelectedClient(null);
      Sscid(null);
    }
  };

  let updateOffer = async () => {
    try {
      if (pref.current && pref.current.peer) {
        const offer = await pref.current.createOffer();
        if (offer && offer.sdp) {
          try {
            let res = await axios.put(`${API_BASE}/update_sdp`, {
              client_id: scid, // this must be a string like "abc123"
              sdp: offer.sdp, // the SDP string
            });
            if (res.status === 200) {
              toast.success(`Offer updated for ${scid} successfully.`);
            } else {
              // If not 200, show a generic error
              toast.error(
                `Failed to update offer: ${res.statusText || "Unknown error"}`
              );
            }
          } catch (axiosErr) {
            // Handle axios errors (network/server errors)
            if (axiosErr.response?.data?.detail) {
              toast.error(
                `Error updating offer: ${axiosErr.response.data.detail}`
              );
            } else {
              toast.error(
                `Error updating offer: ${axiosErr.message || axiosErr}`
              );
            }
          }
        } else {
          toast.error("Invalid offer generated.");

          pref.current.combined_offer();
        }
      } else {
        toast.error("Peer connection is not initialized.");
      }
    } catch (err) {
      toast.error(`Error updating offer due to: ${err.message || err}`);
    } finally {
      setSelectedClient(null);
     
    }
  };

  return (
    <>
      {modOpen && (
        <TestPortal
          showModal={modOpen}
          data={selectedClient}
          onClose={closeModal}
          onUpdate={updateOffer}
        />
      )}

      <RtcSettingsModal
        dialogRef={custModRef}
        onAddSettings={add_settings}
        pref={pref}
      />

      {/* Header Section */}
      <div className="p-4 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center sm:justify-between">
        <h2 className="text-lg sm:text-xl font-semibold">Client Management</h2>
        <button
          className="btn btn-circle btn-primary"
          title="Add Client"
          onClick={() => {
            handle_cust_mod();
          }}
        >
          <IoIosAddCircle size={28} />
        </button>
      </div>

      {/* Table Section */}
      <div className="p-4 w-full overflow-x-auto">
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
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-500">
                  No clients found.
                </td>
              </tr>
            )}
            {data.map((obj, index) => {
              const id = Object.keys(obj)[0];

              const details = obj[id];

              return (
                <tr key={index}>
                  <td className="break-all">{id}</td>
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
                        onClick={() => {
                          openModal(details);
                          Sscid(id);
                        }}
                        className="btn btn-circle btn-xs sm:btn-sm btn-info"
                        title="Edit Client"
                      >
                        <MdEdit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClient(id);
                          setConfMod(true);
                          Sscid(id);
                        }}
                        className="btn btn-circle btn-xs sm:btn-sm btn-error"
                        title="Delete Client"
                      >
                        <AiFillDelete size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ActionModal
        showModal={confMod}
        onClose={() => setConfMod(false)}
        onConfirm={handle_delete}
      />
    </>
  );
};

export default AdminPanel;
