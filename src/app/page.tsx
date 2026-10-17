// Root page automatically directs visitors to login or their dashboard
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
