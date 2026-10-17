// Responsive modal that renders as a bottom sheet on mobile and centered sheet on desktop
'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}: DialogProps) {
  // Prevent background scrolling when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full md:max-w-md bg-surface shadow-modal rounded-t-sheet md:rounded-sheet border border-border max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Mobile handle indicator */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-3 pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-main tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded-control p-1 text-text-muted hover:text-text-main hover:bg-bg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-5 py-4 overflow-y-auto flex-1 text-sm text-text-main space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-border bg-bg/50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
