import React, { useEffect, useRef, useState } from "react";
import { MdEdit } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import { IoIosAddCircle } from "react-icons/io";
import { RxUpdate } from "react-icons/rx";
import { ImPhoneHangUp } from "react-icons/im";
import { IoCallOutline } from "react-icons/io5";
import RtcSettingsModal from "../Components/RtcSettingsModal";
import { getClients } from "../Helper/Requests";
import CustModal from "../Components/CustModal";

const AdminPanel = () => {
  const [clients, setClients] = useState([]);
  let rtcSettingsModalToggler = useRef(false);

  let fetch_clients = async () => {
    //fetch clients from api and show them on table
    let clientList = await getClients(); // { client_ids: [...] }

    let promises = clientList.client_ids.map((cid) => getClients(cid)); // now hits ?id=cid
    let temp = await Promise.all(promises); // [{ id1: {...} }, { id2: {...} }]

    setClients(temp);
  };

  useEffect(() => {
    fetch_clients();
  }, []);

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
                          title="Edit Client"
                        >
                          <MdEdit size={16} />
                        </button>
                        <button
                          className="btn btn-circle btn-xs btn-error"
                          title="Delete Client"
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

      <RtcSettingsModal dialogRef={rtcSettingsModalToggler} />
    </>
  );
};

export default AdminPanel;
