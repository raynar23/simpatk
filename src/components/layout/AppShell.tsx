// 100dvh App Shell architecture with internal panel scrolling and responsive fallback
'use client';

import React from 'react';
import { ShellProvider } from './ShellContext';
import { AppSidebar } from './AppSidebar';
import { AppToolbar } from './AppToolbar';
import { CommandPalette } from './CommandPalette';

interface AppShellProps {
  role: 'admin' | 'user';
  divisionName?: string;
  userId?: string;
  title?: string;
  children: React.ReactNode;
}

export function AppShell({
  role,
  divisionName,
  userId,
  title,
  children,
}: AppShellProps) {
  return (
    <ShellProvider>
      <div className="h-dvh max-h-dvh flex bg-bg text-text-main overflow-hidden max-h-[600px]:h-auto max-h-[600px]:min-h-dvh max-h-[600px]:overflow-visible">
        {/* Unified Sidebar (Desktop collapsible + Mobile drawer) */}
        <AppSidebar role={role} divisionName={divisionName} />

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Top Fixed Toolbar (52px) */}
          <AppToolbar
            role={role}
            title={title}
            divisionName={divisionName}
            userId={userId}
          />

          {/* Internal Content Area (PageContainer handles px-6 and max-w-[1360px]) */}
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden max-h-[600px]:overflow-y-auto">
            {children}
          </main>
        </div>

        {/* Global Command Palette (Ctrl/Cmd+K) */}
        <CommandPalette role={role} />
      </div>
    </ShellProvider>
  );
}
