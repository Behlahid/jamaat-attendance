'use client';

import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Close"><X /></button>
        {title && <div className="modal-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
