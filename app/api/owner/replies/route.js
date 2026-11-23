// Review-reply assistant for ONE business (owner: own business; admin: ?b=<slug>).
// GET  → saved replies
// POST → { action: 'suggest', stars, text, reviewer, language, tone } → 2 AI/template suggestions (not saved)
//        { action: 'save', reviewer, stars, review_text, reply_text, language, source, approve } → saved reply
// A reply can only be copied to Google after the owner (or admin) approves it.
import { NextResponse } from 'next/server';
import { resolveDashboardAccess, sameOrigin } from '@/lib/auth';
import { getBusiness, listReplies, createReply } from '@/lib/store';
import { generateReplies, REVIEW_LANGS } from '@/lib/review-drafts';
import { rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const txt = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, max);

export async function GET(req) {
  const access = await resolveDashboardAccess(new URL(req.url).searchParams.get('b') || '');
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ replies: await listReplies(access.slug) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const access = await resolveDashboardAccess(new URL(req.url).searchParams.get('b') || '');
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const stars = Math.max(1, Math.min(5, Math.round(Number(b.stars)) || 5));
  const language = REVIEW_LANGS.includes(b.language) ? b.language : 'en';

  if (b.action === 'suggest') {
    if (!rateLimit('reply:' + access.slug, 40, 60 * 60 * 1000))
      return NextResponse.json({ error: 'Too many reply suggestions this hour. Please write the reply yourself or try later.' }, { status: 429 });
    const business = await getBusiness(access.slug);
    const out = await generateReplies(business, { stars, text: b.text, reviewer: b.reviewer, language, tone: b.tone, sentiment: b.sentiment });
    return NextResponse.json(out);
  }

  if (b.action === 'save') {
    const reply_text = txt(b.reply_text, 2000);
    if (reply_text.length < 5) return NextResponse.json({ error: 'Write the reply first.' }, { status: 400 });
    const approve = Boolean(b.approve);
    const rec = await createReply(access.slug, {
      reviewer: txt(b.reviewer, 80) || null,
      stars,
      review_text: txt(b.review_text, 2000) || null,
      reply_text,
      language,
      source: ['ai', 'fallback', 'manual'].includes(b.source) ? b.source : 'manual',
      status: approve ? 'approved' : 'draft',
      approved_at: approve ? new Date().toISOString() : null,
      approved_by: approve ? access.owner?.email || 'admin' : null,
    });
    return NextResponse.json({ reply: rec }, { status: 201 });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
