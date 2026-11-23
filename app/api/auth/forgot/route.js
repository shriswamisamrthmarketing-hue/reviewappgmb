// "Forgot password": emails a 1-hour reset link when email sending is configured.
// The response is the same whether or not the email exists (no account enumeration).
import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/auth';
import { getOwnerAuth, ownerStatus } from '@/lib/store';
import { createResetToken, resetUrl } from '@/lib/reset';
import { mailConfigured, sendMail } from '@/lib/mail';
import { cleanEmail } from '@/lib/validate';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { email } = await req.json().catch(() => ({}));
  const e = cleanEmail(email);
  if (!e) return NextResponse.json({ error: 'Enter the email address of your account.' }, { status: 400 });
  if (!rateLimit('forgot:' + clientIp(req), 5, 60 * 60 * 1000) || !rateLimit('forgot:' + e, 3, 60 * 60 * 1000))
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });

  if (!mailConfigured()) {
    return NextResponse.json({
      ok: true,
      emailed: false,
      message: 'Email delivery is not set up yet, so please ask your administrator for a password reset link. They can create one for you in seconds.',
    });
  }

  const owner = await getOwnerAuth({ email: e }).catch(() => null);
  if (owner && !['suspended', 'rejected'].includes(ownerStatus(owner))) {
    const link = resetUrl(req, await createResetToken(owner.id));
    await sendMail({
      to: owner.email,
      subject: 'Reset your Smart Review Agent password',
      text: `Hi ${owner.name || ''},\n\nUse this link to set a new password (valid for 1 hour):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
      html: `<p>Hi ${String(owner.name || '').replace(/[<>&]/g, '')},</p><p>Use this link to set a new password (valid for 1 hour):</p><p><a href="${link}">Reset my password</a></p><p>If you didn't ask for this, you can ignore this email.</p>`,
    });
  }
  return NextResponse.json({ ok: true, emailed: true, message: 'If an account exists for this email, a reset link has been sent. Check your inbox (and spam folder).' });
}
