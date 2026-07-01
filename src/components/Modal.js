'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management: trap focus inside modal and restore on close
  useEffect(() => {
    if (!isOpen) return;

    // Save the element that had focus before the modal opened
    previousFocusRef.current = document.activeElement;

    // Focus the first focusable element inside the modal
    const timer = setTimeout(() => {
      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable?.length) focusable[0].focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      // Restore focus when modal closes
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  // Close on Escape key (WCAG 2.1.1 Keyboard)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Hardware Back Button interception
  useEffect(() => {
    if (!isOpen) return;

    // Push dummy state to trap the back button
    window.history.pushState({ modalOpen: true }, '');

    const handlePopState = () => {
      // Browser popped the dummy state. Close the modal instead of navigating back.
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If the modal was closed programmatically (e.g. 'X' button or 'Save'),
      // the dummy state is still in history. We need to pop it manually.
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titleId = title ? 'modal-title' : undefined;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">
          <X />
        </button>
        {title && <h2 className="modal-title" id={titleId}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
