import { NextResponse } from 'next/server';
import { adminConfigured, checkPassword, createToken, COOKIE, cookieOptions, sameOrigin } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!adminConfigured())
    return NextResponse.json({ error: 'ADMIN_PASSWORD is not set on the server. Add it to your environment variables.' }, { status: 500 });
  if (!rateLimit('login:' + clientIp(req), 10, 15 * 60 * 1000))
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  const { password, remember } = await req.json().catch(() => ({}));
  if (!checkPassword(password)) return NextResponse.json({ error: 'Wrong administrator password.' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  const { maxAge, ...sessionOnly } = cookieOptions;
  res.cookies.set(COOKIE, createToken(), remember === false ? sessionOnly : cookieOptions);
  return res;
}
