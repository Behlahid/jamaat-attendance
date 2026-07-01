'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export default function Toast({ message, type = 'success', onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      // eslint-disable-next-line
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) setTimeout(onDismiss, 350);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  const Icon = TOAST_ICONS[type] || Info;

  return (
    <div
      className={`toast ${visible ? 'show' : ''} ${type}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon className="toast-icon" />
      <span>{message}</span>
    </div>
  );
}

// Toast hook for easy usage
export function useToast() {
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message: '', type }); // Reset to retrigger
    setTimeout(() => setToast({ message, type }), 10);
  }, []);

  const ToastComponent = (
    <Toast
      message={toast.message}
      type={toast.type}
      onDismiss={() => setToast({ message: '', type: 'success' })}
    />
  );

  return { showToast, ToastComponent };
}
