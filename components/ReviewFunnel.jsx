'use client';

// Customer review funnel – the ONE shared review page for every business (what a customer sees
// after scanning a QR code or tapping an NFC tag):
// Scan → Rate (1–5 stars) → Suggestions (3/5/7) → Edit (optional) → Google.
// No questions / topics screen: suggestions follow only the customer's own star rating.
// Every rating gets the same Google button. Nothing is ever posted automatically.
import { useEffect, useRef, useState } from 'react';
import { T as BASE_T, tr } from '@/lib/i18n';
import { brandVars } from '@/lib/brand';
import VoiceGuide from '@/components/VoiceGuide';

const UI_LANGS = [
  ['en', 'EN'],
  ['hi', 'हिंदी'],
  ['mr', 'मराठी'],
];
const REVIEW_LANGS = [
  ['en', 'English'],
  ['hi', 'हिंदी'],
  ['mr', 'मराठी'],
  ['hl', 'Hinglish'],
];

const T = {
  welcome: { en: 'Welcome!', hi: 'स्वागत है!', mr: 'स्वागत आहे!' },
  // One screen: rating + suggestions together, then (optional) Edit, then Post on Google
  steps: { en: ['Review', 'Edit', 'Post'], hi: ['रिव्यू', 'बदलाव', 'पोस्ट'], mr: ['रिव्ह्यू', 'बदल', 'पोस्ट'] },
  topSub: {
    en: 'Tap your rating, then tap any review below to copy & open Google',
    hi: 'अपनी रेटिंग पर टैप करें, फिर नीचे किसी भी रिव्यू पर टैप करें – कॉपी होकर Google खुलेगा',
    mr: 'तुमच्या रेटिंगवर टॅप करा, मग खालील कोणत्याही रिव्ह्यूवर टॅप करा – कॉपी होऊन Google उघडेल',
  },
  topSubNoLink: { en: 'Tap your rating, then pick a review to copy', hi: 'अपनी रेटिंग पर टैप करें, फिर कॉपी करने के लिए रिव्यू चुनें', mr: 'तुमच्या रेटिंगवर टॅप करा, मग कॉपी करण्यासाठी रिव्ह्यू निवडा' },
  ownTitle: { en: '✍️ Add your own experience (optional)', hi: '✍️ अपना अनुभव जोड़ें (वैकल्पिक)', mr: '✍️ तुमचा अनुभव जोडा (ऐच्छिक)' },
  ownPh2: {
    en: 'In your own words: what happened, what you liked or what could be better…',
    hi: 'अपने शब्दों में: क्या हुआ, क्या अच्छा लगा या क्या बेहतर हो सकता है…',
    mr: 'तुमच्या शब्दांत: काय झालं, काय आवडलं किंवा काय सुधारता येईल…',
  },
  ownBtn: { en: 'Update suggestions', hi: 'सुझाव अपडेट करें', mr: 'सूचना अपडेट करा' },
  ownHint: { en: 'Only what you write here is added to the suggestions – nothing else.', hi: 'सुझावों में सिर्फ़ वही जोड़ा जाएगा जो आप यहाँ लिखेंगे.', mr: 'सूचनांमध्ये फक्त तुम्ही इथे लिहिलेलंच जोडलं जाईल.' },
  yourRating: { en: 'Your rating', hi: 'आपकी रेटिंग', mr: 'तुमची रेटिंग' },
  changeRating: { en: 'tap a star to change', hi: 'बदलने के लिए स्टार पर टैप करें', mr: 'बदलण्यासाठी स्टारवर टॅप करा' },
  rateQ: { en: 'How was your experience at {n}?', hi: '{n} में आपका अनुभव कैसा रहा?', mr: '{n} मधला तुमचा अनुभव कसा होता?' },
  rateHint: { en: 'Tap the stars. Every honest rating is welcome.', hi: 'स्टार पर टैप करें. हर सच्ची रेटिंग का स्वागत है.', mr: 'स्टार्सवर टॅप करा. प्रत्येक प्रामाणिक रेटिंगचं स्वागत आहे.' },
  starLabels: { en: ['Very poor', 'Poor', 'Average', 'Good', 'Excellent'], hi: ['बहुत खराब', 'खराब', 'ठीक-ठाक', 'अच्छा', 'बहुत बढ़िया'], mr: ['खूप वाईट', 'वाईट', 'ठीक-ठाक', 'चांगला', 'उत्कृष्ट'] },
  expTitle: { en: 'Tell us a little more', hi: 'थोड़ा और बताइए', mr: 'थोडं अधिक सांगा' },
  pickAny: { en: 'Pick any that apply', hi: 'जो लागू हों, चुनें', mr: 'लागू असतील ते निवडा' },
  pickOne: { en: 'Pick one', hi: 'एक चुनें', mr: 'एक निवडा' },
  optional: { en: 'optional', hi: 'वैकल्पिक', mr: 'ऐच्छिक' },
  required: { en: 'Please pick at least one option above.', hi: 'ऊपर कम से कम एक विकल्प चुनें.', mr: 'वर किमान एक पर्याय निवडा.' },
  ownWords: { en: 'Anything to add in your own words?', hi: 'अपने शब्दों में कुछ जोड़ना चाहेंगे?', mr: 'तुमच्या शब्दांत काही जोडायचं आहे?' },
  ownPh: { en: 'e.g. what you liked most (optional)', hi: 'जैसे, आपको सबसे अच्छा क्या लगा (वैकल्पिक)', mr: 'उदा. तुम्हाला सर्वात जास्त काय आवडलं (ऐच्छिक)' },
  reviewLang: { en: 'Review language', hi: 'रिव्यू की भाषा', mr: 'रिव्ह्यूची भाषा' },
  tone: { en: 'Writing style', hi: 'लिखने का अंदाज़', mr: 'लेखनशैली' },
  styles: {
    en: { simple: 'Simple', friendly: 'Friendly', professional: 'Professional', detailed: 'Detailed' },
    hi: { simple: 'सरल', friendly: 'दोस्ताना', professional: 'प्रोफेशनल', detailed: 'विस्तार से' },
    mr: { simple: 'सोपी', friendly: 'मैत्रीपूर्ण', professional: 'व्यावसायिक', detailed: 'सविस्तर' },
  },
  write: { en: 'Write my review ✨', hi: 'मेरा रिव्यू लिखें ✨', mr: 'माझा रिव्ह्यू लिहा ✨' },
  manual: { en: 'I’ll write it myself', hi: 'खुद लिखना है', mr: 'मी स्वतः लिहीन' },
  back: { en: '← Back', hi: '← पीछे', mr: '← मागे' },
  writing: { en: 'Writing {c} suggestions for your rating…', hi: 'आपकी रेटिंग के लिए {c} सुझाव लिखे जा रहे हैं…', mr: 'तुमच्या रेटिंगसाठी {c} सूचना लिहिल्या जात आहेत…' },
  draftsTitle: { en: 'Pick the one that sounds like you', hi: 'वह सुझाव चुनें जो आपकी बात कहे', mr: 'तुमच्यासारखी वाटणारी सूचना निवडा' },
  draftsNote: {
    en: 'Written only from your rating, your own words and verified facts about the business. Tap “Edit first” to make it yours.',
    hi: 'सिर्फ़ आपकी रेटिंग, आपके शब्दों और बिज़नेस की पुष्ट जानकारी से लिखा गया. इसे अपना बनाने के लिए “पहले बदलें” दबाएँ.',
    mr: 'फक्त तुमची रेटिंग, तुमचे शब्द आणि व्यवसायाच्या खात्रीशीर माहितीवरून लिहिलं आहे. तो तुमचा बनवण्यासाठी “आधी बदला” दाबा.',
  },
  draft: { en: 'Suggestion', hi: 'सुझाव', mr: 'सूचना' },
  refresh: { en: 'Refresh', hi: 'नए सुझाव', mr: 'नवीन सूचना' },
  tapToUse: { en: '✏️ Tap to use & edit →', hi: '✏️ चुनें और बदलें →', mr: '✏️ निवडा आणि बदला →' },
  // Suggestions screen (layout inspired by the shared reference; own wording, no third-party branding)
  sugSub: {
    en: 'Tap any suggestion to copy it & open Google',
    hi: 'किसी भी सुझाव पर टैप करें – वह कॉपी होगा और Google खुलेगा',
    mr: 'कोणत्याही सूचनेवर टॅप करा – ती कॉपी होईल आणि Google उघडेल',
  },
  sugHeading: { en: '✨ Review Suggestions (Tap to Copy & Go)', hi: '✨ रिव्यू सुझाव (टैप करें, कॉपी करें और जाएँ)', mr: '✨ रिव्ह्यू सूचना (टॅप करा, कॉपी करा आणि जा)' },
  tapCopyGo: { en: '📋 Tap to Copy & Redirect to Google →', hi: '📋 टैप करें: कॉपी करें और Google पर जाएँ →', mr: '📋 टॅप करा: कॉपी करा आणि Google वर जा →' },
  tapCopyOnly: { en: '📋 Tap to Copy →', hi: '📋 कॉपी करने के लिए टैप करें →', mr: '📋 कॉपी करण्यासाठी टॅप करा →' },
  editFirst: { en: '✏️ Edit first', hi: '✏️ पहले बदलें', mr: '✏️ आधी बदला' },
  copiedGo: {
    en: 'Copied! On Google, choose your own stars and paste your review.',
    hi: 'कॉपी हो गया! Google पर अपनी स्टार रेटिंग खुद चुनें और रिव्यू पेस्ट करें.',
    mr: 'कॉपी झालं! Google वर तुमचे स्टार्स स्वतः निवडा आणि रिव्ह्यू पेस्ट करा.',
  },
  googleDirect: { en: '⭐ Direct Google Review', hi: '⭐ सीधे Google रिव्यू', mr: '⭐ थेट Google रिव्ह्यू' },
  instagram: { en: '📸 Follow on Instagram', hi: '📸 Instagram पर फ़ॉलो करें', mr: '📸 Instagram वर फॉलो करा' },
  whatsapp: { en: '💬 Chat on WhatsApp', hi: '💬 WhatsApp पर बात करें', mr: '💬 WhatsApp वर बोला' },
  notSetUp: { en: 'Not set up yet', hi: 'अभी सेट नहीं है', mr: 'अजून सेट केलेलं नाही' },
  kwTitle: { en: 'Search phrase in your review (tap to change)', hi: 'आपके रिव्यू में सर्च फ़्रेज़ (बदलने के लिए टैप करें)', mr: 'तुमच्या रिव्ह्यूमधील सर्च फ्रेज (बदलण्यासाठी टॅप करा)' },
  kwMix: { en: 'A different one per review', hi: 'हर रिव्यू में अलग', mr: 'प्रत्येक रिव्ह्यूत वेगळा' },
  kwNone: { en: '✕ No search phrase', hi: '✕ कोई सर्च फ़्रेज़ नहीं', mr: '✕ सर्च फ्रेज नको' },
  useDraft: { en: 'Use this draft →', hi: 'यह ड्राफ्ट चुनें →', mr: 'हा मसुदा वापरा →' },
  aiBusy: {
    en: 'Our AI writer is busy right now, so these drafts come from our simple writer. You can edit them or write your own.',
    hi: 'AI अभी व्यस्त है, इसलिए ये ड्राफ्ट सरल लेखक ने बनाए हैं. आप इन्हें बदल सकते हैं या खुद लिख सकते हैं.',
    mr: 'AI सध्या व्यस्त आहे, म्हणून हे मसुदे साध्या लेखकाने तयार केले आहेत. तुम्ही बदलू शकता किंवा स्वतः लिहू शकता.',
  },
  editTitle: { en: 'Make it yours', hi: 'इसे अपना बनाइए', mr: 'हा रिव्ह्यू तुमचा बनवा' },
  editNote: {
    en: 'Change anything you like. Post it only if it reflects your genuine experience.',
    hi: 'जो चाहें बदलें. तभी पोस्ट करें जब यह आपका सच्चा अनुभव हो.',
    mr: 'हवं ते बदला. हा तुमचा खरा अनुभव असेल तरच पोस्ट करा.',
  },
  manualPh: { en: 'Write your review here in your own words…', hi: 'अपना रिव्यू यहाँ अपने शब्दों में लिखें…', mr: 'तुमचा रिव्ह्यू इथे तुमच्या शब्दांत लिहा…' },
  words: { en: 'words', hi: 'शब्द', mr: 'शब्द' },
  copy: { en: '📋 Copy', hi: '📋 कॉपी करें', mr: '📋 कॉपी करा' },
  copied: { en: 'Copied!', hi: 'कॉपी हो गया!', mr: 'कॉपी झालं!' },
  toGoogle: { en: 'Continue to Google →', hi: 'Google पर आगे बढ़ें →', mr: 'Google वर पुढे जा →' },
  tooShort: { en: 'Please write a few words first.', hi: 'पहले कुछ शब्द लिखें.', mr: 'आधी काही शब्द लिहा.' },
  postTitle: { en: 'Post it on Google', hi: 'Google पर पोस्ट करें', mr: 'Google वर पोस्ट करा' },
  postSteps: {
    en: ['Tap the button: your review is copied and Google opens.', 'Choose your own star rating on Google.', 'Paste the text (long-press → Paste) and tap Post.'],
    hi: ['बटन दबाएँ: रिव्यू कॉपी होगा और Google खुलेगा.', 'Google पर अपनी स्टार रेटिंग खुद चुनें.', 'टेक्स्ट पेस्ट करें (दबाकर रखें → Paste) और Post दबाएँ.'],
    mr: ['बटण दाबा: रिव्ह्यू कॉपी होईल आणि Google उघडेल.', 'Google वर तुमचे स्टार्स स्वतः निवडा.', 'मजकूर पेस्ट करा (दाबून ठेवा → Paste) आणि Post वर टॅप करा.'],
  },
  openGoogle: { en: 'Copy & open Google Reviews', hi: 'कॉपी करें और Google रिव्यू खोलें', mr: 'कॉपी करा आणि Google रिव्ह्यू उघडा' },
  noLink: { en: BASE_T.noGoogleLink.en, hi: BASE_T.noGoogleLink.hi, mr: BASE_T.noGoogleLink.mr },
  doneTitle: { en: 'Thank you! 🙏', hi: 'धन्यवाद! 🙏', mr: 'धन्यवाद! 🙏' },
  doneText: {
    en: 'Thanks for sharing your honest feedback with {n}. Your review is still copied if you need to paste it again.',
    hi: '{n} के साथ अपना सच्चा फीडबैक साझा करने के लिए धन्यवाद. ज़रूरत हो तो रिव्यू फिर से पेस्ट कर सकते हैं.',
    mr: '{n} सोबत तुमचा प्रामाणिक अभिप्राय शेअर केल्याबद्दल धन्यवाद. गरज असल्यास रिव्ह्यू पुन्हा पेस्ट करू शकता.',
  },
  openAgain: { en: 'Open Google again', hi: 'Google फिर से खोलें', mr: 'Google पुन्हा उघडा' },
  footNote: { en: 'You choose your stars and post it yourself on Google', hi: 'स्टार आप चुनते हैं और Google पर खुद पोस्ट करते हैं', mr: 'स्टार्स तुम्ही निवडता आणि Google वर स्वतः पोस्ट करता' },
  privacy: {
    en: 'Your rating is shared with {n} to help them improve. We never ask for your name or phone number.',
    hi: 'आपकी रेटिंग {n} के साथ साझा होती है ताकि वे सुधार कर सकें. हम आपका नाम या फ़ोन नंबर नहीं माँगते.',
    mr: 'तुमची रेटिंग {n} सोबत शेअर केली जाते, जेणेकरून ते सुधारणा करू शकतील. आम्ही तुमचं नाव किंवा फोन नंबर विचारत नाही.',
  },
};
const t = (k, lang, vars) => tr(T[k], lang, vars);

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// Shown only in admin/owner previews: this address (with ?preview=1, maybe on localhost) is NOT for customers.
function PreviewNotice({ customerUrl }) {
  const [img, setImg] = useState('');
  useEffect(() => {
    if (customerUrl) import('@/lib/qr-client').then((m) => m.qrPng(customerUrl, 300)).then(setImg).catch(() => setImg(''));
  }, [customerUrl]);
  return (
    <div className="rf-preview-note">
      {img && <img src={img} alt="Customer QR code" />}
      <div>
        <b>Preview only — do not share or make a QR of this page’s address.</b>
        {customerUrl ? <> Customers use: <code>{customerUrl}</code> (this QR).</> : <> Set PUBLIC_SITE_URL to get the customer link.</>}
      </div>
    </div>
  );
}

function Star({ on, delay, onClick, label, big }) {
  return (
    <button type="button" className={'rf-star' + (on ? ' on' : '') + (big ? ' big' : '')} style={{ animationDelay: `${delay}ms` }} onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" /></svg>
    </button>
  );
}

export default function ReviewFunnel({ business, preview = false, source = 'link', campaign = null, customerUrl = null }) {
  const name = business.short_name || business.name;
  const [lang, setLang] = useState('en');
  const [step, setStep] = useState('rate'); // rate (rating + suggestions on one screen) | edit | post | done
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [burst, setBurst] = useState(0);
  const [reviewLang, setReviewLang] = useState('en');
  const [details, setDetails] = useState(''); // customer's own words (optional)
  const [keyword, setKeyword] = useState(null);
  const [noKw, setNoKw] = useState(false); // customer chose "No search phrase"
  const [drafts, setDrafts] = useState([]);
  const [seen, setSeen] = useState([]); // every suggestion shown in this visit (Refresh avoids them)
  const [text, setText] = useState('');
  const [manual, setManual] = useState(false);
  const [meta, setMeta] = useState({ source: null, aiUnavailable: null, keywordSuggestions: [] });
  const [fb, setFb] = useState(null); // { id, token }
  const [seed, setSeed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const topRef = useRef(null);

  const count = business.settings?.suggestions || 3; // set by the admin (3 / 5 / 7)

  useEffect(() => {
    // The admin's preferred language for this business; otherwise the phone's language.
    // The customer can switch EN / हिंदी / मराठी at any time (top right).
    const nav = (navigator.language || '').toLowerCase();
    const pref = business.settings?.language;
    const l = ['en', 'hi', 'mr'].includes(pref) ? pref : nav.startsWith('hi') ? 'hi' : nav.startsWith('mr') ? 'mr' : 'en';
    setLang(l);
    setReviewLang(l);
    if (!preview)
      fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: business.slug, type: 'visit', source, campaign }),
        keepalive: true,
      }).catch(() => {});
  }, [business.slug, preview, source]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3500);
  };

  // Star tapped → suggestions appear right below, on the same screen. Tapping another star later gives
  // fresh suggestions for the new rating. Suggestions use only the rating, the customer's own words,
  // the business's verified facts and a keyword the customer tapped – nothing is invented.
  const rate = (n) => {
    if (busy || n === stars) return;
    const first = !stars;
    setStars(n);
    setManual(false);
    if (first) setBurst((b) => b + 1);
    fetchDrafts({ overrides: { stars: n } }); // the customer's search-phrase choice is kept
  };
  // Search phrase (SEO keyword) choice: null = the business's keywords in rotation (one per card),
  // a keyword = that one in every card, noKw = no search phrase at all.
  const chooseKeyword = (k, none = false) => {
    setKeyword(k);
    setNoKw(none);
    fetchDrafts({ overrides: { keyword: k, noKw: none } });
  };

  const fetchDrafts = async ({ regenerate = false, overrides = {}, mode } = {}) => {
    const nextSeed = regenerate ? seed + 1 : seed;
    const payload = {
      slug: business.slug,
      stars: overrides.stars ?? stars,
      answers: {}, // no questions / topics screen
      details: overrides.details ?? details, // the customer's own words (optional)
      language: overrides.language ?? reviewLang,
      style: 'friendly', // each card gets its own natural style on the server
      keyword: overrides.keyword !== undefined ? overrides.keyword : keyword,
      noKeyword: overrides.noKw ?? noKw,
      source,
      campaign,
      preview,
      seed: nextSeed,
      previous: mode === 'manual' ? [] : seen,
      feedbackId: fb?.id,
      feedbackToken: fb?.token,
      mode,
    };
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/review/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      if (j.feedback) setFb(j.feedback);
      setSeed(nextSeed);
      setMeta({ source: j.source, aiUnavailable: j.aiUnavailable, keywordSuggestions: j.keywordSuggestions || [] });
      if (mode !== 'manual') {
        setDrafts(j.drafts || []);
        setSeen((s) => [...s, ...(j.drafts || [])].slice(-35));
      }
      return true;
    } catch (e) {
      setError(e.message === 'Error' ? tr(BASE_T.error, lang) : e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // From "I'll write it myself": back to suggestions for the same rating.
  const startDrafts = async () => {
    setManual(false);
    setStep('rate');
    await fetchDrafts();
  };

  const save = (action, reviewText = text) =>
    fb
      ? fetch('/api/review/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: fb.id, token: fb.token, action, review_text: reviewText, manual }),
          keepalive: true,
        }).catch(() => {})
      : Promise.resolve();

  const onCopy = async () => {
    if (await copyText(text)) {
      flash(t('copied', lang));
      save('copy');
    }
  };
  const onGoogle = () => {
    copyText(text);
    save('google');
    setTimeout(() => setStep('done'), 400);
  };
  // Suggestion card tapped: copy that text and open Google (the card is a real link, so phones open it
  // reliably). Counted exactly like the main Google button; nothing is recorded in previews.
  // Without a Google link: copy it and show the existing "post it yourself" step instead.
  const onPickSuggestion = (d) => {
    setManual(false);
    setText(d);
    copyText(d);
    if (business.google_review_url) {
      save('google', d);
      flash(t('copiedGo', lang));
      setTimeout(() => setStep('done'), 400);
    } else {
      save('copy', d);
      flash(t('copied', lang));
      setStep('post');
    }
  };
  const onEditFirst = (d) => {
    setManual(false);
    setText(d);
    setStep('edit');
  };

  // "Write a Google review" at the bottom of the page: opens the same Google link. If the customer
  // already has review text, it is copied first. Counted like the main Google button (not in previews).
  const onDirectGoogle = () => {
    const has = text.trim().split(/\s+/).filter(Boolean).length >= 3;
    if (has) copyText(text);
    if (preview) return;
    if (fb && has) save('google');
    else
      fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: business.slug, type: 'google_open', language: reviewLang, campaign }),
        keepalive: true,
      }).catch(() => {});
  };
  // Bottom buttons: only those the business configured (no broken links), never next to the big Google button.
  const showDirectGoogle = !!business.google_review_url && step !== 'post' && step !== 'done';

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const stepIndex = { rate: 0, edit: 1, post: 2, done: 3 }[step]; // Review → Edit → Post
  const stepCount = 3;
  const shown = hover || stars;

  // Layout follows the shared reference design: one dark rounded panel with the business name,
  // a heading + Refresh, review cards with "Tap to Copy & Redirect to Google", then the Google /
  // Instagram / WhatsApp buttons and a small footer line. Same design for every business.
  return (
    <div className="rf rf-ref" style={brandVars(business)}>
      {preview && <div className="preview-bar">{tr(BASE_T.preview, lang)}</div>}
      {preview && <PreviewNotice customerUrl={customerUrl} />}
      <main className="rf-ref-wrap">
        <div className="rf-ref-box" ref={topRef}>
          {/* top row: optional logo · language */}
          <div className="rf-ref-top">
            {business.logo_url ? <img className="rf-ref-logo" src={business.logo_url} alt="" /> : <span />}
            <div className="rf-lang" role="group" aria-label="Language">
              {UI_LANGS.map(([c, l]) => (
                <button key={c} type="button" className={lang === c ? 'on' : ''} aria-pressed={lang === c} onClick={() => { setLang(c); if (!stars) setReviewLang(c); }}>{l}</button>
              ))}
            </div>
          </div>

          {step !== 'rate' && (
            <nav className="rf-progress" aria-label="Progress">
              <div className="rf-track"><i style={{ width: `${(Math.min(stepIndex + 1, stepCount) / stepCount) * 100}%` }} /></div>
              <ol>
                {T.steps[lang].map((s, i) => (
                  <li key={s} className={i < stepIndex ? 'done' : i === stepIndex ? 'on' : ''}>
                    <span>{i < stepIndex ? '✓' : i + 1}</span>
                    <small>{s}</small>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <section className="rf-ref-section" key={step}>
            {/* ---------- 1. ONE screen: business, rating and (after a star tap) the suggestions ---------- */}
            {step === 'rate' && (
              <div className="rf-one">
                <h1 className="rf-ref-title">{name}</h1>
                <p className="rf-ref-sub">{t(business.google_review_url ? 'topSub' : 'topSubNoLink', lang)}</p>
                <div className="rf-ref-rate">
                  <p className="rf-ref-q">{t('rateQ', lang, { n: name })}</p>
                  <div className="rf-stars" onMouseLeave={() => setHover(0)} key={burst}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} onMouseEnter={() => setHover(n)}>
                        <Star big on={n <= shown} delay={stars && n <= stars ? n * 60 : 0} onClick={() => rate(n)} label={`${n} – ${T.starLabels[lang][n - 1]}`} />
                      </span>
                    ))}
                  </div>
                  <p className={'rf-star-label show' + (shown ? '' : ' rf-star-hint')}>{shown ? T.starLabels[lang][shown - 1] : t('rateHint', lang)}</p>
                </div>

                {stars > 0 && (
                  <div className="rf-drafts">
                    <div className="rf-drafts-head">
                      <h3 className="rf-sugg-heading">{t('sugHeading', lang)}</h3>
                      <button type="button" className="rf-refresh" disabled={busy} onClick={() => fetchDrafts({ regenerate: true })}>
                        <span className="rf-refresh-ico" aria-hidden="true">🔄</span>
                        <span>{t('refresh', lang)}</span>
                      </button>
                    </div>
                    {busy ? (
                      <div className="rf-loading" role="status">
                        <span className="rf-dots"><i /><i /><i /></span>
                        <p>{t('writing', lang, { c: count })}</p>
                        {Array.from({ length: count }, (_, i) => <div key={i} className="rf-skel" />)}
                      </div>
                    ) : error ? (
                      <>
                        <p className="rf-err">{error}</p>
                        <button type="button" className="rf-btn" onClick={() => fetchDrafts()}>{tr(BASE_T.tryAgain, lang)}</button>
                      </>
                    ) : (
                      <>
                        {meta.aiUnavailable && <p className="rf-info">{t('aiBusy', lang)}</p>}
                        {/* Each card: tap = copy & open Google (customer picks their own stars there);
                            "Edit first" = open it in the editor to make it their own. */}
                        <div className="rf-draft-list">
                          {drafts.map((d) => {
                            const inner = (
                              <>
                                <span className="rf-draft-text">{d}</span>
                                <span className="rf-scard-go">{t(business.google_review_url ? 'tapCopyGo' : 'tapCopyOnly', lang)}</span>
                              </>
                            );
                            return (
                              <div key={d} className="rf-scard">
                                {business.google_review_url ? (
                                  <a className="rf-scard-main" href={business.google_review_url} target="_blank" rel="noopener noreferrer" onClick={() => onPickSuggestion(d)}>{inner}</a>
                                ) : (
                                  <button type="button" className="rf-scard-main" onClick={() => onPickSuggestion(d)}>{inner}</button>
                                )}
                                <button type="button" className="rf-scard-edit" onClick={() => onEditFirst(d)}>{t('editFirst', lang)}</button>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* options (all optional): own experience · review language · search phrase · write myself */}
                    <div className="rf-ref-opts">
                      <details className="rf-own" open={!!details}>
                        <summary>{t('ownTitle', lang)}</summary>
                        <textarea rows={3} maxLength={400} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={t('ownPh2', lang)} />
                        <div className="rf-own-foot">
                          <small>{t('ownHint', lang)}</small>
                          <button type="button" className="rf-own-btn" disabled={busy} onClick={() => fetchDrafts({ overrides: { details } })}>{t('ownBtn', lang)}</button>
                        </div>
                      </details>
                      <div className="rf-seg rf-seg-full rf-seg-lang" role="group" aria-label={t('reviewLang', lang)}>
                        {REVIEW_LANGS.map(([c, l]) => (
                          <button key={c} type="button" className={reviewLang === c ? 'on' : ''} disabled={busy} onClick={() => { if (c === reviewLang) return; setReviewLang(c); fetchDrafts({ overrides: { language: c } }); }}>{l}</button>
                        ))}
                      </div>
                      {meta.keywordSuggestions?.length > 0 && (
                        <div className="rf-kw">
                          <p className="rf-q-title">{t('kwTitle', lang)}</p>
                          <div className="rf-chips">
                            <button type="button" className={'rf-chip sm' + (!keyword && !noKw ? ' on' : '')} disabled={busy} onClick={() => chooseKeyword(null)}>
                              {!keyword && !noKw ? '✓ ' : ''}{t('kwMix', lang)}
                            </button>
                            {meta.keywordSuggestions.map((k) => (
                              <button key={k} type="button" className={'rf-chip sm' + (keyword === k ? ' on' : '')} disabled={busy} onClick={() => chooseKeyword(k)}>
                                {keyword === k ? '✓ ' : ''}{k}
                              </button>
                            ))}
                            <button type="button" className={'rf-chip sm' + (noKw ? ' on' : '')} disabled={busy} onClick={() => chooseKeyword(null, true)}>
                              {noKw ? '✓ ' : ''}{t('kwNone', lang)}
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="rf-sub rf-sugg-note">{t('draftsNote', lang)}</p>
                      <div className="rf-links rf-links-end">
                        <button type="button" className="rf-link" onClick={() => { setManual(true); setText(''); setStep('edit'); }}>{t('manual', lang)}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---------- 2. edit ---------- */}
            {step === 'edit' && (
              <div className="rf-edit">
                <h2>{t('editTitle', lang)}</h2>
                <p className="rf-sub">{t('editNote', lang)}</p>
                <textarea className="rf-textarea" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('manualPh', lang)} maxLength={2000} autoFocus={manual} />
                <div className="rf-meta"><span>{words} {t('words', lang)}</span><button type="button" className="rf-link" onClick={onCopy} disabled={!text.trim()}>{t('copy', lang)}</button></div>
                {error && <p className="rf-err">{error}</p>}
                <button type="button" className="rf-btn" onClick={() => (text.trim().split(/\s+/).length >= 3 ? setStep('post') : flash(t('tooShort', lang)))}>{t('toGoogle', lang)}</button>
                <div className="rf-links">
                  <button type="button" className="rf-link" onClick={() => setStep('rate')}>{t('back', lang)}</button>
                  {manual && <button type="button" className="rf-link" onClick={startDrafts}>{t('write', lang)}</button>}
                </div>
              </div>
            )}

            {/* ---------- 3. Google ---------- */}
            {step === 'post' && (
              <div className="rf-post">
                <h2>{t('postTitle', lang)}</h2>
                <ol className="rf-steps">{T.postSteps[lang].map((s) => <li key={s}>{s}</li>)}</ol>
                <blockquote className="rf-quote">{text}</blockquote>
                {business.google_review_url ? (
                  <a className="rf-btn rf-google" href={business.google_review_url} target="_blank" rel="noopener noreferrer" onClick={onGoogle}>
                    <span aria-hidden="true">⭐</span>
                    {t('openGoogle', lang)}
                  </a>
                ) : (
                  <>
                    <p className="rf-info">{t('noLink', lang)}</p>
                    <button type="button" className="rf-btn" onClick={() => { onCopy(); setStep('done'); }}>{t('copy', lang)}</button>
                  </>
                )}
                <div className="rf-links"><button type="button" className="rf-link" onClick={() => setStep('edit')}>{t('back', lang)}</button></div>
              </div>
            )}

            {/* ---------- done ---------- */}
            {step === 'done' && (
              <div className="rf-done">
                <div className="rf-check" aria-hidden="true">✓</div>
                <h2>{t('doneTitle', lang)}</h2>
                <p className="rf-sub">{t('doneText', lang, { n: name })}</p>
                {business.google_review_url && (
                  <a className="rf-btn rf-ghost" href={business.google_review_url} target="_blank" rel="noopener noreferrer" onClick={() => copyText(text)}>{t('openAgain', lang)}</a>
                )}
                <button type="button" className="rf-link" onClick={() => window.location.reload()}>↺ {tr(BASE_T.startOver, lang)}</button>
              </div>
            )}
          </section>

          {/* big buttons – always all three. A button whose link is not saved for THIS business is shown
              greyed out ("Not set up yet") and does nothing, so a customer never lands on a wrong page.
              On the Post / Done steps the main Google button above replaces "Direct Google Review". */}
          <nav className="rf-social" aria-label="Links">
            {showDirectGoogle ? (
              <a className="rf-sbtn rf-s-google" href={business.google_review_url} target="_blank" rel="noopener noreferrer" onClick={onDirectGoogle}>{t('googleDirect', lang)}</a>
            ) : !business.google_review_url && (
              <span className="rf-sbtn rf-s-google rf-sbtn-off" aria-disabled="true">{t('googleDirect', lang)}<small>{t('notSetUp', lang)}</small></span>
            )}
            {business.instagram_url ? (
              <a className="rf-sbtn rf-s-ig" href={business.instagram_url} target="_blank" rel="noopener noreferrer">{t('instagram', lang)}</a>
            ) : (
              <span className="rf-sbtn rf-s-ig rf-sbtn-off" aria-disabled="true">{t('instagram', lang)}<small>{t('notSetUp', lang)}</small></span>
            )}
            {business.whatsapp_url ? (
              <a className="rf-sbtn rf-s-wa" href={business.whatsapp_url} target="_blank" rel="noopener noreferrer">{t('whatsapp', lang)}</a>
            ) : (
              <span className="rf-sbtn rf-s-wa rf-sbtn-off" aria-disabled="true">{t('whatsapp', lang)}<small>{t('notSetUp', lang)}</small></span>
            )}
          </nav>

          {/* footer line (no third-party branding, no PIN) */}
          <footer className="rf-ref-foot">
            <span>{t('footNote', lang)}</span>
          </footer>
          <div className="rf-ref-voice">
            <VoiceGuide lang={lang} step={step === 'rate' && stars ? 'drafts' : step} busy={busy} error={error} draftsCount={drafts.length} manual={manual} hasGoogleLink={!!business.google_review_url} name={name} />
          </div>
          <p className="rf-fine">{t('privacy', lang, { n: name })}</p>
        </div>
      </main>
      {toast && <div className="rf-toast" role="status">{toast}</div>}
    </div>
  );
}
