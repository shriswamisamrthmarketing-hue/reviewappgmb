import { notFound } from 'next/navigation';
import { getBusinessCached, cleanCampaign } from '@/lib/store';
import { publicBusiness } from '@/lib/validate';
import { isAdmin, getOwnerSession } from '@/lib/auth';
import { publicBase } from '@/lib/public-url';
import ReviewFunnel from '@/components/ReviewFunnel';

export const dynamic = 'force-dynamic';

// getBusinessCached: the title (generateMetadata) and the page share ONE database lookup per request.

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const b = await getBusinessCached(slug);
  return { title: b ? `Share your feedback – ${b.short_name || b.name}` : 'Not found' };
}

// What a customer sees after scanning a QR code / tapping an NFC tag.
//  (no ?s)           printed QR code: https://…/review/<slug>   (?s=qr from older printed codes also = QR)
//  ?s=nfc|wa|sms|link where they came from    ?c=<campaign>  campaign QR tag
//  ?preview=1        admin/owner preview (not counted; never put in a customer QR)
//  ?ui=chat          older links to the chat-style page now open the same shared review page
//                    (components/ChatAgent.jsx and /api/generate are kept, unused by default)
// Every business uses this ONE shared template; everything shown comes from that business's own record.
export default async function ReviewPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const b = await getBusinessCached(slug);
  if (!b) notFound();
  // Previews (not counted in stats) are for the admin and for this business's own owner.
  const preview = sp?.preview === '1' && ((await isAdmin()) || (await getOwnerSession())?.slug === slug);
  const source = !sp?.s ? 'qr' : ['qr', 'nfc', 'wa', 'sms'].includes(sp.s) ? sp.s : 'link';
  const base = publicBase().url;
  const customerUrl = preview && base ? `${base}/review/${encodeURIComponent(slug)}` : null;
  return <ReviewFunnel business={publicBusiness(b)} preview={preview} source={source} campaign={cleanCampaign(sp?.c)} customerUrl={customerUrl} />;
}
