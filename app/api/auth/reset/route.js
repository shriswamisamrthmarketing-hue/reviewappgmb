// Set a new password with a one-time reset token. Signs the owner out everywhere.
import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/auth';
import { updateOwner } from '@/lib/store';
import { checkResetToken } from '@/lib/reset';
import { hashPassword, passwordProblem } from '@/lib/password';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!rateLimit('reset:' + clientIp(req), 10, 15 * 60 * 1000))
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  const { token, password, check } = await req.json().catch(() => ({}));
  const owner = await checkResetToken(token);
  if (!owner) return NextResponse.json({ error: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 });
  if (check) return NextResponse.json({ ok: true, email: owner.email }); // just validating the link
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  await updateOwner(owner.id, {
    password_hash: await hashPassword(password),
    session_version: (Number(owner.session_version) || 1) + 1,
    reset_token_hash: null,
    reset_expires: null,
  });
  return NextResponse.json({ ok: true, email: owner.email });
}
