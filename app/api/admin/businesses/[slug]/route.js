import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin } from '@/lib/auth';
import { getBusiness, updateBusiness, deleteBusiness, getStats } from '@/lib/store';
import { sanitizeBusiness } from '@/lib/validate';
import { getDefaults } from '@/lib/seed';
import { publicBase } from '@/lib/public-url';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { slug } = await params;
  const b = await getBusiness(slug);
  if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const stats = (await getStats(slug).catch(() => ({})))[slug] || null;
  const pb = publicBase();
  return NextResponse.json({ business: b, defaults: getDefaults(b), stats, publicBase: pb.url, publicBaseProblem: pb.problem });
}

export async function PUT(req, { params }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { slug } = await params;
  const current = await getBusiness(slug);
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const input = await req.json().catch(() => null);
  if (!input) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const { errors, value, warning } = sanitizeBusiness(input, current);
  if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
  try {
    const saved = await updateBusiness(slug, value);
    return NextResponse.json({ business: saved, warning });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Permanently delete a business with its statistics and owner accounts.
// The request must repeat the slug as confirmation.
export async function DELETE(req, { params }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { slug } = await params;
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== slug) return NextResponse.json({ error: 'Confirmation does not match.' }, { status: 400 });
  if (!(await getBusiness(slug))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    await deleteBusiness(slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
