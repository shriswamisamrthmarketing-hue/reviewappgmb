import { ResetForm } from '@/components/AuthForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set a new password – Smart Review Agent', robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }) {
  const sp = await searchParams;
  return <ResetForm token={typeof sp?.token === 'string' ? sp.token : ''} />;
}
