import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { IoMdCloseCircleOutline } from "react-icons/io";

const TestPortal = ({ showModal, onClose, data, onUpdate }) => {
  const portalRoot = document.getElementById("modal-root");
  if (!portalRoot) return null;

  // Local states for editable SDPs
  const [offerSDP, setOfferSDP] = useState("");
  const [answerSDP, setAnswerSDP] = useState("");
 
  useEffect(() => {
    if (data) {
      setOfferSDP(data.sdp || "");
      setAnswerSDP(data.answer_sdp || "");
    }
  }, [data.sdp]);

const handleUpdateClick = () => {
  if (onUpdate && typeof onUpdate === "function") {
    onUpdate({
      offerSDP,
      answerSDP
    });
  }
};
  
  return createPortal(
    <div className={`modal ${showModal ? "modal-open" : ""}`}>
      <div className="modal-box relative max-w-lg">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
          aria-label="Close"
        >
          <IoMdCloseCircleOutline size={28} />
        </button>

        <h3 className="font-bold text-lg mb-4">Edit Client</h3>

        <div className="mb-4">
          <label className="font-semibold mb-1 block">Offer SDP:</label>
          <textarea
            className="w-full h-48 p-2 border rounded resize-none"
            value={offerSDP}
            onChange={(e) => setOfferSDP(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="font-semibold mb-1 block">Answer SDP:</label>
          <textarea
            className="w-full h-48 p-2 border rounded resize-none"
            value={answerSDP}
            onChange={(e) => setAnswerSDP(e.target.value)}
          />
        </div>

        <button
          onClick={()=>{
            handleUpdateClick()
          }}
          className="btn btn-primary w-full"
          disabled={!offerSDP && !answerSDP}
        >
          Update SDP
        </button>
      </div>
    </div>,
    portalRoot
  );
};

export default TestPortal;
