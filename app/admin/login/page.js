import { redirect } from 'next/navigation';
import { isAdmin, adminEmail } from '@/lib/auth';
import OwnerLogin from '@/components/OwnerLogin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administrator login – Smart Review Agent' };

// Separate administrator login (same form component as /login, with admin wording).
export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin');
  return <OwnerLogin initialRole="admin" adminUsesEmail={Boolean(adminEmail())} />;
}
