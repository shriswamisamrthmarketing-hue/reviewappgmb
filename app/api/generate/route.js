import { NextResponse } from 'next/server';
import { getBusiness, recordEvent } from '@/lib/store';
import { resolveFacts, generateReview } from '@/lib/review';
import { rateLimit, clientIp } from '@/lib/ratelimit';
import { isAdmin, getOwnerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const ip = clientIp(req);
  if (!rateLimit('gen:' + ip, 15, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes.' }, { status: 429 });
  }
  const business = await getBusiness(String(body.slug || ''));
  if (!business) return NextResponse.json({ error: 'Unknown business' }, { status: 404 });

  let facts;
  try {
    facts = resolveFacts(business, body);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  const previous = body.mode === 'regenerate' ? body.previousDraft : null;
  const result = await generateReview(business, facts, previous);

  const preview = body.preview && ((await isAdmin()) || (await getOwnerSession())?.slug === business.slug);
  if (!preview) {
    await recordEvent({
      slug: business.slug,
      type: body.mode === 'regenerate' ? 'regenerate' : 'draft',
      rating: facts.rating,
      language: facts.language,
      source: result.source,
      keyword: result.keyword,
    });
  }
  return NextResponse.json({ draft: result.draft, source: result.source });
}
