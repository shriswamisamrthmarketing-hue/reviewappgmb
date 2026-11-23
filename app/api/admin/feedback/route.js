// Admin: latest customer feedback across ALL businesses, plus per-business summaries.
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { listFeedback, feedbackSummary, listBusinesses } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const businesses = await listBusinesses();
    const [items, ...sums] = await Promise.all([listFeedback(null, { limit: new URL(req.url).searchParams.get('all') === '1' ? 5000 : 100 }), ...businesses.map((b) => feedbackSummary(b.slug))]);
    return NextResponse.json({ items, summaries: Object.fromEntries(businesses.map((b, i) => [b.slug, sums[i]])) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
