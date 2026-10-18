// Admin workspace layout utilizing the 100dvh AppShell architecture
import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
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
    <AppShell
      role="admin"
      divisionName={divisionName}
      userId={user?.id}
      title="Portal General Affairs (GA)"
    >
      {children}
    </AppShell>
  );
}
