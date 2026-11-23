import { redirect } from 'next/navigation';
import { resolveDashboardAccess } from '@/lib/auth';
import BusinessEditor from '@/components/BusinessEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Business settings – Smart Review Agent' };

export default async function DashboardSettingsPage({ searchParams }) {
  const sp = await searchParams;
  const b = typeof sp?.b === 'string' ? sp.b : '';
  const access = await resolveDashboardAccess(b);
  if (!access) redirect(b ? '/admin/login' : '/login');
  const q = access.role === 'admin' ? `?b=${encodeURIComponent(access.slug)}` : '';
  return (
    <BusinessEditor
      slug={access.slug}
      api={`/api/owner/business${q}`}
      home={`/dashboard${q}`}
      homeLabel="Back to dashboard"
      loginHref={access.role === 'admin' ? '/admin/login' : '/login'}
    />
  );
}
