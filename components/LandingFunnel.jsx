'use client';

import { useEffect, useRef, useState } from 'react';

const STEPS = [
  { title: 'Scan the table QR', text: 'A quick scan from any phone camera. No app, no login, no waiting.' },
  { title: 'Pick a language', text: 'English, मराठी or हिंदी. Customers talk the way they feel most comfortable.' },
  { title: 'Rate the visit', text: 'One tap on a face, from “Excellent” to “Not satisfied”. Every answer is welcome.' },
  { title: 'Tap what stood out', text: 'Friendly staff, quick service, great value. Ready-made chips, zero typing.' },
  { title: 'AI writes the draft', text: 'A natural, personal review built only from their choices. Edit it or ask for new wording.' },
  { title: 'Post & track', text: 'One button copies the review and opens Google. You watch scans and posts grow on your dashboard.' },
];
const LAST = STEPS.length - 1;
const DELAY = 3800;

// What the customer's phone shows, in each language.
const TXT = {
  en: {
    scan: 'Point camera at the table card',
    hello: 'Hi! 👋 Which language would you like?',
    how: 'How was your experience today?',
    faces: ['Excellent', 'Good', 'Average', 'Not satisfied'],
    liked: 'What did you like most?',
    chips: ['Friendly staff', 'Quick service', 'Clean place', 'Great value', 'Helpful advice'],
    ready: '✨ Your draft is ready',
    draft: '“Lovely visit! The staff were warm and helpful, service was quick and the place was spotless. Will be back soon.”',
    edit: '✏️ Edit', reword: '↻ New wording',
    post: '★ Post on Google', copied: 'Review copied. Paste & post 👍',
  },
  mr: {
    scan: 'टेबलवरील कार्डकडे कॅमेरा धरा',
    hello: 'नमस्कार! 👋 कोणती भाषा निवडाल?',
    how: 'आजचा तुमचा अनुभव कसा होता?',
    faces: ['उत्कृष्ट', 'चांगला', 'ठीक-ठाक', 'समाधानी नाही'],
    liked: 'तुम्हाला सर्वात जास्त काय आवडलं?',
    chips: ['मैत्रीपूर्ण स्टाफ', 'जलद सेवा', 'स्वच्छ जागा', 'योग्य किंमत', 'उपयुक्त सल्ला'],
    ready: '✨ तुमचा ड्राफ्ट तयार आहे',
    draft: '“खूप छान अनुभव! स्टाफ मनमिळाऊ आणि मदतशील होता, सेवा जलद मिळाली आणि जागा अगदी स्वच्छ होती. पुन्हा नक्की येईन.”',
    edit: '✏️ बदला', reword: '↻ नवीन शब्द',
    post: '★ Google वर पोस्ट करा', copied: 'रिव्ह्यू कॉपी झाला. पेस्ट करा आणि पोस्ट करा 👍',
  },
  hi: {
    scan: 'टेबल कार्ड की ओर कैमरा करें',
    hello: 'नमस्ते! 👋 आप कौन-सी भाषा चुनेंगे?',
    how: 'आज आपका अनुभव कैसा रहा?',
    faces: ['बहुत बढ़िया', 'अच्छा', 'ठीक-ठाक', 'संतुष्ट नहीं'],
    liked: 'आपको सबसे ज़्यादा क्या पसंद आया?',
    chips: ['दोस्ताना स्टाफ', 'तेज़ सेवा', 'साफ़ जगह', 'सही कीमत', 'मददगार सलाह'],
    ready: '✨ आपका ड्राफ्ट तैयार है',
    draft: '“बहुत अच्छा अनुभव! स्टाफ मिलनसार और मददगार था, सेवा जल्दी मिली और जगह बिल्कुल साफ़ थी. फिर ज़रूर आऊँगा.”',
    edit: '✏️ बदलें', reword: '↻ नए शब्द',
    post: '★ Google पर पोस्ट करें', copied: 'रिव्यू कॉपी हो गया. पेस्ट करें और पोस्ट करें 👍',
  },
};
const LANGS = [['en', 'English'], ['mr', 'मराठी'], ['hi', 'हिंदी']];
const QR_ON = new Set([0, 1, 7, 8, 5, 6, 12, 13, 35, 36, 42, 43]);

function Screen({ step, lang }) {
  const t = TXT[lang];
  switch (step) {
    case 0:
      return (
        <div className="ph-center">
          <div className="ph-qr" aria-hidden="true">
            {Array.from({ length: 49 }).map((_, i) => <span key={i} className={(i * 7 + (i % 5)) % 3 === 0 || QR_ON.has(i) ? 'on' : ''} />)}
            <i className="ph-scanline" />
          </div>
          <p className="ph-cap">{t.scan}</p>
        </div>
      );
    case 1:
      return (
        <div className="ph-stack">
          <p className="ph-bot">{t.hello}</p>
          {LANGS.map(([code, label]) => <span key={code} className={'ph-opt' + (code === lang ? ' sel' : '')}>{label}</span>)}
        </div>
      );
    case 2:
      return (
        <div className="ph-stack">
          <p className="ph-bot">{t.how}</p>
          <div className="ph-faces">
            {['😍', '🙂', '😐', '🙁'].map((e, i) => <span key={e} className={'ph-face' + (i === 0 ? ' sel' : '')}><b>{e}</b>{t.faces[i]}</span>)}
          </div>
        </div>
      );
    case 3:
      return (
        <div className="ph-stack">
          <p className="ph-bot">{t.liked}</p>
          <div className="ph-chips">
            {t.chips.map((c, i) => <span key={c} className={'ph-opt sm' + (i < 3 ? ' sel' : '')}>{i < 3 ? '✓ ' : ''}{c}</span>)}
          </div>
        </div>
      );
    case 4:
      return (
        <div className="ph-stack">
          <p className="ph-bot">{t.ready}</p>
          <div className="ph-draft">{t.draft}</div>
          <div className="ph-row"><span className="ph-mini">{t.edit}</span><span className="ph-mini">{t.reword}</span></div>
        </div>
      );
    default:
      return (
        <div className="ph-stack">
          <span className="ph-google">{t.post}</span>
          <p className="ph-cap">{t.copied}</p>
          <div className="ph-dash">
            <div><small>QR scans</small><b>128</b></div>
            <div><small>Drafts</small><b>96</b></div>
            <div><small>Opened Google</small><b>81</b></div>
          </div>
          <p className="ph-note">Owner dashboard · sample numbers</p>
        </div>
      );
  }
}

export default function LandingFunnel() {
  const rootRef = useRef(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [lang, setLang] = useState('en');
  const finished = step === LAST && !playing && started;

  // Start from step 1 the first time the section scrolls into view; pause while it is off-screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (visible && !started) {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      setStarted(true);
      setStep(0);
      setPlaying(!reduced);
    }
  }, [visible, started]);

  // Advance while playing and visible; stop on the last step (Replay restarts).
  useEffect(() => {
    if (!playing || !visible) return undefined;
    if (step >= LAST) {
      const t = setTimeout(() => setPlaying(false), DELAY);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), DELAY);
    return () => clearTimeout(t);
  }, [step, playing, visible]);

  const go = (i) => setStep(Math.max(0, Math.min(LAST, i)));
  const replay = () => {
    setStep(0);
    setPlaying(true);
  };
  const toggle = () => {
    if (finished) return replay();
    setPlaying((p) => !p);
  };
  const running = playing && visible;

  return (
    <div className="fn" ref={rootRef}>
      <div className="fn-list">
        <ol className="fn-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                className={'fn-step' + (i === step ? ' on' : '') + (i < step ? ' done' : '')}
                onClick={() => { go(i); setPlaying(false); }}
                aria-current={i === step ? 'step' : undefined}
              >
                <span className="fn-num">{i < step ? '✓' : i + 1}</span>
                <span className="fn-body">
                  <strong>{s.title}</strong>
                  <small>{s.text}</small>
                </span>
                {i === step && running && <span key={`${step}-${lang}`} className="fn-bar" style={{ animationDuration: `${DELAY}ms` }} />}
              </button>
            </li>
          ))}
        </ol>

        <div className="fn-ctrl">
          <button type="button" className="fn-round" onClick={() => { go(step - 1); setPlaying(false); }} disabled={step === 0} aria-label="Previous step">‹</button>
          <button type="button" className="fn-round fn-play" onClick={toggle} aria-label={finished ? 'Replay' : playing ? 'Pause' : 'Play'}>
            {finished ? '↺' : playing ? '❚❚' : '▶'}
          </button>
          <button type="button" className="fn-round" onClick={() => { go(step + 1); setPlaying(false); }} disabled={step === LAST} aria-label="Next step">›</button>
          <span className="fn-count" aria-live="polite">Step {step + 1} of {STEPS.length}</span>
          {finished && <button type="button" className="fn-replay" onClick={replay}>↺ Replay</button>}
          <div className="fn-langs" role="group" aria-label="Phone language">
            {LANGS.map(([code, label]) => (
              <button key={code} type="button" className={code === lang ? 'on' : ''} onClick={() => setLang(code)} aria-pressed={code === lang}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="fn-phone-wrap">
        <span className="fn-tag">● Live customer view</span>
        <div className="ph">
          <div className="ph-notch" />
          <div className="ph-top">
            <span className="ph-av">SR</span>
            <span><b>Review Assistant</b><small><i className="ph-online" /> online</small></span>
          </div>
          <div className="ph-screen" key={`${step}-${lang}`}>
            <Screen step={step} lang={lang} />
          </div>
        </div>
        <div className="fn-dots" aria-hidden="true">
          {STEPS.map((s, i) => <span key={s.title} className={i <= step ? 'on' : ''} />)}
        </div>
      </div>
    </div>
  );
}
