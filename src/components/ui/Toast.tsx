// Lightweight toast notification system for simple user feedback
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container anchored at top-right for desktop and top-center for mobile */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-4 h-4 text-success shrink-0" strokeWidth={1.5} />,
            error: <AlertCircle className="w-4 h-4 text-danger shrink-0" strokeWidth={1.5} />,
            info: <Info className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />,
          };

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-control bg-surface border border-border shadow-modal text-xs text-text-main animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="flex items-center gap-2.5">
                {icons[toast.type]}
                <span className="font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-text-muted hover:text-text-main p-0.5 rounded cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
