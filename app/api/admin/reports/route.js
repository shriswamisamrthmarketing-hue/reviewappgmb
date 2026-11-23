// Admin: monthly report and campaign QR performance for EVERY business (system overview).
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { listBusinesses, getMonthlyReport, getCampaignStats } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const businesses = await listBusinesses();
    const per = await Promise.all(
      businesses.map(async (b) => {
        const [monthly, campaigns] = await Promise.all([getMonthlyReport(b.slug, 12), getCampaignStats(b.slug)]);
        return { slug: b.slug, name: b.short_name || b.name, monthly, campaigns };
      })
    );
    // All businesses together, per month. Average stars is weighted by feedback count.
    const months = {};
    for (const b of per)
      for (const m of b.monthly) {
        const t = (months[m.month] ||= { month: m.month, visits: 0, scans: 0, drafts: 0, link_clicks: 0, feedback: 0, requests: 0, star_sum: 0 });
        for (const k of ['visits', 'scans', 'drafts', 'link_clicks', 'feedback', 'requests']) t[k] += m[k] || 0;
        t.star_sum += (m.avg_stars || 0) * (m.feedback || 0);
      }
    const total = Object.values(months)
      .map(({ star_sum, ...m }) => ({ ...m, avg_stars: m.feedback ? Math.round((star_sum / m.feedback) * 10) / 10 : null }))
      .sort((a, b) => b.month.localeCompare(a.month));
    return NextResponse.json({ total, businesses: per });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
