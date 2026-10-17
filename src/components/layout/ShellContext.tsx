// Shell state context managing sidebar collapse, mobile drawer, and keyboard shortcuts
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore } from 'react';

interface ShellContextType {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  isCommandPaletteOpen: boolean;
  toggleCollapse: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

const ShellContext = createContext<ShellContextType | null>(null);

const STORAGE_KEY = 'simpatk_sidebar_collapsed';

const collapseListeners = new Set<() => void>();
let cachedCollapsed: boolean | null = null;

function getCollapsedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  if (cachedCollapsed === null) {
    try {
      cachedCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      cachedCollapsed = false;
    }
  }
  return cachedCollapsed;
}

function subscribeCollapsed(callback: () => void): () => void {
  collapseListeners.add(callback);
  return () => {
    collapseListeners.delete(callback);
  };
}

function setCollapsedState(val: boolean) {
  cachedCollapsed = val;
  try {
    localStorage.setItem(STORAGE_KEY, String(val));
  } catch {
    // Ignore storage errors in private mode
  }
  collapseListeners.forEach((fn) => fn());
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const isCollapsed = useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, () => false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const toggleCollapse = useCallback(() => {
    setCollapsedState(!getCollapsedSnapshot());
  }, []);

  const toggleMobile = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  // Global keyboard shortcuts: Ctrl/Cmd+B for sidebar and Ctrl/Cmd+K for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar collapse: Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }

      // Open command palette: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }

      // Close mobile drawer on Escape
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  return (
    <ShellContext.Provider
      value={{
        isCollapsed,
        isMobileOpen,
        isCommandPaletteOpen,
        toggleCollapse,
        toggleMobile,
        closeMobile,
        openCommandPalette,
        closeCommandPalette,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return context;
}
