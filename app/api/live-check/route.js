// Checks, from the server, that a business's customer link really opens on the LIVE site
// (PUBLIC_SITE_URL). Used by the dashboards before printing QR codes or sending requests.
// Admin: ?b=<slug>. Owner: their own business.
import { NextResponse } from 'next/server';
import { resolveDashboardAccess } from '@/lib/auth';
import { publicBase } from '@/lib/public-url';
import { storageMode } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

async function probe(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 75000); // Render free plan can take ~60s to wake up
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', cache: 'no-store', headers: { 'User-Agent': 'SmartReviewAgent-LiveCheck' } });
    const text = res.ok ? await res.text() : '';
    return { status: res.status, text };
  } catch (e) {
    return { status: 0, error: e.name === 'AbortError' ? 'timed out' : e.message };
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req) {
  const access = await resolveDashboardAccess(new URL(req.url).searchParams.get('b') || '');
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { url: base, problem } = publicBase();
  if (!base) return NextResponse.json({ ok: false, reason: problem });

  const link = `${base}/review/${access.slug}`;
  const started = Date.now();
  const r = await probe(link + '?preview=1'); // preview=1: never counted as a visit
  const ms = Date.now() - started;
  if (r.status === 200) return NextResponse.json({ ok: true, link, ms });
  if (r.status === 404)
    return NextResponse.json({
      ok: false, link, ms, notFound: r.status === 404,
      local: storageMode() !== 'supabase',
      reason:
        storageMode() !== 'supabase'
          ? 'This business is saved only on this computer (local test file), so the live site does not know it and customers get a 404 page. Put the same SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY that Render uses into .env.local, restart, and add the business again (or copy it with scripts/sync-local-to-supabase.mjs).'
          : 'This business does not exist on the live site yet. Make sure this dashboard and the live site use the same Supabase database, and that the live site runs the latest version.',
    });
  return NextResponse.json({
    ok: false, link, ms,
    reason: r.status ? `The live site answered with error ${r.status}.` : `The live site could not be reached (${r.error}).`,
  });
}
