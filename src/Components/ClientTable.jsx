// Components/ClientTable.jsx
import React, { useState, useMemo } from "react";
import { FaRegEye } from "react-icons/fa";
import { MdDownload } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import { RxUpdate } from "react-icons/rx";
import { IoCallOutline } from "react-icons/io5";
import { ImPhoneHangUp } from "react-icons/im";
const ClientTable = ({
  clients,
  peerRef,
  updatingUsers,
  onView,
  onDeletePeer,
  onSelectDeleteUser,
  onUpdate,
  onCall,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });
  const [filter, setFilter] = useState("");

  const sortedFilteredClients = useMemo(() => {
    let processed = [...clients];

    // Filter
    if (filter) {
      processed = processed.filter((client) =>
        Object.keys(client)[0].toLowerCase().includes(filter.toLowerCase())
      );
    }

    // Sort
    if (sortConfig.key) {
      processed.sort((a, b) => {
        const idA = Object.keys(a)[0];
        const idB = Object.keys(b)[0];

        let valA, valB;
        if (sortConfig.key === "id") {
          valA = idA;
          valB = idB;
        } else {
          valA = a[idA][sortConfig.key];
          valB = b[idB][sortConfig.key];
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return processed;
  }, [clients, filter, sortConfig]);

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key && prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      return { key, direction: "asc" };
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <input
          type="text"
          placeholder="Search by ID..."
          className="input input-bordered input-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <table className="table table-zebra w-full min-w-[500px]">
        <thead>
          <tr>
            <th onClick={() => requestSort("id")} className="cursor-pointer">
              ID{" "}
              {sortConfig.key === "id" && (
                <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
              )}
            </th>
            <th
              onClick={() => requestSort("status")}
              className="cursor-pointer"
            >
              Status{" "}
              {sortConfig.key === "status" && (
                <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
              )}
            </th>
            <th
              onClick={() => requestSort("last_heartbeat")}
              className="cursor-pointer"
            >
              Heartbeat{" "}
              {sortConfig.key === "last_heartbeat" && (
                <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
              )}
            </th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {sortedFilteredClients.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-6 text-gray-500">
                No clients found.
              </td>
            </tr>
          ) : (
            sortedFilteredClients.map((client, idx) => {
              const id = Object.keys(client)[0];
              const details = client[id];

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
                        onClick={() => onView(id)}
                        title="View Client"
                      >
                        <FaRegEye size={16} />
                      </button>
                      <button
                        disabled={updatingUsers[id]}
                        className={`btn btn-circle btn-xs ${
                          peerRef.current[id] ? "btn-primary" : "btn-error"
                        }`}
                        onClick={() =>
                          peerRef.current[id]
                            ? onDeletePeer(id)
                            : onSelectDeleteUser(id, details)
                        }
                        title={peerRef.current[id] ? "Download Peer" : "Delete"}
                      >
                        {peerRef.current[id] ? (
                          <MdDownload size={16} />
                        ) : (
                          <AiFillDelete size={16} />
                        )}
                      </button>
                      <button
                        disabled={updatingUsers[id]}
                        className="btn btn-circle btn-xs btn-primary"
                        onClick={() => onUpdate(id)}
                        title="Update SDP"
                      >
                        <RxUpdate size={16} />
                      </button>
                      <button
                        disabled={
                          !peerRef.current[id] ||
                          updatingUsers[id] ||
                          (!details?.sdp && !(details?.ice?.length > 0)) ||
                          (!details?.answer_sdp &&
                            !(details?.answer_ice?.length > 0))
                        }
                        className="btn btn-circle btn-xs btn-primary"
                        onClick={() => onCall(id)}
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
  );
};

export default ClientTable;
