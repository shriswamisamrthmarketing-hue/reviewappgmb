// Records that a review request was sent by WhatsApp or SMS (counts only; the customer's
// name and phone number are never stored). Admin: ?b=<slug>. Owner: their own business.
import { NextResponse } from 'next/server';
import { resolveDashboardAccess, sameOrigin } from '@/lib/auth';
import { recordEvent } from '@/lib/store';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const access = await resolveDashboardAccess(new URL(req.url).searchParams.get('b') || '');
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit('rr:' + clientIp(req), 200, 60 * 60 * 1000)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const { channel, language } = await req.json().catch(() => ({}));
  if (!['wa', 'sms'].includes(channel)) return NextResponse.json({ error: 'Unknown channel' }, { status: 400 });
  await recordEvent({ slug: access.slug, type: 'request', source: channel, language: ['en', 'mr', 'hi'].includes(language) ? language : null });
  return NextResponse.json({ ok: true });
}
