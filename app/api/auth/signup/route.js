// Public sign-up: creates a new business (with default questions) and its owner account.
//  • SIGNUP_ENABLED=false            → sign-up closed
//  • SIGNUP_REQUIRES_APPROVAL=true   → account is "pending" until the admin approves it
//    (default: active immediately; the admin can suspend it at any time)
import { NextResponse } from 'next/server';
import { sameOrigin, isAdminIdentifier } from '@/lib/auth';
import { createBusiness, deleteBusiness, getBusiness, createOwner, getOwnerAuth, isValidSlug } from '@/lib/store';
import { newBusinessTemplate } from '@/lib/seed';
import { hashPassword, passwordProblem } from '@/lib/password';
import { cleanEmail, cleanName } from '@/lib/validate';
import { rateLimit, clientIp } from '@/lib/ratelimit';

import { signupEnabled, signupNeedsApproval } from '@/lib/signup';

export const dynamic = 'force-dynamic';

const slugify = (s) =>
  String(s || '').split('|')[0].toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 34).replace(/-+$/, '');

async function freeSlug(base) {
  const root = isValidSlug(base) ? base : 'business';
  for (let i = 0; i < 50; i++) {
    const s = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await getBusiness(s))) return s;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!signupEnabled()) return NextResponse.json({ error: 'New registrations are currently closed. Please contact the administrator.' }, { status: 403 });
  if (!rateLimit('signup:' + clientIp(req), 5, 60 * 60 * 1000))
    return NextResponse.json({ error: 'Too many registrations from this network. Please try again in an hour.' }, { status: 429 });

  const b = await req.json().catch(() => ({}));
  if (b.website) return NextResponse.json({ ok: true, status: 'pending' }); // honeypot field filled → bot; pretend success

  const errors = {};
  const name = cleanName(b.name);
  const businessName = String(b.business_name || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 150);
  const email = cleanEmail(b.email);
  const phone = String(b.phone || '').replace(/[^\d+\-\s()]/g, '').trim().slice(0, 20);
  const location = String(b.location || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120);
  if (!name || name.length < 2) errors.name = 'Enter your full name.';
  if (!businessName || businessName.length < 2) errors.business_name = 'Enter your business name.';
  else if (slugify(businessName).length < 2) errors.business_name = 'Business name needs at least 2 English letters or numbers.';
  if (!email) errors.email = 'Enter a valid email address.';
  else if (isAdminIdentifier(email)) errors.email = 'This email cannot be used for a business account.';
  const pw = passwordProblem(b.password);
  if (pw) errors.password = pw;
  if (b.confirm !== undefined && b.confirm !== b.password) errors.confirm = 'Passwords do not match.';
  if (!b.terms) errors.terms = 'Please accept the terms to continue.';
  if (Object.keys(errors).length) return NextResponse.json({ error: Object.values(errors)[0], fields: errors }, { status: 400 });

  if (await getOwnerAuth({ email }).catch(() => null))
    return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.', fields: { email: 'This email is already registered.' } }, { status: 409 });

  const status = signupNeedsApproval() ? 'pending' : 'active';
  let business = null;
  try {
    const slug = await freeSlug(slugify(businessName));
    business = await createBusiness(newBusinessTemplate({ slug, name: businessName, short_name: businessName.slice(0, 80), location }));
    const owner = await createOwner({
      email, name, phone, business_slug: business.slug, password_hash: await hashPassword(b.password), status, source: 'signup',
    });
    return NextResponse.json({ ok: true, status, email: owner.email, business: { slug: business.slug, name: business.name } }, { status: 201 });
  } catch (e) {
    if (business) await deleteBusiness(business.slug).catch(() => {}); // roll back the half-created business
    if (e.message === 'DUPLICATE')
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.', fields: { email: 'This email is already registered.' } }, { status: 409 });
    console.error('signup failed', e);
    return NextResponse.json({ error: 'Registration could not be completed. Please try again.' }, { status: 500 });
  }
}
