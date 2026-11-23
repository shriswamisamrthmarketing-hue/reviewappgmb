import Link from 'next/link';
import { SEED_BUSINESSES } from '@/lib/seed';
import { initials } from '@/lib/brand';
import LandingFunnel from '@/components/LandingFunnel';
import LandingConsole from '@/components/LandingConsole';

const STAR = <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />;

const STRIP = [
  'Smart Review QR', 'Tap-to-answer chat', 'English · मराठी · हिंदी', 'Honest AI drafts',
  'Print-ready QR posters', 'Owner dashboard', 'SEO-friendly wording', 'No app needed',
];

const FEATURES = [
  {
    icon: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />,
    title: 'Smart Review QR',
    text: 'One scan opens a friendly chat in your brand colours that guides customers from “how was it?” to a ready review.',
  },
  {
    icon: <path d="M6 3h12v6H6zM6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2M7 13h10v8H7z" />,
    title: 'Printable QR posters',
    text: 'Download a ready-to-print table card or counter poster, or a high-res QR file for your own designer.',
  },
  {
    icon: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
    title: 'AI review drafts',
    text: 'Warm, natural reviews written from the customer’s own choices, in English, Marathi or Hindi.',
  },
  {
    icon: <path d="M3 12V3h9l9 9-9 9zM7.5 7.5h.01" />,
    title: 'Local SEO keywords',
    text: 'Your services and area can appear naturally in reviews, at most one phrase each time and never stuffed.',
  },
  {
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    title: 'Owner dashboard',
    text: 'Your private login shows scans, drafts, copies and Google opens, plus a printable QR whenever you need it.',
  },
  {
    icon: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4" />,
    title: 'Google-friendly by design',
    text: 'Every customer gets the same “Post on Google” button. They choose their own stars and post it themselves.',
  },
];

const PLAIN_QR = [
  'Opens an empty text box, and most people close it without writing.',
  'Customers struggle for words, so reviews end up one line long.',
  'Short reviews rarely mention your services or your area.',
  'No idea how many people scanned, started or actually posted.',
];
const SMART_QR = [
  'A friendly chat guides them, so a few taps are all it takes.',
  'AI turns their choices into a warm, detailed review in seconds.',
  'Key services and location can appear naturally in the wording.',
  'Your dashboard tracks scans, drafts, copies and Google opens.',
  'Works in English, Marathi and Hindi.',
];

const INDUSTRIES = [
  ['🍽️', 'Restaurants & cafés'], ['💇', 'Salons & spas'], ['🩺', 'Clinics & dentists'], ['🛍️', 'Retail stores'],
  ['🏨', 'Hotels & stays'], ['🧒', 'Preschools & daycare'], ['🏢', 'Real estate & builders'], ['💼', 'Agencies & services'],
];

const FACTS = [
  ['3', 'languages', 'English, Marathi and Hindi'],
  ['< 60s', 'per review', 'From scan to Google'],
  ['0', 'apps to install', 'Works in any phone browser'],
  ['100%', 'customer-posted', 'Nothing is posted for them'],
];

const FAQS = [
  ['Is this allowed by Google’s review rules?', 'Yes. Nothing is ever posted for the customer. They read the draft, change anything they like, choose their own star rating and post it from their own Google account. Every customer, happy or not, gets the same “Post on Google” button.'],
  ['Do customers need to download anything?', 'No. The QR opens a light web page straight in the phone’s browser. It works on any Android or iPhone with a camera.'],
  ['What if a customer had a bad experience?', 'Their review stays honest. An “Average” or “Not satisfied” answer produces a polite, fair review, which also shows future customers that your reviews are genuine.'],
  ['How do I get my login?', 'Your account is created by the administrator. You’ll receive an email and password, then sign in with “Customer Login” to see your own dashboard, QR codes and stats.'],
  ['Can I change the questions, keywords and colours?', 'Yes. From your dashboard you can edit the greeting, every question and answer option, your SEO phrases and brand colours, in English, Marathi and Hindi. The printed QR never changes.'],
  ['What customer information is saved?', 'Only their feedback: the stars they chose, the highlights they tapped, and the review text they decided to keep. It is visible only to that business and the administrator. Customers are never asked for their name, phone number or email.'],
];

function Icon({ children, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  );
}
const Stars = () => <span className="lp-stars" aria-label="5 stars">★★★★★</span>;
function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.8A14.5 14.5 0 0 1 9.5 24c0-1.7.3-3.3.9-4.8l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4-13.5-9.7l-7.9 6C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
function Ticks({ items }) {
  return (
    <ul className="lp-ticks">
      {items.map((t) => <li key={t}><span className="lp-tick"><Icon size={13}><path d="M5 12l5 5L19 7" /></Icon></span>{t}</li>)}
    </ul>
  );
}
function Head({ kicker, children, sub }) {
  return (
    <>
      <p className="lp-kicker">{kicker}</p>
      <h2 className="lp-h2">{children}</h2>
      {sub && <p className="lp-sub">{sub}</p>}
    </>
  );
}

export default function Home() {
  return (
    <div className="lp">
      {/* ---------- nav ---------- */}
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-row">
          <Link href="/" className="lp-logo">
            <span className="lp-logo-mark"><Icon size={22}>{STAR}</Icon></span>
            <span>
              <span className="lp-logo-name">Smart Review <em>Agent</em></span>
              <span className="lp-logo-sub">Helping customers share honest reviews</span>
            </span>
          </Link>
          <nav className="lp-links" aria-label="Main">
            <a href="#features">Features</a>
            <a href="#journey">How it works</a>
            <a href="#industries">Industries</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lp-nav-cta">
            <Link href="/signup" className="lp-btn lp-btn-ghost lp-hide-sm">Sign Up</Link>
            <Link href="/login" className="lp-btn lp-btn-primary">Customer Login <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- hero ---------- */}
        <section className="lp-hero">
          <div className="lp-blob a" aria-hidden="true" />
          <div className="lp-blob b" aria-hidden="true" />
          <div className="lp-wrap lp-hero-inner">
            <span className="lp-badge">
              <Icon size={16}><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" /></Icon>
              The smart Google review QR for local businesses
            </span>
            <h1 className="lp-title">
              Turn happy customers into
              <span><mark>5-star Google reviews</mark> in under a minute</span>
            </h1>
            <p className="lp-lead">
              Customers scan your QR and tap a few answers. <strong>Smart Review Agent</strong> writes a natural review
              from their own words, in English, Marathi or Hindi, and they post it on Google themselves.
            </p>
            <div className="lp-actions">
              <Link href="/login" className="lp-btn lp-btn-primary lp-btn-lg">
                <Icon size={18}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></Icon>
                Customer Login
              </Link>
              <a href="#journey" className="lp-btn lp-btn-ghost lp-btn-lg">
                <Icon size={18}><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l5.5-3.5z" /></Icon>
                See how it works
              </a>
            </div>
            <div className="lp-meta">
              <span className="lp-pill">✓ No app to install</span>
              <span className="lp-dot" aria-hidden="true" />
              <span className="lp-meta-text">⚡ Ready to print in minutes</span>
            </div>
            <ul className="lp-chips" aria-label="Example reviews">
              {[['RK', '#4285F4', 'Very helpful staff!'], ['PM', '#34A853', 'Highly recommend'], ['AS', '#EA4335', 'Best in the area']].map(([who, color, text]) => (
                <li key={who} className="lp-chip">
                  <span className="lp-chip-av" style={{ background: color }}>{who}</span>
                  <Stars />
                  <span className="lp-chip-text">{text}</span>
                  <GoogleG />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- feature strip ---------- */}
        <div className="lp-strip" aria-label="Highlights">
          <div className="lp-strip-track">
            {[...STRIP, ...STRIP].map((t, i) => <span key={i} aria-hidden={i >= STRIP.length}>★ {t}</span>)}
          </div>
        </div>

        {/* ---------- features ---------- */}
        <section id="features" className="lp-section">
          <div className="lp-wrap">
            <Head kicker="Everything you need" sub="One QR on your counter, and a full review system behind it.">
              Built to get you <span className="lp-hl">more genuine reviews</span>
            </Head>
            <div className="lp-grid3">
              {FEATURES.map((f) => (
                <article key={f.title} className="lp-card">
                  <span className="lp-icon"><Icon>{f.icon}</Icon></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- interactive journey ---------- */}
        <section id="journey" className="lp-section lp-tint">
          <div className="lp-wrap">
            <Head kicker="The customer journey" sub="No forms, no blank boxes, no “what should I write?”. Just a short, friendly chat that does the hard part.">
              From a quick scan to a <span className="lp-hl">glowing Google review</span>
            </Head>
            <LandingFunnel />
          </div>
        </section>

        {/* ---------- 3 steps in detail ---------- */}
        <section id="how" className="lp-section">
          <div className="lp-wrap">
            <Head kicker="How it works">Three simple moments. <span className="lp-hl">Zero effort.</span></Head>

            <div className="lp-feat">
              <div className="lp-feat-copy">
                <span className="lp-tagpill">01 · Scan &amp; start</span>
                <h3>Your QR card does the asking for you</h3>
                <p>Place a smart QR card on tables, billing counters, reception desks or invoices. One scan opens a chat in <b>your</b> brand colours.</p>
                <Ticks items={['Opens instantly on any Android or iPhone', 'Your logo, colours and a warm welcome', 'Switch between English, मराठी and हिंदी anytime']} />
              </div>
              <div className="lp-mock">
                <div className="lp-mock-head">
                  <span className="lp-mock-av">SR</span>
                  <span><b>Your Business Name</b><small>Review assistant · online</small></span>
                </div>
                <p className="lp-mock-q">How was your experience today?</p>
                <div className="lp-mock-faces">
                  {['😍', '🙂', '😐', '🙁'].map((e, i) => <span key={e} className={i === 0 ? 'sel' : ''}>{e}</span>)}
                </div>
                <span className="lp-mock-btn">👆 Customer taps “Excellent”</span>
              </div>
            </div>

            <div className="lp-feat rev">
              <div className="lp-feat-copy">
                <span className="lp-tagpill">02 · AI magic</span>
                <h3>Writer’s block? Gone in seconds.</h3>
                <p>The customer taps what they loved. Our AI turns those taps into a natural, personal review that sounds like them.</p>
                <Ticks items={['Built only from what they selected, so it’s always true', 'Your key services can appear naturally', 'Edit it, or tap “New wording” for a fresh version']} />
              </div>
              <div className="lp-mock">
                <p className="lp-mock-label">✨ AI review draft</p>
                <div className="lp-mock-draft">
                  “Wonderful experience! The team was friendly and patient, explained everything clearly and the service was quick. Highly recommended.”
                  <Stars />
                </div>
                <div className="lp-mock-row"><span>✏️ Edit</span><span>↻ New wording</span><span>📋 Copy</span></div>
              </div>
            </div>

            <div className="lp-feat">
              <div className="lp-feat-copy">
                <span className="lp-tagpill">03 · Post on Google</span>
                <h3>One tap from draft to Google</h3>
                <p>“Post on Google” copies the review and opens your Google review page. The customer pastes it, picks their stars and taps Post.</p>
                <Ticks items={['Opens your review page directly, no searching', 'Detailed reviews help your Business Profile stand out', 'Steady, genuine reviews build trust']} />
              </div>
              <div className="lp-mock lp-mock-center">
                <span className="lp-mock-check"><Icon size={26}><path d="M5 12l5 5L19 7" /></Icon></span>
                <b className="lp-mock-title">Review copied!</b>
                <small className="lp-mock-small">Paste it on Google and tap Post.</small>
                <span className="lp-mock-google"><GoogleG size={16} /> Post on Google</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- dashboard tour ---------- */}
        <section id="dashboard" className="lp-section lp-dark">
          <div className="lp-wrap">
            <Head kicker="Your business console" sub="Every business owner gets a private login with their own QR codes, stats and settings.">
              One dashboard. <span className="lp-hl-y">Total clarity.</span>
            </Head>
            <LandingConsole />
          </div>
        </section>

        {/* ---------- comparison ---------- */}
        <section id="compare" className="lp-section">
          <div className="lp-wrap">
            <Head kicker="Why it works" sub="A normal QR drops people on a blank page. Ours walks them through it, so more of them finish.">
              A plain review QR vs a <span className="lp-hl">Smart Review QR</span>
            </Head>
            <div className="lp-vs">
              <div className="lp-vs-card bad">
                <h3><span className="lp-vs-ic">✕</span> Plain Google review QR</h3>
                <ul>{PLAIN_QR.map((t) => <li key={t}><span>✕</span>{t}</li>)}</ul>
              </div>
              <div className="lp-vs-card good">
                <span className="lp-vs-badge">Recommended</span>
                <h3><span className="lp-vs-ic">✓</span> Smart Review Agent QR</h3>
                <ul>{SMART_QR.map((t) => <li key={t}><span>✓</span>{t}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- industries ---------- */}
        <section id="industries" className="lp-section lp-tint">
          <div className="lp-wrap">
            <Head kicker="Made for local businesses">Perfect for <span className="lp-hl">any business with walk-in customers</span></Head>
            <div className="lp-ind">
              {INDUSTRIES.map(([e, t]) => <div key={t} className="lp-ind-item"><span>{e}</span>{t}</div>)}
            </div>
          </div>
        </section>

        {/* ---------- facts strip ---------- */}
        <section className="lp-facts-wrap">
          <div className="lp-wrap">
            <div className="lp-facts">
              {FACTS.map(([n, l, s]) => (
                <div key={l} className="lp-fact">
                  <b>{n}</b>
                  <span>{l}</span>
                  <small>{s}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- live demo ---------- */}
        <section id="businesses" className="lp-section">
          <div className="lp-wrap">
            <Head kicker="Live demo" sub="Tap a business to try the real customer chat.">See it running for <span className="lp-hl">real businesses</span></Head>
            <div className="lp-grid2">
              {SEED_BUSINESSES.map((b) => (
                <Link key={b.slug} href={`/review/${b.slug}`} className="lp-biz">
                  <span className="lp-biz-av" style={{ background: b.primary_color || '#0b6b3a' }}>{initials(b.short_name || b.name)}</span>
                  <span className="lp-biz-text"><strong>{b.short_name || b.name}</strong><small>{b.name}</small></span>
                  <span className="lp-biz-go" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="lp-section lp-tint">
          <div className="lp-wrap">
            <Head kicker="FAQ">Questions? We’ve got answers.</Head>
            <div className="lp-faq">
              {FAQS.map(([q, a], i) => (
                <details key={q} className="lp-qa" open={i === 0}>
                  <summary>{q}<span className="lp-qa-ic" aria-hidden="true">+</span></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="lp-cta">
              <div className="lp-cta-glow" aria-hidden="true" />
              <h2>Start collecting genuine 5-star reviews today</h2>
              <p>Put a <b>Smart Review QR</b> on your counter and let happy customers do the talking, in their own words.</p>
              <div className="lp-actions">
                <Link href="/login" className="lp-btn lp-btn-yellow lp-btn-lg">Customer Login →</Link>
                <a href="#businesses" className="lp-btn lp-btn-outline lp-btn-lg">Try the live demo</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-grid">
          <div className="lp-footer-brand">
            <span className="lp-logo">
              <span className="lp-logo-mark"><Icon size={20}>{STAR}</Icon></span>
              <span className="lp-logo-name">Smart Review <em>Agent</em></span>
            </span>
            <p>The smart Google review QR that helps local businesses collect honest, detailed reviews from happy customers.</p>
            <div className="lp-footer-badges"><span>✓ Google-friendly</span><span>🔒 Privacy first</span></div>
          </div>
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#journey">How it works</a>
            <a href="#dashboard">Owner dashboard</a>
            <a href="#compare">Smart vs plain QR</a>
          </div>
          <div>
            <h4>Explore</h4>
            <a href="#industries">Industries</a>
            <a href="#businesses">Live demo</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <h4>Account</h4>
            <Link href="/login">Customer login</Link>
            <Link href="/admin/login">Administrator login</Link>
          </div>
        </div>
        <div className="lp-wrap lp-footer-row">
          <span>© {new Date().getFullYear()} Smart Review Agent. All rights reserved.</span>
          <span>Reviews are always written and posted by real customers.</span>
        </div>
      </footer>
    </div>
  );
}
