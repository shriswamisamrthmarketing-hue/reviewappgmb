// Edit / approve / mark posted / delete one saved reply (only within the caller's own business).
// Editing the text of an approved reply puts it back to "draft" so it must be approved again.
import { NextResponse } from 'next/server';
import { resolveDashboardAccess, sameOrigin } from '@/lib/auth';
import { listReplies, updateReply, deleteReply } from '@/lib/store';

export const dynamic = 'force-dynamic';

async function access(req) {
  if (!sameOrigin(req)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  const a = await resolveDashboardAccess(new URL(req.url).searchParams.get('b') || '');
  if (!a) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { a };
}

export async function PATCH(req, { params }) {
  const { a, error } = await access(req);
  if (error) return error;
  const { id } = await params;
  const current = (await listReplies(a.slug)).find((r) => r.id === id);
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  let patch = {};
  if (b.action === 'approve') patch = { status: 'approved', approved_at: now, approved_by: a.owner?.email || 'admin' };
  else if (b.action === 'unapprove') patch = { status: 'draft', approved_at: null, approved_by: null };
  else if (b.action === 'posted') {
    if (current.status === 'draft') return NextResponse.json({ error: 'Approve the reply before marking it as posted.' }, { status: 400 });
    patch = { status: 'posted', posted_at: now };
  } else if (b.action === 'edit') {
    const t = String(b.reply_text || '').trim().slice(0, 2000);
    if (t.length < 5) return NextResponse.json({ error: 'Reply is too short.' }, { status: 400 });
    patch = { reply_text: t };
    if (t !== current.reply_text) Object.assign(patch, { status: 'draft', approved_at: null, approved_by: null });
  } else return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  try {
    return NextResponse.json({ reply: await updateReply(a.slug, id, patch) });
  } catch (e) {
    return NextResponse.json({ error: e.message === 'NOT_FOUND' ? 'Not found' : e.message }, { status: e.message === 'NOT_FOUND' ? 404 : 500 });
  }
}

export async function DELETE(req, { params }) {
  const { a, error } = await access(req);
  if (error) return error;
  const { id } = await params;
  await deleteReply(a.slug, id);
  return NextResponse.json({ ok: true });
}
