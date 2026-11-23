import { redirect } from 'next/navigation';
import { getOwnerSession } from '@/lib/auth';
import { signupEnabled, signupNeedsApproval } from '@/lib/signup';
import { SignupForm } from '@/components/AuthForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign up – Smart Review Agent' };

export default async function SignupPage() {
  if (await getOwnerSession()) redirect('/dashboard');
  if (!signupEnabled()) redirect('/login');
  return <SignupForm needsApproval={signupNeedsApproval()} />;
}
