// Admin layout featuring desktop sidebar, mobile bottom tab bar, and centered content
import React from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { TabBarBawah } from '@/components/ui/TabBarBawah';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let divisionName = 'General Affairs';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nama_divisi')
      .eq('id', user.id)
      .single();
    if (profile?.nama_divisi) {
      divisionName = profile.nama_divisi;
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-text-main flex flex-col">
      {/* Desktop Sidebar (232px fixed) */}
      <Sidebar divisionName={divisionName} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[232px] flex flex-col min-h-dvh">
        <main className="flex-1 pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Tab Bar (< lg) */}
      <TabBarBawah />
    </div>
  );
}
