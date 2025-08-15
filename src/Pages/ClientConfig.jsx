import React, { useState, useEffect } from "react";

const ClientConfig = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");

  // Dummy clients for UI purposes
  useEffect(() => {
    setClients([
      { id: "client1" },
      { id: "client2" },
      { id: "client3" },
    ]);
  }, []);

  const handleSetAnswer = () => {
    alert(`Selected client: ${selectedClient}`);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <label className="block mb-2 font-semibold" htmlFor="client-select">
        Select Client
      </label>
      <select
        id="client-select"
        className="select select-bordered w-full mb-4"
        value={selectedClient}
        onChange={(e) => setSelectedClient(e.target.value)}
      >
        <option value="" disabled>
          -- Select a Client --
        </option>
        {clients.map((client, idx) => (
          <option key={idx} value={client.id}>
            {client.id}
          </option>
        ))}
      </select>

      <button
        onClick={handleSetAnswer}
        className="btn btn-primary w-full"
        disabled={!selectedClient}
      >
        Set Answer
      </button>
    </div>
  );
};

export default ClientConfig;
