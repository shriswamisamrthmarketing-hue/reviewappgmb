// Signed-in owner changes their own password. Other devices are signed out;
// this device gets a fresh session cookie.
import { NextResponse } from 'next/server';
import { getOwnerSession, createOwnerToken, OWNER_COOKIE, cookieOptions, sameOrigin } from '@/lib/auth';
import { getOwnerAuth, updateOwner } from '@/lib/store';
import { hashPassword, verifyPassword, passwordProblem } from '@/lib/password';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const session = await getOwnerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit('owner-pw:' + session.owner.id + ':' + clientIp(req), 8, 15 * 60 * 1000))
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });

  const { current, next } = await req.json().catch(() => ({}));
  const owner = await getOwnerAuth({ id: session.owner.id });
  if (!owner || !(await verifyPassword(String(current || '').slice(0, 128), owner.password_hash)))
    return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 400 });
  const problem = passwordProblem(next);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (current === next) return NextResponse.json({ error: 'Choose a password different from the current one.' }, { status: 400 });

  const version = (Number(owner.session_version) || 1) + 1;
  await updateOwner(owner.id, { password_hash: await hashPassword(next), session_version: version });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_COOKIE, createOwnerToken({ id: owner.id, session_version: version }), cookieOptions);
  return res;
}
