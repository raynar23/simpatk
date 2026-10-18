// Responsive detail inspector panel: docked right sheet on desktop, bottom sheet on mobile with pull-down gesture
'use client';

import React, { useEffect, useRef, useState } from 'react';
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

  // Mobile bottom-sheet drag states
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isDraggingRef = useRef(false);

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

  const handleClose = () => {
    setDragOffset(0);
    setIsDragging(false);
    setIsClosing(false);
    isDraggingRef.current = false;
    onClose();
  };

  // Pointer drag gestures for mobile bottom sheet (< 1024px)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return;

    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    currentYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    setIsDragging(true);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    currentYRef.current = e.clientY;
    const deltaY = e.clientY - startYRef.current;

    if (deltaY > 0) {
      setDragOffset(deltaY);
    } else {
      setDragOffset(deltaY * 0.15);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const deltaY = currentYRef.current - startYRef.current;
    const elapsed = Date.now() - startTimeRef.current;
    const velocity = deltaY / Math.max(1, elapsed);

    if (deltaY > 70 || (velocity > 0.45 && deltaY > 30)) {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
        setDragOffset(0);
      }, 180);
    } else {
      setDragOffset(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Dim backdrop overlay for mobile & desktop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in"
        style={{
          opacity: isClosing
            ? 0
            : dragOffset > 0
            ? Math.max(0.08, 1 - dragOffset / 320)
            : undefined,
          transition: isDragging ? 'none' : 'opacity 0.22s ease',
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Desktop slide-over panel (right) / Mobile bottom sheet with interactive pull-down */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          transform: isClosing
            ? 'translateY(100%)'
            : dragOffset !== 0
            ? `translateY(${Math.max(0, dragOffset)}px)`
            : undefined,
          transition: isDragging
            ? 'none'
            : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-surface border-l border-border shadow-modal transition-transform duration-180 ease-out animate-in slide-in-from-right max-lg:inset-x-0 max-lg:top-auto max-lg:bottom-0 max-lg:max-h-[90dvh] max-lg:rounded-t-sheet max-lg:border-t max-lg:border-l-0 max-lg:slide-in-from-bottom ${width}`}
      >
        {/* Mobile handle indicator with tactile feedback */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="lg:hidden flex flex-col items-center justify-center pt-2.5 pb-1 touch-none cursor-grab active:cursor-grabbing select-none w-full"
          title="Tarik ke bawah untuk menutup"
        >
          <div
            className={`h-1.5 rounded-full transition-all duration-150 ${
              isDragging ? 'w-14 bg-text-muted' : 'w-10 bg-border hover:bg-text-muted/60'
            }`}
          />
        </div>

        {/* Panel header */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface select-none touch-none lg:touch-auto lg:cursor-default cursor-grab active:cursor-grabbing"
        >
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
            onClick={handleClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Tutup panel"
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
