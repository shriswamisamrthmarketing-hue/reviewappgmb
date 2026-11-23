import { redirect, notFound } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getBusiness } from '@/lib/store';
import BusinessEditor from '@/components/BusinessEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit business – Smart Review Agent' };

export default async function EditPage({ params }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { slug } = await params;
  if (!(await getBusiness(slug))) notFound();
  return <BusinessEditor slug={slug} />;
}
