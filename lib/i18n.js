// Fixed UI text for the customer chat in English, Marathi and Hindi.
export const LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
];

export const RATINGS = [
  { id: 'excellent', label: { en: 'Excellent', mr: 'उत्कृष्ट', hi: 'बहुत बढ़िया' }, emoji: '😍' },
  { id: 'good', label: { en: 'Good', mr: 'चांगला', hi: 'अच्छा' }, emoji: '🙂' },
  { id: 'average', label: { en: 'Average', mr: 'ठीक-ठाक', hi: 'ठीक-ठाक' }, emoji: '😐' },
  { id: 'not_satisfied', label: { en: 'Not satisfied', mr: 'समाधानी नाही', hi: 'संतुष्ट नहीं' }, emoji: '🙁' },
];

// Which rating sees which question group.
export function questionVisible(q, rating) {
  if (q.showFor === 'liked') return ['excellent', 'good', 'average'].includes(rating);
  if (q.showFor === 'improve') return ['average', 'not_satisfied'].includes(rating);
  return true;
}

export const T = {
  online: { en: 'Feedback assistant · online', mr: 'फीडबॅक असिस्टंट · ऑनलाइन', hi: 'फीडबैक असिस्टेंट · ऑनलाइन' },
  askRating: {
    en: 'How was your experience with {name}?',
    mr: '{name} सोबतचा तुमचा अनुभव कसा होता?',
    hi: '{name} के साथ आपका अनुभव कैसा रहा?',
  },
  askLanguage: {
    en: 'Which language would you prefer for your review?',
    mr: 'तुमचा रिव्ह्यू कोणत्या भाषेत हवा आहे?',
    hi: 'आप अपना रिव्यू किस भाषा में चाहेंगे?',
  },
  askDetails: {
    en: 'Anything else you want to say in your own words? Type it below, or tap "No, continue".',
    mr: 'तुमच्या शब्दांत आणखी काही सांगायचं असेल तर खाली लिहा, नाहीतर "नाही, पुढे चला" दाबा.',
    hi: 'अपने शब्दों में कुछ और कहना हो तो नीचे लिखें, नहीं तो "नहीं, आगे बढ़ें" दबाएँ.',
  },
  detailsPlaceholder: {
    en: 'e.g. what stood out for you (optional)',
    mr: 'उदा. तुम्हाला विशेष काय वाटलं (ऐच्छिक)',
    hi: 'जैसे, आपको क्या खास लगा (वैकल्पिक)',
  },
  add: { en: 'Add', mr: 'जोडा', hi: 'जोड़ें' },
  skip: { en: 'Skip', mr: 'वगळा', hi: 'छोड़ें' },
  continue: { en: 'Continue', mr: 'पुढे', hi: 'आगे बढ़ें' },
  noDetails: { en: 'No, continue', mr: 'नाही, पुढे चला', hi: 'नहीं, आगे बढ़ें' },
  skipped: { en: 'Skipped', mr: 'वगळलं', hi: 'छोड़ दिया' },
  writing: {
    en: 'Thank you! Writing your review draft from your answers…',
    mr: 'धन्यवाद! तुमच्या उत्तरांवरून रिव्ह्यूचा मसुदा तयार करत आहे…',
    hi: 'धन्यवाद! आपके जवाबों से रिव्यू का ड्राफ्ट तैयार कर रहा हूँ…',
  },
  ready: {
    en: 'Your review draft is ready. It is based only on what you selected – please read it, edit anything you like, and post it only if it reflects your genuine experience.',
    mr: 'तुमचा रिव्ह्यू मसुदा तयार आहे. तो फक्त तुम्ही निवडलेल्या गोष्टींवर आधारित आहे – कृपया वाचा, हवं ते बदला आणि तो तुमचा खरा अनुभव असेल तरच पोस्ट करा.',
    hi: 'आपका रिव्यू ड्राफ्ट तैयार है. यह सिर्फ़ आपके चुने हुए जवाबों पर आधारित है – कृपया पढ़ें, जो चाहें बदलें, और तभी पोस्ट करें जब यह आपका सच्चा अनुभव हो.',
  },
  error: {
    en: 'Sorry, something went wrong while writing the draft. Please try again.',
    mr: 'माफ करा, मसुदा तयार करताना अडचण आली. कृपया पुन्हा प्रयत्न करा.',
    hi: 'माफ़ कीजिए, ड्राफ्ट बनाते समय कुछ गड़बड़ हुई. कृपया फिर से कोशिश करें.',
  },
  tryAgain: { en: 'Try again', mr: 'पुन्हा प्रयत्न करा', hi: 'फिर से कोशिश करें' },
  yourReview: { en: 'Your review (editable)', mr: 'तुमचा रिव्ह्यू (बदलता येईल)', hi: 'आपका रिव्यू (बदल सकते हैं)' },
  words: { en: 'words', mr: 'शब्द', hi: 'शब्द' },
  copy: { en: 'Copy', mr: 'कॉपी करा', hi: 'कॉपी करें' },
  copied: { en: 'Copied!', mr: 'कॉपी झालं!', hi: 'कॉपी हो गया!' },
  regenerate: { en: 'New wording', mr: 'नवीन शब्दरचना', hi: 'नए शब्दों में' },
  openGoogle: { en: 'Post on Google', mr: 'Google वर पोस्ट करा', hi: 'Google पर पोस्ट करें' },
  googleHint: {
    en: 'Your review is copied. On Google, choose your own star rating, paste the text (long-press → Paste) and tap Post.',
    mr: 'तुमचा रिव्ह्यू कॉपी झाला आहे. Google वर तुमचे स्टार्स स्वतः निवडा, मजकूर पेस्ट करा (दाबून ठेवा → Paste) आणि Post वर टॅप करा.',
    hi: 'आपका रिव्यू कॉपी हो गया है. Google पर अपनी स्टार रेटिंग खुद चुनें, टेक्स्ट पेस्ट करें (दबाकर रखें → Paste) और Post दबाएँ.',
  },
  noGoogleLink: {
    en: 'The Google review link is not set up yet. Please copy your review and post it on our Google profile.',
    mr: 'Google रिव्ह्यू लिंक अजून सेट केलेली नाही. कृपया रिव्ह्यू कॉपी करून आमच्या Google प्रोफाइलवर पोस्ट करा.',
    hi: 'Google रिव्यू लिंक अभी सेट नहीं है. कृपया रिव्यू कॉपी करके हमारे Google प्रोफ़ाइल पर पोस्ट करें.',
  },
  startOver: { en: 'Start over', mr: 'पुन्हा सुरू करा', hi: 'फिर से शुरू करें' },
  confirmRegenerate: {
    en: 'This will replace your edits with new wording. Continue?',
    mr: 'यामुळे तुमचे बदल नवीन शब्दरचनेने बदलले जातील. पुढे जायचं?',
    hi: 'इससे आपके बदलाव नए शब्दों से बदल जाएँगे. आगे बढ़ें?',
  },
  footer: {
    en: 'AI-assisted draft. You choose your rating, edit the text and post it yourself on Google. Nothing is published automatically.',
    mr: 'AI-सहाय्यित मसुदा. रेटिंग तुम्हीच निवडता, मजकूर बदलता आणि Google वर स्वतः पोस्ट करता. काहीही आपोआप प्रकाशित होत नाही.',
    hi: 'AI-सहायता से बना ड्राफ्ट. रेटिंग आप चुनते हैं, टेक्स्ट बदलते हैं और Google पर खुद पोस्ट करते हैं. कुछ भी अपने-आप पोस्ट नहीं होता.',
  },
  preview: { en: 'Admin preview – not counted in stats', mr: 'ॲडमिन प्रिव्ह्यू – आकडेवारीत मोजले जात नाही', hi: 'एडमिन प्रीव्यू – आँकड़ों में नहीं गिना जाता' },
  thanks: {
    en: 'Thank you for taking the time to share your feedback!',
    mr: 'तुमचा अभिप्राय दिल्याबद्दल मनापासून धन्यवाद!',
    hi: 'अपना फीडबैक देने के लिए दिल से धन्यवाद!',
  },
};

export function tr(obj, lang, vars = {}) {
  let s = (obj && (obj[lang] || obj.en)) || '';
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll('{' + k + '}', v);
  return s;
}
