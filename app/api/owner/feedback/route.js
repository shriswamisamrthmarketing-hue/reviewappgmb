// Customer feedback for ONE business: owners get their own; the admin passes ?b=<slug>.
import { NextResponse } from 'next/server';
import { resolveDashboardAccess } from '@/lib/auth';
import { listFeedback, feedbackSummary } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const access = await resolveDashboardAccess(sp.get('b') || '');
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const stars = Number(sp.get('stars')) || null;
  const limit = sp.get('all') === '1' ? 5000 : 300; // ?all=1 is used by the CSV download
  try {
    const [items, summary] = await Promise.all([listFeedback(access.slug, { limit, stars }), feedbackSummary(access.slug)]);
    return NextResponse.json({ items, summary });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
