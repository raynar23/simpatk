// User layout featuring top brand header with account controls
import React from 'react';
import { UserHeader } from '@/components/ui/UserHeader';
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
    <div className="min-h-dvh bg-bg text-text-main flex flex-col">
      <UserHeader divisionName={divisionName} />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 pb-16">
        {children}
      </main>
    </div>
  );
}
