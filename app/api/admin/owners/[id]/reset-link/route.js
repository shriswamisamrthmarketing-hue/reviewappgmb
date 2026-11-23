// Admin creates a 1-hour password-reset link for an owner (to send by WhatsApp / email).
import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin } from '@/lib/auth';
import { getOwnerAuth } from '@/lib/store';
import { createResetToken, resetUrl } from '@/lib/reset';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const owner = await getOwnerAuth({ id }).catch(() => null);
  if (!owner) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  const link = resetUrl(req, await createResetToken(owner.id));
  return NextResponse.json({ link, email: owner.email, expires_in_minutes: 60 });
}
