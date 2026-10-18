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
      <div className="min-h-screen flex bg-bg text-text-main lg:h-dvh lg:max-h-dvh lg:overflow-hidden print:min-h-0 print:h-auto print:overflow-visible print:bg-white print:text-black print:block">
        {/* Unified Sidebar (Desktop collapsible + Mobile drawer) */}
        <div className="print:hidden">
          <AppSidebar role={role} divisionName={divisionName} userId={userId} />
        </div>

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-visible lg:h-full lg:overflow-hidden print:min-h-0 print:h-auto print:overflow-visible print:block">
          {/* Top Fixed Toolbar (52px) */}
          <div className="sticky top-0 z-30 shrink-0 w-full print:hidden">
            <AppToolbar
              role={role}
              title={title}
              divisionName={divisionName}
              userId={userId}
            />
          </div>

          {/* Internal Content Area (PageContainer handles px-6 and max-w-[1360px]) */}
          <main className="flex-1 min-h-0 flex flex-col overflow-visible lg:overflow-hidden print:min-h-0 print:h-auto print:overflow-visible print:block">
            {children}
          </main>
        </div>

        {/* Global Command Palette (Ctrl/Cmd+K) */}
        <div className="print:hidden">
          <CommandPalette role={role} />
        </div>
      </div>
    </ShellProvider>
  );
}
