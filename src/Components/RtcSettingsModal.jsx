import React, { useState } from "react";
import { toast } from "react-toastify";
import { IoIosCloseCircle } from "react-icons/io";

const RtcSettingsModal = ({ dialogRef, onAddSettings }) => {
  const [userId, setUserId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const val = e.target.value;
    if (/^[a-zA-Z0-9]*$/.test(val)) {
      setUserId(val);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const trimmedId = userId.trim();

    if (!trimmedId) {
      toast.warn("Please enter a valid User ID");
      return;
    }

    onAddSettings(trimmedId);
    dialogRef.current?.close();
    setUserId("");
    setSubmitted(false);
  };

  const handleClose = () => {
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-modal="true"
      role="dialog"
    >
      <form method="dialog" className="modal-box max-w-sm relative">
        {/* Close button in top-right */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
        >
          <IoIosCloseCircle size={20} />
        </button>

        <h3 className="font-bold text-lg mb-4">Add RTC Settings</h3>

        <div className="form-control w-full mb-4">
          <label className="label" htmlFor="userId">
            <span className="label-text font-semibold">User ID</span>
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            maxLength={20}
            placeholder="Enter user ID"
            onChange={handleChange}
            className={`input input-bordered w-full ${
              submitted && !userId.trim() ? "input-error" : ""
            }`}
            autoComplete="off"
          />
        </div>

        <div className="modal-action">
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-primary w-full"
          >
            Add Settings
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default RtcSettingsModal;
