import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function Toast() {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTime = toast.duration - 300;
    const timer = setTimeout(() => setIsExiting(true), Math.max(exitTime, 0));
    return () => clearTimeout(timer);
  }, [toast.duration]);

  return (
    <div
      className={`pointer-events-auto glass rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3 max-w-sm ${
        isExiting ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <span className="text-sm text-white/90 flex-1">{toast.message}</span>
      {toast.onUndo && (
        <button
          onClick={() => {
            toast.onUndo();
            onDismiss(toast.id);
          }}
          className="text-brand-400 text-sm font-semibold hover:text-brand-300 transition-colors whitespace-nowrap"
          id={`toast-undo-${toast.id}`}
        >
          Undo
        </button>
      )}
    </div>
  );
}
