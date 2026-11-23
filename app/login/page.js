import { redirect } from 'next/navigation';
import { getOwnerSession } from '@/lib/auth';
import { signupEnabled } from '@/lib/signup';
import OwnerLogin from '@/components/OwnerLogin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Business login – Smart Review Agent' };

export default async function LoginPage({ searchParams }) {
  if (await getOwnerSession()) redirect('/dashboard');
  const sp = await searchParams;
  const str = (v) => (typeof v === 'string' ? v : '');
  return (
    <OwnerLogin
      initialRole={sp?.as === 'admin' ? 'admin' : 'owner'}
      notice={str(sp?.notice)}
      prefill={str(sp?.email).slice(0, 254)}
      signupOpen={signupEnabled()}
    />
  );
}
