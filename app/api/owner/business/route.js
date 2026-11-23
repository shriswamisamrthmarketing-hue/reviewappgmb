// The business dashboard API. Owners always get THEIR OWN business (taken from the
// session, never from the request). The admin may pass ?b=<slug> to open any business.
import { NextResponse } from 'next/server';
import { resolveDashboardAccess, sameOrigin } from '@/lib/auth';
import { getBusiness, updateBusiness, getStats, getDailySeries } from '@/lib/store';
import { sanitizeBusiness } from '@/lib/validate';
import { getDefaults } from '@/lib/seed';
import { publicBase, localTestBase } from '@/lib/public-url';

export const dynamic = 'force-dynamic';

const requested = (req) => new URL(req.url).searchParams.get('b') || '';

export async function GET(req) {
  const access = await resolveDashboardAccess(requested(req));
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const business = access.business; // already loaded (and checked) by resolveDashboardAccess
    if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const [stats, daily] = await Promise.all([
      getStats(access.slug).then((s) => s[access.slug]),
      getDailySeries(access.slug, 14).catch(() => []),
    ]);
    return NextResponse.json({
      role: access.role,
      owner: access.owner ? { name: access.owner.name, email: access.owner.email } : null,
      business,
      defaults: getDefaults(business),
      stats,
      daily,
      ai: Boolean(process.env.GEMINI_API_KEY),
      publicBase: publicBase().url,
      publicBaseProblem: publicBase().problem,
      testBase: await localTestBase(req), // local Wi-Fi address for phone testing only (null on the live site)
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const access = await resolveDashboardAccess(requested(req));
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const current = await getBusiness(access.slug);
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const input = await req.json().catch(() => null);
  if (!input) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const { errors, value, warning } = sanitizeBusiness(input, current);
  if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
  try {
    const saved = await updateBusiness(access.slug, value);
    return NextResponse.json({ business: saved, warning });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
