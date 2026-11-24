// Customer review funnel: returns 3, 5 or 7 review drafts built ONLY from the customer's own answers.
// First call creates the anonymous feedback record; later calls (new wording / other style /
// language) reuse it. mode "manual" = the customer writes their own review (no AI at all).
import { NextResponse } from 'next/server';
import { getBusiness, recordEvent, createFeedback, getFeedback, updateFeedback, cleanCampaign } from '@/lib/store';
import { resolveFunnelFacts, generateDrafts } from '@/lib/review-drafts';
import { feedbackToken, checkFeedbackToken } from '@/lib/feedback-token';
import { rateLimit, clientIp } from '@/lib/ratelimit';
import { isAdmin, getOwnerSession } from '@/lib/auth';
import { cleanSettings } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  // 60 per 10 minutes per network: customers on the same shop Wi-Fi share one IP address.
  if (!rateLimit('drafts:' + clientIp(req), 60, 10 * 60 * 1000))
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes.' }, { status: 429 });

  const business = await getBusiness(String(body.slug || ''));
  if (!business) return NextResponse.json({ error: 'Unknown business' }, { status: 404 });

  let f;
  try {
    f = resolveFunnelFacts(business, body);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  const preview = Boolean(body.preview) && ((await isAdmin()) || (await getOwnerSession())?.slug === business.slug);
  const manual = body.mode === 'manual';
  // record: save the customer's chosen rating without writing suggestions (a safety net when the
  //   customer acts before the request for their star tap has finished).
  const record = body.mode === 'record';

  // Existing record (same customer asking for new wording / another style)?
  let fb = null;
  if (body.feedbackId && checkFeedbackToken(body.feedbackId, body.feedbackToken)) {
    fb = await getFeedback(String(body.feedbackId)).catch(() => null);
    if (fb && fb.business_slug !== business.slug) fb = null;
  }

  // How many suggestions: the business's own setting (3/5/7), never taken from the browser.
  // previous = suggestions already shown in this visit (max 35), so Refresh does not repeat them.
  const previous = Array.isArray(body.previous) ? body.previous.slice(-35).map((d) => String(d).slice(0, 600)) : [];
  const result = manual
    ? { drafts: [], source: 'manual', aiUnavailable: null }
    : record
    ? { drafts: [], source: ['ai', 'fallback'].includes(body.draftsSource) ? body.draftsSource : 'fallback', aiUnavailable: null }
    : await generateDrafts(business, f, { previous, seed: Number(body.seed) || 0, count: cleanSettings(business.settings).suggestions });

  if (!preview) {
    if (!fb) {
      fb = await createFeedback({
        business_slug: business.slug,
        stars: f.stars,
        rating: f.rating,
        highlights: f.facts.map((x) => ({ question: x.summary?.en || x.prompt?.en || x.qid, values: x.values.map((v) => v.en || v.hi || v.mr) })),
        details: f.details || null,
        language: f.language,
        style: f.style,
        source: ['qr', 'nfc', 'wa', 'sms'].includes(body.source) ? body.source : 'link',
        drafts_source: result.source,
        campaign: cleanCampaign(body.campaign),
      }).catch((e) => {
        console.error('feedback save failed', e.message);
        return null;
      });
      if (!manual) await recordEvent({ slug: business.slug, type: 'draft', rating: f.rating, language: f.language, source: result.source, keyword: f.keyword, campaign: body.campaign });
    } else {
      // Keep the customer's latest star rating (they can change it on the suggestions screen).
      // Keep the customer's own words up to date too (they can add them after the first suggestions).
      await updateFeedback(fb.id, { stars: f.stars, rating: f.rating, language: f.language, style: f.style, details: f.details || null, ...(manual ? { written_manually: true } : {}) }).catch(() => {});
      if (!manual) await recordEvent({ slug: business.slug, type: 'regenerate', rating: f.rating, language: f.language, source: result.source, keyword: f.keyword, campaign: body.campaign });
    }
  }

  return NextResponse.json({
    drafts: result.drafts,
    source: result.source,
    aiUnavailable: result.aiUnavailable,
    keywordSuggestions: f.keywordSuggestions,
    feedback: fb ? { id: fb.id, token: feedbackToken(fb.id) } : null,
  });
}
