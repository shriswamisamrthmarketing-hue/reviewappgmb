// Common "experience topics" a customer can tick on the review page (shown for every business by
// default; an owner can hide them in Settings → "Experience topics"). Shared by the browser and the server, so the server only
// accepts topics it knows. A topic only says WHAT the customer wants to mention; how it is phrased
// follows the star rating the customer chose (never more positive or negative).
const L = (en, hi, mr) => ({ en, hi, mr });

export const TOPICS_QUESTION_ID = '_topics'; // "_" cannot appear in admin question ids, so no clash

export const TOPICS_QUESTION = {
  id: TOPICS_QUESTION_ID,
  type: 'multi',
  showFor: 'all',
  optional: true,
  kind: 'topic',
  prompt: L('What would you like to mention?', 'आप किस बारे में लिखना चाहेंगे?', 'तुम्हाला कशाबद्दल लिहायचं आहे?'),
  summary: L('Topics I want to mention', 'जिन बातों का ज़िक्र करना है', 'ज्या गोष्टींचा उल्लेख करायचा आहे'),
  options: [
    { id: 'customer-service', label: L('Customer service', 'ग्राहक सेवा', 'ग्राहक सेवा') },
    { id: 'staff-behaviour', label: L('Staff behaviour', 'स्टाफ का व्यवहार', 'कर्मचाऱ्यांचं वागणं') },
    { id: 'product-quality', label: L('Product quality', 'प्रोडक्ट की क्वालिटी', 'उत्पादनाचा दर्जा') },
    { id: 'service-experience', label: L('Service experience', 'सर्विस का अनुभव', 'सेवेचा अनुभव') },
    { id: 'professionalism', label: L('Professionalism', 'प्रोफेशनलिज़्म', 'व्यावसायिकता') },
    { id: 'value-for-money', label: L('Value for money', 'पैसे की कीमत', 'पैशाचं मूल्य') },
    { id: 'overall-experience', label: L('Overall experience', 'कुल मिलाकर अनुभव', 'एकूण अनुभव') },
  ],
};

// The questions shown on the review page: the business's own questions, plus the topics (first).
// Topics are ON by default for every business (existing and new); only settings.topics === false
// (owner chose "Hidden") turns them off. Same function on the page and on the server.
export function funnelQuestions(business) {
  const own = Array.isArray(business?.questions) ? business.questions : [];
  return business?.settings?.topics !== false ? [TOPICS_QUESTION, ...own] : own;
}
