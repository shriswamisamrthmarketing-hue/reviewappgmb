// Customer funnel: save the final review text when the customer copies it or continues to Google.
// Needs the signed token returned by /api/review/drafts, so only that customer can update it.
import { NextResponse } from 'next/server';
import { getFeedback, updateFeedback, recordEvent } from '@/lib/store';
import { checkFeedbackToken } from '@/lib/feedback-token';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (!rateLimit('fbup:' + clientIp(req), 60, 10 * 60 * 1000)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  if (!['copy', 'google'].includes(b.action)) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  if (!b.id || !checkFeedbackToken(b.id, b.token)) return NextResponse.json({ error: 'Invalid feedback' }, { status: 403 });
  const fb = await getFeedback(String(b.id)).catch(() => null);
  if (!fb) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const text = String(b.review_text || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, 2000);
  const patch = { review_text: text || fb.review_text || null };
  if (b.action === 'copy') patch.copied = true;
  if (b.action === 'google') {
    patch.google_clicked = true;
    patch.copied = true;
  }
  if (b.manual) patch.written_manually = true;
  await updateFeedback(fb.id, patch);
  await recordEvent({ slug: fb.business_slug, type: b.action === 'google' ? 'google_open' : 'copy', language: fb.language, campaign: fb.campaign });
  return NextResponse.json({ ok: true });
}
