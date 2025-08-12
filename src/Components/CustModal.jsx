import React, { useEffect, useRef } from "react";

const CustModal = ({ children,dialogRef }) => {
   

// useEffect(() => {
//   if (!dialogRef.current) return;

//   if (isOpen) {
//     dialogRef.current.showModal();
//   } else {
//     dialogRef.current.close();
//   }

//   const handleClose = () => onClose();

//   dialogRef.current.addEventListener("close", handleClose);

//   return () => {
//     if (dialogRef.current) {
//       dialogRef.current.removeEventListener("close", handleClose);
//     }
//   };
// }, [isOpen, onClose]);


  return (
    <dialog ref={dialogRef} className="modal p-0">
      <div className="modal-box relative p-6">
        {/* Close button top right */}
        <button
          onClick={() => dialogRef.current.close()}
          className="btn btn-sm btn-circle absolute right-3 top-3"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Render children inside modal */}
        {children}
      </div>
    </dialog>
  );
};

export default CustModal;
