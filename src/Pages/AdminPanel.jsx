/*
-----------------------Imports start-----------------------
*/

import React, { useEffect, useRef, useState } from "react";
import { MdEdit } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import { IoIosAddCircle } from "react-icons/io";
import { RxUpdate } from "react-icons/rx";
import { ImPhoneHangUp } from "react-icons/im";
import { IoCallOutline } from "react-icons/io5";
import RtcSettingsModal from "../Components/RtcSettingsModal";
import { getClients, deleteClient } from "../Helper/Requests";
import CustModal from "../Components/CustModal";
import ActionModal from "../Components/ActionModal";
import { toast } from "react-toastify";
import { FaRegEye } from "react-icons/fa";
import TestPortal from "../Components/TestPortal";
/*
-----------------------Imports end-----------------------
*/
const AdminPanel = () => {
  /*
-----------------------State manager start----------------------
*/
  const [clients, setClients] = useState([]);
  let rtcSettingsModalToggler = useRef(false);
  const [refresh, setRefresh] = useState(false);
  let [showDelModal, setShowDelModal] = useState(false);
  let [selectedUserId, setSelectUserId] = useState("");
  let [selectedUserData, setSelectedUserData] = useState([]);
  let [showViewDataModal, setShowViewModal] = useState(false);
  /*
-----------------------State manager End----------------------
*/

  // -----------------------Business logic start----------------------
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

  //-----------------------Handle delete users function logic-----------------
  let select_delete_users = (id) => {
    if (!id) {
      toast.warn("ID missing!!");
      return;
    }

    setSelectUserId(id);
    setShowDelModal(true);
  };
  // --------------------end------------------------------

  //------------actual delete logic----------------

  let delete_user = async () => {
    try {
      let dr = await deleteClient(selectedUserId);

      if (dr.status === 200) {
        toast.success(`Deleted user "${selectedUserId}" successfully`);
        // Optional: refresh the list
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

  //------------actual delete logic end----------------

  // -----------------------Business logic End----------------------

  //-----------------------Main Code Start----------------------
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
                              setSelectedUserData(latestDetails);
                              setShowViewModal(true);
                            } catch (err) {
                              toast.error(`Failed to load client data: ${err}`);
                            }
                          }}
                        >
                          <FaRegEye size={16} />
                        </button>
                        <button
                          className="btn btn-circle btn-xs btn-error"
                          title="Delete Client"
                          onClick={() => {
                            select_delete_users(id);
                            setSelectedUserData(details);
                          }}
                        >
                          <AiFillDelete size={16} />
                        </button>
                        <button
                          className="btn btn-circle btn-xs btn-primary"
                          title="Update SDP"
                        >
                          <RxUpdate size={16} />
                        </button>
                        <button
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
        data={selectedUserData}
        onClose={() => {
          setShowViewModal(false);
          setSelectedUserData([]);
        }}
      />
    </>
  );
};
//-----------------------Main Code End---------------------
export default AdminPanel;
