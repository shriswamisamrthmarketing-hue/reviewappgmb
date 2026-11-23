// One sign-in for everyone:
//  • "admin" (or ADMIN_EMAIL) + ADMIN_PASSWORD → administrator session → /admin
//  • owner email or username + password → owner session        → /dashboard
import { NextResponse } from 'next/server';
import {
  ownerAuthConfigured, createOwnerToken, OWNER_COOKIE, COOKIE, cookieOptions, sameOrigin,
  adminConfigured, checkPassword, createToken, isAdminIdentifier,
} from '@/lib/auth';
import { getOwnerAuth, getBusiness, updateOwner, ownerStatus } from '@/lib/store';
import { verifyPassword } from '@/lib/password';
import { rateLimit, rateReset, clientIp } from '@/lib/ratelimit';

const FAIL = 'Incorrect email/username or password.';


export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.identifier ?? body.email ?? '').trim().toLowerCase().slice(0, 254);
  const password = String(body.password || '').slice(0, 128);
  const remember = body.remember !== false;
  const ip = clientIp(req);
  if (!rateLimit('login:' + ip, 10, 15 * 60 * 1000) || !rateLimit('login:' + id, 8, 15 * 60 * 1000))
    return NextResponse.json({ error: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 });
  if (!id || !password) return NextResponse.json({ error: 'Enter your email/username and password.' }, { status: 400 });

  // "Remember me" off → browser-session cookie (the signed token itself still expires after 7 days).
  const { maxAge, ...sessionOnly } = cookieOptions;
  const opts = remember ? cookieOptions : sessionOnly;

  /* ---------- administrator ---------- */
  if (isAdminIdentifier(id)) {
    if (!adminConfigured())
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not set on the server. Add it to your environment variables.' }, { status: 500 });
    if (!checkPassword(password)) return NextResponse.json({ error: FAIL }, { status: 401 });
    rateReset('login:' + ip);
    rateReset('login:' + id);
    const res = NextResponse.json({ ok: true, redirect: '/admin' });
    res.cookies.set(COOKIE, createToken(), opts);
    return res;
  }

  /* ---------- business owner ---------- */
  if (!ownerAuthConfigured())
    return NextResponse.json({ error: 'Login is not configured yet. Ask the administrator to set SESSION_SECRET.' }, { status: 500 });
  let owner = null;
  try {
    owner = await getOwnerAuth(id.includes('@') ? { email: id } : { username: id });
  } catch {
    return NextResponse.json({ error: 'Login is temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }
  // Always run the hash check (even for unknown accounts) so timing doesn't reveal which accounts exist.
  const ok = await verifyPassword(password, owner?.password_hash);
  if (!ok || !owner) return NextResponse.json({ error: FAIL }, { status: 401 });
  const status = ownerStatus(owner);
  if (status === 'pending')
    return NextResponse.json({ error: 'Your registration is waiting for administrator approval. You can sign in as soon as it is approved.', status }, { status: 403 });
  if (status === 'rejected')
    return NextResponse.json({ error: 'Your registration was not approved. Please contact the administrator if you think this is a mistake.', status }, { status: 403 });
  if (status !== 'active')
    return NextResponse.json({ error: 'This account has been suspended. Please contact your administrator.', status }, { status: 403 });
  if (!(await getBusiness(owner.business_slug)))
    return NextResponse.json({ error: 'This account is not linked to a business. Please contact your administrator.' }, { status: 403 });

  // Only failed attempts count towards the limit.
  rateReset('login:' + ip);
  rateReset('login:' + id);
  updateOwner(owner.id, { last_login_at: new Date().toISOString() }).catch(() => {});
  const res = NextResponse.json({ ok: true, redirect: '/dashboard' });
  res.cookies.set(OWNER_COOKIE, createOwnerToken(owner), opts);
  return res;
}
