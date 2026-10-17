// User layout utilizing the unified 100dvh AppShell architecture
import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let divisionName = 'Divisi Operasional & Komersial';
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
      role="user"
      divisionName={divisionName}
      userId={user?.id}
      title="User Portal"
    >
      {children}
    </AppShell>
  );
}
