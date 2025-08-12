import React, { useState } from "react";
import { toast } from "react-toastify";

const RtcSettingsModal = ({ dialogRef, onAddSettings }) => {
  const [userId, setUserId] = useState("");

  // Validate input to allow only alphanumeric characters
  const handleChange = (e) => {
    const val = e.target.value;
    if (/^[a-zA-Z0-9]*$/.test(val)) {
      setUserId(val);
    }
  };

  const handleSubmit = () => {
    if (userId.length === 0) {
       toast.warn("Null value not allow enter id")
      return;
    }
    onAddSettings(userId);
    // Optionally clear input or close modal here
  };

  return (
    <dialog ref={dialogRef} className="modal">
      <form method="dialog" className="modal-box max-w-sm">
        <h3 className="font-bold text-lg mb-4">Add RTC Settings</h3>

        <div className="form-control w-full mb-4">
          <label className="label" htmlFor="userId">
            <span className="label-text font-semibold">User ID </span>
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            maxLength={20}
            placeholder="Enter user ID"
            onChange={handleChange}
            className={`input input-bordered w-full ${!userId?"input-error":""}`}
            autoComplete="off"
          />
          <label className="label">
            <span className="label-text-alt text-gray-500">
              
            </span>
          </label>
        </div>

        <div className="modal-action">
          <button type="button" onClick={handleSubmit} className="btn btn-primary w-full">
            Add Settings
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default RtcSettingsModal;
