// Default configuration for the four original businesses (created automatically on
// first run). The admin can add more businesses from the dashboard.
// The admin can edit everything here from the dashboard (except the slug,
// which is printed inside the QR codes and therefore never changes).
//
// Each question:
//   id         – stable id (letters, numbers, dashes)
//   type       – "single" (pick one) or "multi" (pick one or more)
//   showFor    – "all"      → every customer
//                "liked"    → customers who chose Excellent, Good or Average
//                "improve"  → customers who chose Average or Not satisfied
//   optional   – true shows a "Skip" button
//   prompt     – the question the assistant asks  {en, mr, hi}
//   summary    – short fact label used when writing the review  {en, mr, hi}
//   options    – [{ id, label: {en, mr, hi} }]

const L = (en, mr, hi) => ({ en, mr, hi });
const opt = (id, en, mr, hi) => ({ id, label: L(en, mr, hi) });
// SEO keyword. `when` = list of "questionId:optionId" – the AI may use the keyword only if the
// customer picked one of these answers. Empty list = may be used for any customer.
const kw = (text, when = []) => ({ id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), text, enabled: true, when });

export const SLUGS = ['jatan', 'dhruta', 'haemoglobbinn', 'makoons-wakad'];

export const SEED_BUSINESSES = [
  {
    slug: 'jatan',
    name: 'Jatan By The Dhruta Construction',
    short_name: 'Jatan',
    category: 'Residential project – ready-possession 2 BHK flats',
    location: 'Sahakar Nagar, Pune',
    logo_url: '',
    primary_color: '#1F3A5F',
    accent_color: '#C9A227',
    google_review_url: '',
    gbp_manage_url:
      'https://business.google.com/n/1120873921993387860/profile?fid=9008443073859340212',
    seo_keywords: '2 BHK flats in Sahakar Nagar, ready possession flats in Pune',
    keywords: [
      kw('2 BHK flats in Sahakar Nagar'),
      kw('ready possession flats in Pune', ['connection:buyer', 'connection:resident', 'connection:site-visit']),
      kw('residential project in Sahakar Nagar Pune'),
    ],
    greeting: L(
      'Hello! Thank you for visiting Jatan. I am your feedback assistant – this takes less than a minute.',
      'नमस्कार! जतनला भेट दिल्याबद्दल धन्यवाद. मी तुमचा फीडबॅक असिस्टंट आहे – याला एका मिनिटापेक्षा कमी वेळ लागेल.',
      'नमस्ते! जतन आने के लिए धन्यवाद. मैं आपका फीडबैक असिस्टेंट हूँ – इसमें एक मिनट से भी कम समय लगेगा.'
    ),
    questions: [
      {
        id: 'connection',
        type: 'single',
        showFor: 'all',
        optional: true,
        prompt: L(
          'How are you connected with Jatan?',
          'तुमचा जतनशी संबंध कसा आहे?',
          'जतन से आपका जुड़ाव कैसा है?'
        ),
        summary: L('My connection', 'माझा संबंध', 'मेरा जुड़ाव'),
        options: [
          opt('site-visit', 'Visited the site / sample flat', 'साईट / सॅम्पल फ्लॅट पाहिला', 'साइट / सैंपल फ्लैट देखा'),
          opt('buyer', 'Booked or bought a flat', 'फ्लॅट बुक केला / घेतला', 'फ्लैट बुक किया / खरीदा'),
          opt('resident', 'Living here', 'इथे राहतो / राहते', 'यहाँ रहते हैं'),
          opt('enquiry', 'Enquired about the project', 'प्रोजेक्टबद्दल चौकशी केली', 'प्रोजेक्ट के बारे में पूछताछ की'),
        ],
      },
      {
        id: 'liked',
        type: 'multi',
        showFor: 'liked',
        optional: false,
        prompt: L(
          'What did you like? (choose one or more)',
          'तुम्हाला काय आवडलं? (एक किंवा जास्त निवडा)',
          'आपको क्या पसंद आया? (एक या अधिक चुनें)'
        ),
        summary: L('What I liked', 'मला आवडलेल्या गोष्टी', 'मुझे जो पसंद आया'),
        options: [
          opt('quality', 'Construction work quality', 'बांधकामाचा दर्जा', 'निर्माण कार्य की गुणवत्ता'),
          opt('professional', 'Professional team', 'व्यावसायिक टीम', 'प्रोफेशनल टीम'),
          opt('communication', 'Clear communication', 'स्पष्ट संवाद', 'साफ़ और स्पष्ट बातचीत'),
          opt('project', 'Overall project experience', 'एकूण प्रोजेक्टचा अनुभव', 'पूरे प्रोजेक्ट का अनुभव'),
          opt('service', 'Service and support', 'सेवा आणि सहकार्य', 'सर्विस और सपोर्ट'),
          opt('location', 'Location and connectivity', 'लोकेशन आणि कनेक्टिव्हिटी', 'लोकेशन और कनेक्टिविटी'),
        ],
      },
      {
        id: 'improve',
        type: 'multi',
        showFor: 'improve',
        optional: true,
        prompt: L(
          'What could have been better?',
          'काय अधिक चांगलं होऊ शकलं असतं?',
          'क्या बेहतर हो सकता था?'
        ),
        summary: L('What could be better', 'सुधारणा हवी अशा गोष्टी', 'जिसमें सुधार हो सकता है'),
        options: [
          opt('quality', 'Construction work quality', 'बांधकामाचा दर्जा', 'निर्माण कार्य की गुणवत्ता'),
          opt('communication', 'Communication', 'संवाद', 'बातचीत'),
          opt('response', 'Response time', 'प्रतिसादाचा वेळ', 'जवाब देने में लगने वाला समय'),
          opt('service', 'Service and support', 'सेवा आणि सहकार्य', 'सर्विस और सपोर्ट'),
          opt('documentation', 'Documentation / paperwork', 'कागदपत्रांची प्रक्रिया', 'कागज़ी कार्रवाई'),
        ],
      },
    ],
  },
  {
    slug: 'dhruta',
    name: 'THE DHRUTA CONSTRUCTIONS',
    short_name: 'THE DHRUTA CONSTRUCTIONS',
    category: 'Construction and society redevelopment company',
    location: 'Pune',
    logo_url: '',
    primary_color: '#7A2E1D',
    accent_color: '#E0A458',
    google_review_url: '',
    gbp_manage_url:
      'https://business.google.com/n/16236027237606631702/profile?fid=17593868311872399028',
    seo_keywords: 'construction company in Pune, society redevelopment in Pune',
    keywords: [
      kw('construction company in Pune'),
      kw('society redevelopment in Pune', ['connection:redevelopment', 'liked:redevelopment']),
      kw('redevelopment builder in Pune', ['connection:redevelopment', 'liked:redevelopment']),
    ],
    greeting: L(
      'Hello! Thank you for choosing THE DHRUTA CONSTRUCTIONS. I will help you share your feedback in under a minute.',
      'नमस्कार! THE DHRUTA CONSTRUCTIONS निवडल्याबद्दल धन्यवाद. एका मिनिटात तुमचा अभिप्राय लिहायला मी मदत करेन.',
      'नमस्ते! THE DHRUTA CONSTRUCTIONS को चुनने के लिए धन्यवाद. एक मिनट में आपका फीडबैक लिखने में मैं मदद करूँगा.'
    ),
    questions: [
      {
        id: 'connection',
        type: 'single',
        showFor: 'all',
        optional: true,
        prompt: L(
          'How did you work with us?',
          'तुम्ही आमच्यासोबत कसं काम केलं?',
          'आपने हमारे साथ कैसे काम किया?'
        ),
        summary: L('How I worked with them', 'माझा अनुभव कशासंदर्भात', 'मेरा अनुभव किस बारे में'),
        options: [
          opt('redevelopment', 'Society redevelopment (member / committee)', 'सोसायटी रिडेव्हलपमेंट (सदस्य / कमिटी)', 'सोसाइटी रीडेवलपमेंट (सदस्य / कमेटी)'),
          opt('home-buyer', 'Bought a home in their project', 'त्यांच्या प्रोजेक्टमध्ये घर घेतलं', 'उनके प्रोजेक्ट में घर खरीदा'),
          opt('construction-client', 'Construction client', 'बांधकाम क्लायंट', 'कंस्ट्रक्शन क्लाइंट'),
          opt('meeting', 'Enquiry or meeting', 'चौकशी किंवा मीटिंग', 'पूछताछ या मीटिंग'),
        ],
      },
      {
        id: 'liked',
        type: 'multi',
        showFor: 'liked',
        optional: false,
        prompt: L(
          'What did you like? (choose one or more)',
          'तुम्हाला काय आवडलं? (एक किंवा जास्त निवडा)',
          'आपको क्या पसंद आया? (एक या अधिक चुनें)'
        ),
        summary: L('What I liked', 'मला आवडलेल्या गोष्टी', 'मुझे जो पसंद आया'),
        options: [
          opt('quality', 'Building construction quality', 'इमारतीच्या बांधकामाचा दर्जा', 'बिल्डिंग निर्माण की गुणवत्ता'),
          opt('redevelopment', 'Society redevelopment experience', 'सोसायटी रिडेव्हलपमेंटचा अनुभव', 'सोसाइटी रीडेवलपमेंट का अनुभव'),
          opt('project-management', 'Project management', 'प्रोजेक्ट मॅनेजमेंट', 'प्रोजेक्ट मैनेजमेंट'),
          opt('communication', 'Communication and transparency', 'संवाद आणि पारदर्शकता', 'बातचीत और पारदर्शिता'),
          opt('team', 'Professional team', 'व्यावसायिक टीम', 'प्रोफेशनल टीम'),
          opt('overall', 'Overall experience', 'एकूण अनुभव', 'कुल मिलाकर अनुभव'),
        ],
      },
      {
        id: 'improve',
        type: 'multi',
        showFor: 'improve',
        optional: true,
        prompt: L(
          'What could have been better?',
          'काय अधिक चांगलं होऊ शकलं असतं?',
          'क्या बेहतर हो सकता था?'
        ),
        summary: L('What could be better', 'सुधारणा हवी अशा गोष्टी', 'जिसमें सुधार हो सकता है'),
        options: [
          opt('timeline', 'Project timelines', 'प्रोजेक्टची वेळमर्यादा', 'प्रोजेक्ट की समय-सीमा'),
          opt('communication', 'Communication', 'संवाद', 'बातचीत'),
          opt('quality', 'Construction quality', 'बांधकामाचा दर्जा', 'निर्माण की गुणवत्ता'),
          opt('project-management', 'Project management', 'प्रोजेक्ट मॅनेजमेंट', 'प्रोजेक्ट मैनेजमेंट'),
          opt('documentation', 'Documentation / paperwork', 'कागदपत्रांची प्रक्रिया', 'कागज़ी कार्रवाई'),
        ],
      },
    ],
  },
  {
    slug: 'haemoglobbinn',
    name: 'Haemoglobbinn | Branding and Integrated Marketing Agency in Pune',
    short_name: 'Haemoglobbinn',
    category: 'Branding and integrated marketing agency',
    location: 'Kothrud, Pune',
    logo_url: '',
    primary_color: '#2B2B2B',
    accent_color: '#B27DBD',
    google_review_url: '',
    gbp_manage_url:
      'https://business.google.com/n/16384115738089954517/profile?fid=5598404489740045879',
    seo_keywords: 'branding and integrated marketing services in Pune, digital marketing company in Pune',
    keywords: [
      kw('branding and integrated marketing services in Pune'),
      kw('branding company in Pune', ['services:branding']),
      kw('digital marketing company in Pune', ['services:digital-marketing', 'services:social']),
      kw('SEO services in Pune', ['services:seo']),
      kw('website development company in Pune', ['services:website']),
    ],
    greeting: L(
      'Hi! Thank you for working with Haemoglobbinn. I will help you put your feedback into words – it takes less than a minute.',
      'नमस्कार! Haemoglobbinn सोबत काम केल्याबद्दल धन्यवाद. तुमचा अभिप्राय शब्दांत मांडायला मी मदत करेन – एका मिनिटापेक्षा कमी वेळ लागेल.',
      'नमस्ते! Haemoglobbinn के साथ काम करने के लिए धन्यवाद. आपका फीडबैक शब्दों में लिखने में मैं मदद करूँगा – एक मिनट से भी कम लगेगा.'
    ),
    questions: [
      {
        id: 'services',
        type: 'multi',
        showFor: 'all',
        optional: true,
        prompt: L(
          'Which services did you work with us on?',
          'तुम्ही आमच्यासोबत कोणत्या सेवांसाठी काम केलं?',
          'आपने हमारे साथ किन सेवाओं पर काम किया?'
        ),
        summary: L('Services I used', 'मी घेतलेल्या सेवा', 'मैंने जो सेवाएँ लीं'),
        options: [
          opt('branding', 'Branding', 'ब्रँडिंग', 'ब्रांडिंग'),
          opt('digital-marketing', 'Digital marketing', 'डिजिटल मार्केटिंग', 'डिजिटल मार्केटिंग'),
          opt('seo', 'SEO services', 'SEO सेवा', 'SEO सेवाएँ'),
          opt('social', 'Social media and content', 'सोशल मीडिया आणि कंटेंट', 'सोशल मीडिया और कंटेंट'),
          opt('website', 'Website development', 'वेबसाईट डेव्हलपमेंट', 'वेबसाइट डेवलपमेंट'),
          opt('production', 'Video / reel production', 'व्हिडिओ / रील प्रोडक्शन', 'वीडियो / रील प्रोडक्शन'),
        ],
      },
      {
        id: 'liked',
        type: 'multi',
        showFor: 'liked',
        optional: false,
        prompt: L(
          'What did you like about our work?',
          'आमच्या कामातलं तुम्हाला काय आवडलं?',
          'हमारे काम में आपको क्या पसंद आया?'
        ),
        summary: L('What I liked', 'मला आवडलेल्या गोष्टी', 'मुझे जो पसंद आया'),
        options: [
          opt('creative', 'Creative work', 'क्रिएटिव्ह काम', 'क्रिएटिव काम'),
          opt('strategy', 'Strategy and ideas', 'स्ट्रॅटेजी आणि कल्पना', 'स्ट्रेटेजी और आइडियाज़'),
          opt('support', 'Professional support', 'व्यावसायिक सहकार्य', 'प्रोफेशनल सपोर्ट'),
          opt('timely', 'Timely delivery', 'वेळेवर काम', 'समय पर डिलीवरी'),
          opt('communication', 'Easy communication', 'सोपा संवाद', 'आसान बातचीत'),
          opt('overall', 'Overall experience', 'एकूण अनुभव', 'कुल मिलाकर अनुभव'),
        ],
      },
      {
        id: 'improve',
        type: 'multi',
        showFor: 'improve',
        optional: true,
        prompt: L(
          'What could we do better?',
          'आम्ही काय अधिक चांगलं करू शकलो असतो?',
          'हम क्या बेहतर कर सकते थे?'
        ),
        summary: L('What could be better', 'सुधारणा हवी अशा गोष्टी', 'जिसमें सुधार हो सकता है'),
        options: [
          opt('timelines', 'Delivery timelines', 'कामाची वेळ', 'डिलीवरी का समय'),
          opt('communication', 'Communication', 'संवाद', 'बातचीत'),
          opt('creative', 'Creative quality', 'क्रिएटिव्हचा दर्जा', 'क्रिएटिव की गुणवत्ता'),
          opt('results', 'Results', 'परिणाम', 'नतीजे'),
          opt('reporting', 'Reporting and updates', 'रिपोर्टिंग आणि अपडेट्स', 'रिपोर्टिंग और अपडेट्स'),
        ],
      },
    ],
  },
  {
    slug: 'makoons-wakad',
    name: 'Makoons Wakad | Preschool and Daycare in Wakad',
    short_name: 'Makoons Wakad',
    category: 'Preschool and daycare',
    location: 'Wakad, Pune',
    logo_url: '',
    primary_color: '#E8590C',
    accent_color: '#1C7ED6',
    google_review_url: '',
    gbp_manage_url:
      'https://business.google.com/n/8787164511831233602/profile?fid=10536542622773175714',
    seo_keywords: 'preschool in Wakad, daycare in Wakad',
    keywords: [
      kw('preschool in Wakad', ['program:preschool', 'program:both', 'program:visit']),
      kw('daycare in Wakad', ['program:daycare', 'program:both']),
      kw('play school in Wakad', ['program:preschool', 'program:both']),
    ],
    greeting: L(
      'Hello! Thank you for being a part of Makoons Wakad. I will help you share your feedback – it takes less than a minute.',
      'नमस्कार! Makoons Wakad परिवाराचा भाग असल्याबद्दल धन्यवाद. तुमचा अभिप्राय लिहायला मी मदत करेन – एका मिनिटापेक्षा कमी वेळ लागेल.',
      'नमस्ते! Makoons Wakad परिवार का हिस्सा बनने के लिए धन्यवाद. आपका फीडबैक लिखने में मैं मदद करूँगा – एक मिनट से भी कम लगेगा.'
    ),
    questions: [
      {
        id: 'program',
        type: 'single',
        showFor: 'all',
        optional: true,
        prompt: L(
          'Which program is your child in?',
          'तुमचं मूल कोणत्या प्रोग्राममध्ये आहे?',
          'आपका बच्चा किस प्रोग्राम में है?'
        ),
        summary: L('Program', 'प्रोग्राम', 'प्रोग्राम'),
        options: [
          opt('preschool', 'Preschool (Playgroup / Nursery / KG)', 'प्रीस्कूल (प्लेग्रुप / नर्सरी / KG)', 'प्रीस्कूल (प्लेग्रुप / नर्सरी / KG)'),
          opt('daycare', 'Daycare', 'डेकेअर', 'डेकेयर'),
          opt('both', 'Preschool and daycare', 'प्रीस्कूल आणि डेकेअर', 'प्रीस्कूल और डेकेयर'),
          opt('visit', 'Visited for admission enquiry', 'ॲडमिशन चौकशीसाठी भेट दिली', 'एडमिशन पूछताछ के लिए आए'),
        ],
      },
      {
        id: 'liked',
        type: 'multi',
        showFor: 'liked',
        optional: false,
        prompt: L(
          'What did you like? (choose one or more)',
          'तुम्हाला काय आवडलं? (एक किंवा जास्त निवडा)',
          'आपको क्या पसंद आया? (एक या अधिक चुनें)'
        ),
        summary: L('What I liked', 'मला आवडलेल्या गोष्टी', 'मुझे जो पसंद आया'),
        options: [
          opt('teaching', 'Teaching quality', 'शिकवण्याचा दर्जा', 'पढ़ाई की गुणवत्ता'),
          opt('teachers', 'Caring teachers', 'प्रेमळ शिक्षक', 'स्नेही शिक्षक'),
          opt('environment', 'Safe and clean school environment', 'सुरक्षित आणि स्वच्छ वातावरण', 'सुरक्षित और साफ़ माहौल'),
          opt('activities', 'Activities and learning', 'ॲक्टिव्हिटीज आणि शिक्षण', 'एक्टिविटीज़ और सीखना'),
          opt('parent-communication', 'Parent communication and updates', 'पालकांशी संवाद आणि अपडेट्स', 'पेरेंट्स से बातचीत और अपडेट्स'),
          opt('overall', 'Overall experience', 'एकूण अनुभव', 'कुल मिलाकर अनुभव'),
        ],
      },
      {
        id: 'improve',
        type: 'multi',
        showFor: 'improve',
        optional: true,
        prompt: L(
          'What could we do better?',
          'आम्ही काय अधिक चांगलं करू शकतो?',
          'हम क्या बेहतर कर सकते हैं?'
        ),
        summary: L('What could be better', 'सुधारणा हवी अशा गोष्टी', 'जिसमें सुधार हो सकता है'),
        options: [
          opt('communication', 'Parent communication', 'पालकांशी संवाद', 'पेरेंट्स से बातचीत'),
          opt('activities', 'Activities', 'ॲक्टिव्हिटीज', 'एक्टिविटीज़'),
          opt('facilities', 'Facilities', 'सुविधा', 'सुविधाएँ'),
          opt('timings', 'Timings', 'वेळा', 'समय'),
          opt('fees', 'Fees and admin process', 'फी आणि प्रशासकीय प्रक्रिया', 'फीस और एडमिन प्रक्रिया'),
        ],
      },
    ],
  },
];

export function getSeed(slug) {
  const b = SEED_BUSINESSES.find((x) => x.slug === slug);
  return b ? JSON.parse(JSON.stringify(b)) : null;
}

// The 7 standard experience highlights used by every newly added business (owners can edit them).
const HIGHLIGHTS = () => [
  opt('quality', 'Product quality', 'उत्पादनाचा दर्जा', 'प्रोडक्ट की क्वालिटी'),
  opt('staff', 'Staff behaviour', 'स्टाफचं वागणं', 'स्टाफ का व्यवहार'),
  opt('service', 'Customer service', 'ग्राहक सेवा', 'कस्टमर सर्विस'),
  opt('ambience', 'Ambience', 'वातावरण', 'माहौल'),
  opt('cleanliness', 'Cleanliness', 'स्वच्छता', 'साफ़-सफ़ाई'),
  opt('delivery', 'Delivery', 'डिलिव्हरी', 'डिलीवरी'),
  opt('pricing', 'Pricing', 'किंमत', 'कीमत'),
];

// Starting configuration for a business the admin adds later. Everything can be
// edited from the dashboard afterwards.
export function newBusinessTemplate({ slug, name, short_name, category = '', location = '', google_review_url = '' }) {
  const n = short_name || name;
  return {
    slug,
    name,
    short_name: n,
    category,
    location,
    logo_url: '',
    primary_color: '#1F7A3A',
    accent_color: '#C9A227',
    google_review_url,
    gbp_manage_url: '',
    seo_keywords: '',
    keywords: [],
    greeting: L(
      `Hi! Thank you for visiting ${n}. I will help you put your feedback into words – it takes less than a minute.`,
      `नमस्कार! ${n} ला भेट दिल्याबद्दल धन्यवाद. तुमचा अभिप्राय शब्दांत मांडायला मी मदत करेन – एका मिनिटापेक्षा कमी वेळ लागेल.`,
      `नमस्ते! ${n} पर आने के लिए धन्यवाद. आपका फीडबैक शब्दों में लिखने में मैं मदद करूँगा – एक मिनट से भी कम लगेगा.`
    ),
    questions: [
      {
        id: 'liked',
        type: 'multi',
        showFor: 'liked',
        optional: false,
        prompt: L('What did you like most?', 'तुम्हाला सर्वात जास्त काय आवडलं?', 'आपको सबसे ज़्यादा क्या पसंद आया?'),
        summary: L('What I liked', 'मला आवडलेल्या गोष्टी', 'मुझे जो पसंद आया'),
        options: HIGHLIGHTS(),
      },
      {
        id: 'improve',
        type: 'multi',
        showFor: 'improve',
        optional: true,
        prompt: L('What could we do better?', 'आम्ही काय अधिक चांगलं करू शकलो असतो?', 'हम क्या बेहतर कर सकते थे?'),
        summary: L('What could be better', 'सुधारणा हवी अशा गोष्टी', 'जिसमें सुधार हो सकता है'),
        options: HIGHLIGHTS(),
      },
    ],
  };
}

// "Reset to default" values for any business (built-in seed, or the generic template).
export function getDefaults(business) {
  return getSeed(business.slug) || newBusinessTemplate(business);
}

// Keep the plain-text keyword list in sync with the structured keyword list.
for (const b of SEED_BUSINESSES) b.seo_keywords = b.keywords.map((k) => k.text).join(', ');
