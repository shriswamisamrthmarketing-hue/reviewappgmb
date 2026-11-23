import { NextResponse } from 'next/server';
import { recordEvent } from '@/lib/store';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';
const ALLOWED = ['visit', 'copy', 'google_open'];

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {}
  if (!ALLOWED.includes(body.type)) return NextResponse.json({ ok: false }, { status: 400 });
  if (!rateLimit('ev:' + clientIp(req), 60, 10 * 60 * 1000)) return NextResponse.json({ ok: false }, { status: 429 });
  await recordEvent({
    slug: String(body.slug || ''),
    type: body.type,
    language: body.language,
    source: body.type === 'visit' ? (['qr', 'nfc', 'wa', 'sms'].includes(body.source) ? body.source : 'link') : null,
    campaign: body.campaign,
  });
  return NextResponse.json({ ok: true });
}
