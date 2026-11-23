import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin, isAdminIdentifier } from '@/lib/auth';
import { listOwners, createOwner, getBusiness } from '@/lib/store';
import { hashPassword, passwordProblem } from '@/lib/password';
import { cleanEmail, cleanName, cleanUsername } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ owners: await listOwners() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Create a business-owner account (admin only). Accounts are active immediately.
export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const input = await req.json().catch(() => ({}));
  const email = cleanEmail(input.email);
  const name = cleanName(input.name);
  if (!email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (isAdminIdentifier(email)) return NextResponse.json({ error: 'This is the administrator email. Use a different email for the owner.' }, { status: 400 });
  const username = input.username ? cleanUsername(input.username) : null;
  if (input.username && !username)
    return NextResponse.json({ error: 'Username must be 3–40 characters: letters, numbers, dot, dash or underscore (not “admin”).' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Enter the owner’s name.' }, { status: 400 });
  const pwErr = passwordProblem(input.password);
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
  if (!(await getBusiness(String(input.business_slug || ''))))
    return NextResponse.json({ error: 'Choose a business for this owner.' }, { status: 400 });
  try {
    const owner = await createOwner({
      email,
      username,
      name,
      business_slug: input.business_slug,
      password_hash: await hashPassword(input.password),
    });
    return NextResponse.json({ owner }, { status: 201 });
  } catch (e) {
    if (e.message === 'DUPLICATE') return NextResponse.json({ error: 'An account with this email or username already exists.' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
