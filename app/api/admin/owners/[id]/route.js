import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin } from '@/lib/auth';
import { getOwnerAuth, updateOwner, deleteOwner, getBusiness, OWNER_STATUSES } from '@/lib/store';
import { hashPassword, passwordProblem } from '@/lib/password';
import { cleanEmail, cleanName, cleanUsername } from '@/lib/validate';

export const dynamic = 'force-dynamic';

async function guard(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

// Edit an owner: any of name, email, business_slug, active, password.
// Changing the password, business or deactivating signs the owner out everywhere.
export async function PATCH(req, { params }) {
  const denied = await guard(req);
  if (denied) return denied;
  const { id } = await params;
  const current = await getOwnerAuth({ id }).catch(() => null);
  if (!current) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  const input = await req.json().catch(() => ({}));
  const patch = {};
  let revoke = false;

  if (input.name !== undefined) {
    patch.name = cleanName(input.name);
    if (!patch.name) return NextResponse.json({ error: 'Enter the owner’s name.' }, { status: 400 });
  }
  if (input.email !== undefined) {
    patch.email = cleanEmail(input.email);
    if (!patch.email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (input.username !== undefined) {
    if (!input.username) patch.username = null;
    else {
      patch.username = cleanUsername(input.username);
      if (!patch.username)
        return NextResponse.json({ error: 'Username must be 3–40 characters: letters, numbers, dot, dash or underscore (not “admin”).' }, { status: 400 });
    }
  }
  if (input.business_slug !== undefined && input.business_slug !== current.business_slug) {
    if (!(await getBusiness(String(input.business_slug)))) return NextResponse.json({ error: 'Unknown business.' }, { status: 400 });
    patch.business_slug = input.business_slug;
    revoke = true;
  }
  if (input.status !== undefined) {
    if (!OWNER_STATUSES.includes(input.status)) return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
    patch.status = input.status;
    if (input.status !== 'active') revoke = true;
  } else if (input.active !== undefined) {
    patch.active = Boolean(input.active);
    if (!patch.active) revoke = true;
  }
  if (input.password) {
    const pwErr = passwordProblem(input.password);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
    patch.password_hash = await hashPassword(input.password);
    revoke = true;
  }
  if (revoke) patch.session_version = (Number(current.session_version) || 1) + 1;

  try {
    return NextResponse.json({ owner: await updateOwner(id, patch) });
  } catch (e) {
    if (e.message === 'DUPLICATE') return NextResponse.json({ error: 'Another account already uses this email or username.' }, { status: 409 });
    if (e.message === 'NOT_FOUND') return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const denied = await guard(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    await deleteOwner(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
