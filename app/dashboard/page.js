import { redirect } from 'next/navigation';
import { resolveDashboardAccess } from '@/lib/auth';
import OwnerDashboard from '@/components/OwnerDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Business dashboard – Smart Review Agent' };

// Owners see only their own business. The admin can open any business with ?b=<slug>.
export default async function DashboardPage({ searchParams }) {
  const sp = await searchParams;
  const b = typeof sp?.b === 'string' ? sp.b : '';
  const access = await resolveDashboardAccess(b);
  if (!access) redirect(b ? '/admin/login' : '/login');
  return <OwnerDashboard adminSlug={access.role === 'admin' ? access.slug : ''} />;
}
