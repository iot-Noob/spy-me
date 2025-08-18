// Components/ClientTable.jsx
import React, { useState, useMemo } from "react";
import { FaRegEye } from "react-icons/fa";
import { MdDownload } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import { RxUpdate } from "react-icons/rx";
import { IoCallOutline } from "react-icons/io5";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

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

  // Pagination
  const totalPages = Math.ceil(sortedFilteredClients.length / rowsPerPage);
  const paginatedClients = sortedFilteredClients.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key && prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      return { key, direction: "asc" };
    });
  };

  // Smart pagination range
  const getPageNumbers = () => {
    let pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages = [1, 2, 3, 4, "...", totalPages];
    } else if (currentPage >= totalPages - 2) {
      pages = [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
    }
    return pages;
  };

  return (
    <div>
      <div className="mb-3 flex flex-col md:flex-row items-center justify-between gap-2">
        <input
          type="text"
          placeholder="Search by ID..."
          className="input input-bordered input-sm w-full md:w-1/3"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
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
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-500">
                  No clients found.
                </td>
              </tr>
            ) : (
              paginatedClients.map((client, idx) => {
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

      {/* Pagination Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 mt-4">
        <div className="flex items-center gap-2">
          <label className="text-md">Items:</label>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="select select-bordered select-sm"
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="join">
          <button
            className="join-item btn btn-sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </button>

          {getPageNumbers().map((page, idx) =>
            page === "..." ? (
              <button key={idx} className="join-item btn btn-sm btn-disabled">
                ...
              </button>
            ) : (
              <button
                key={idx}
                className={`join-item btn btn-sm ${
                  currentPage === page ? "btn-active" : ""
                }`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            )
          )}

          <button
            className="join-item btn btn-sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientTable;
