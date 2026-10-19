// Client requested removal of Penempatan ATK from division user portal; redirect to /user
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserPenempatanPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/user');
  }, [router]);

  return null;
}
