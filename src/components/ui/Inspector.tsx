// Responsive detail inspector panel: docked right sheet on desktop, bottom sheet on mobile
'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface InspectorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Inspector({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'w-full sm:w-[380px] lg:w-[420px]',
}: InspectorProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Dim backdrop overlay for mobile & desktop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Desktop slide-over panel (right) / Mobile bottom sheet */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-surface border-l border-border shadow-modal transition-transform duration-180 ease-out animate-in slide-in-from-right max-lg:inset-x-0 max-lg:top-auto max-lg:bottom-0 max-lg:max-h-[90dvh] max-lg:rounded-t-sheet max-lg:border-t max-lg:border-l-0 max-lg:slide-in-from-bottom ${width}`}
      >
        {/* Mobile handle indicator */}
        <div className="lg:hidden flex items-center justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface">
          <div className="min-w-0 pr-3">
            <h2 className="text-sm font-semibold text-text-main truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-text-muted truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="w-7 h-7 inline-flex items-center justify-center rounded-control border border-border text-text-muted hover:text-text-main hover:bg-bg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-text-main">
          {children}
        </div>

        {/* Action footer */}
        {footer && (
          <div className="p-4 border-t border-border bg-surface pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}
