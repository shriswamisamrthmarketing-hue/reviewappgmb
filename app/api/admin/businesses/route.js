import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin } from '@/lib/auth';
import { listBusinesses, getStats, storageMode, createBusiness, listOwners } from '@/lib/store';
import { sanitizeNewBusiness } from '@/lib/validate';
import { newBusinessTemplate } from '@/lib/seed';
import { DEFAULT_MODEL } from '@/lib/review';
import { publicBase, localTestBase } from '@/lib/public-url';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    // The business list is read once and shared with getStats (it used to be read twice).
    const [businesses, owners] = await Promise.all([listBusinesses(), listOwners().catch(() => [])]);
    const stats = await getStats(null, businesses);
    const ownerCount = {};
    for (const o of owners) ownerCount[o.business_slug] = (ownerCount[o.business_slug] || 0) + 1;
    const week = Date.now() - 7 * 864e5;
    return NextResponse.json({
      businesses,
      stats,
      ownerCount,
      pendingCount: owners.filter((o) => o.status === 'pending').length,
      newSignups: owners.filter((o) => o.source === 'signup' && new Date(o.created_at).getTime() > week).length,
      storage: storageMode(),
      publicBase: publicBase().url,
      publicBaseProblem: publicBase().problem,
      testBase: await localTestBase(req), // local Wi-Fi address for phone testing only (null on the live site)
      ai: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Add a new business (admin only).
export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const input = await req.json().catch(() => null);
  const { errors, value, warning } = sanitizeNewBusiness(input);
  if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
  try {
    const business = await createBusiness(newBusinessTemplate(value));
    return NextResponse.json({ business, warning }, { status: 201 });
  } catch (e) {
    if (e.message === 'DUPLICATE')
      return NextResponse.json({ error: `The QR link "/review/${value.slug}" is already used. Choose another link name.` }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
