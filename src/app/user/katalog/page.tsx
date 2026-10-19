// Client requested removal of Katalog ATK from division user portal; redirect to /user
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserKatalogPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/user');
  }, [router]);

  return null;
}
