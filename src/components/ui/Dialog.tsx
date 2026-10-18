// Responsive modal that renders as a bottom sheet on mobile and centered sheet on desktop with interactive pull-down touch gesture
'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  // Mobile drag-to-dismiss interactive gesture states
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleClose = () => {
    setDragOffset(0);
    setIsDragging(false);
    setIsClosing(false);
    isDraggingRef.current = false;
    onClose();
  };

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

  // Pointer/touch gestures for pulling down to close on mobile (< 768px)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return;

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
      // Elastic rubber-band resistance when dragged upwards
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
    const velocity = deltaY / Math.max(1, elapsed); // px/ms

    // Close if dragged down past threshold (70px) or flicked down quickly (velocity > 0.45 px/ms)
    if (deltaY > 70 || (velocity > 0.45 && deltaY > 30)) {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
        setDragOffset(0);
      }, 180);
    } else {
      // Smooth spring back to top
      setDragOffset(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop with dynamic opacity while pulling down */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
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

      {/* Dialog container with real-time translation following user touch */}
      <div
        role="dialog"
        aria-modal="true"
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
        className="relative z-10 w-full md:max-w-md bg-surface shadow-modal rounded-t-sheet md:rounded-sheet border border-border max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Mobile handle indicator with tactile feedback and touch drag */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="md:hidden flex flex-col items-center justify-center pt-3 pb-1.5 touch-none cursor-grab active:cursor-grabbing select-none w-full"
          title="Tarik ke bawah untuk menutup"
        >
          <div
            className={`h-1.5 rounded-full transition-all duration-150 ${
              isDragging
                ? 'w-14 bg-text-muted'
                : 'w-10 bg-border hover:bg-text-muted/60'
            }`}
          />
        </div>

        {/* Header - also draggable on mobile */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-border md:cursor-default cursor-grab active:cursor-grabbing select-none touch-none md:touch-auto"
        >
          <div>
            <h2 className="text-base font-semibold text-text-main tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Tutup dialog"
            className="rounded-control p-1 text-text-muted hover:text-text-main hover:bg-bg transition-colors cursor-pointer shrink-0 ml-2"
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
