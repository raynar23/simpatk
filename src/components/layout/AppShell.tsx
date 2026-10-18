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
      <div className="min-h-screen flex bg-bg text-text-main overflow-x-hidden overflow-y-auto lg:h-dvh lg:max-h-dvh lg:overflow-hidden">
        {/* Unified Sidebar (Desktop collapsible + Mobile drawer) */}
        <AppSidebar role={role} divisionName={divisionName} />

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-visible lg:h-full lg:overflow-hidden">
          {/* Top Fixed Toolbar (52px) */}
          <AppToolbar
            role={role}
            title={title}
            divisionName={divisionName}
            userId={userId}
          />

          {/* Internal Content Area (PageContainer handles px-6 and max-w-[1360px]) */}
          <main className="flex-1 min-h-0 flex flex-col overflow-visible lg:overflow-hidden">
            {children}
          </main>
        </div>

        {/* Global Command Palette (Ctrl/Cmd+K) */}
        <CommandPalette role={role} />
      </div>
    </ShellProvider>
  );
}
