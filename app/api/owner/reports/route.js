// Monthly report + campaign QR performance for ONE business (owner: own; admin: ?b=<slug>).
import { NextResponse } from 'next/server';
import { resolveDashboardAccess } from '@/lib/auth';
import { getMonthlyReport, getCampaignStats } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const access = await resolveDashboardAccess(new URL(req.url).searchParams.get('b') || '');
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const [monthly, campaigns] = await Promise.all([getMonthlyReport(access.slug, 12), getCampaignStats(access.slug)]);
    return NextResponse.json({ monthly, campaigns });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
