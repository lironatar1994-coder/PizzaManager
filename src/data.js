// נתוני הדגמה בלבד. בהמשך יוחלף הקובץ בנתונים מממשק הניהול.
export const shop = {
  name: 'פיצה לדוגמה',
  demoOnly: true,
  // סמל מקורי להדגמה. לוגו ותמונות אמיתיים יוחלפו כאן כשיימסרו.
  logo: null,
  brandMark: './assets/brand/oven-mark.svg#oven-mark',
  heroImages: {
    mobile: './assets/pizza-hero-mobile.jpg',
    desktop: './assets/pizza-hero-desktop.jpg',
    alt: 'פיצה להמחשה על רקע כהה — אינה צילום של מוצר העסק',
  },
  heroTitle: 'פיצה חמה.\nבדיוק לטעמכם.',
  heroDescription: 'בוחרים גודל, מוסיפים מה שאוהבים — ורואים את הפיצה שלכם נבנית.',
  multiHeroTitle: 'מה מתחשק לכם\nהיום?',
  multiHeroDescription: 'בוחרים מוצר, מתאימים אותו לטעם שלכם וממשיכים להזמנה.',
  // טלפון וכתובת לדוגמה. הקידומת 03-000 אינה מוקצית, כך שהחיוג לא יגיע לאדם אמיתי.
  phone: '03-0000000',
  location: { address: 'רחוב הדוגמה 1, תל אביב' },
  // תוספת על חצי פיצה עולה חצי ממחיר התוספת, מעוגל כלפי מעלה.
  halfToppingFactor: 0.5,
  // הצעה משלימה אחת בסל, רק כשהמוצר זמין ואינו כבר כלול בהזמנה.
  complementaryOffers: [{ whenProductIds: ['house-pizza'], productId: 'garlic-bread' }],
  pickup: {
    readyHint: 'בהזמנה אמיתית תישלח הודעה כשהאיסוף מוכן',
    // חלונות וקיבולת לדוגמה. booked יתעדכן בשרת ההזמנות כשיחובר; הדפדפן אינו מקצה מקום.
    schedule: { enabled: true, slotMinutes: 15, preparationMinutes: 30, daysAhead: 7, ordersPerSlot: 6, slots: {} },
    // אפשר להוסיף weekly או exceptions כדי לצמצם איסוף בתוך שעות העסק.
  },
  // השלמת כתובות אמיתיות מ־OpenStreetMap. שירות ציבורי להדגמה; ניתן להחליף בשרת פרטי.
  addressLookup: { endpoint: 'https://photon.komoot.io/api/', countryCode: 'IL', center: [34.80, 32.08] },
  // תחומי שירות משוערים לדוגמה בלבד, בקואורדינטות [קו אורך, קו רוחב].
  // העיר מגיעה משירות המפות; נקודת הכתובת חייבת להיות גם בתוך הפוליגון.
  deliveryZones: [
    { id: 'zone-a', name: 'אזור משלוח א׳', cities: ['תל אביב', 'תל אביב-יפו', 'תל אביב יפו', 'יפו'], polygon: [[34.742, 32.035], [34.810, 32.035], [34.810, 32.130], [34.742, 32.130]], fee: 12, minOrder: 60 },
    { id: 'zone-b', name: 'אזור משלוח ב׳', cities: ['רמת גן', 'גבעתיים'], polygon: [[34.790, 32.048], [34.862, 32.048], [34.862, 32.120], [34.790, 32.120]], fee: 18, minOrder: 80 },
  ],
  // שעות דוגמה בלבד. מספרי הימים: ראשון 0 עד שבת 6; ניתן להגדיר כמה מקטעים ביום.
  hours: {
    timeZone: 'Asia/Jerusalem',
    weekly: {
      0: [{ open: '12:00', close: '23:00' }],
      1: [{ open: '12:00', close: '23:00' }],
      2: [{ open: '12:00', close: '23:00' }],
      3: [{ open: '12:00', close: '23:00' }],
      4: [{ open: '12:00', close: '23:00' }],
      5: [{ open: '12:00', close: '16:00' }],
      6: [{ open: '18:00', close: '23:00' }],
    },
    exceptions: {
      '2026-10-05': { closed: true, note: 'סגירה לדוגמה' },
      '2026-10-06': { intervals: [{ open: '16:00', close: '23:00' }], note: 'פתיחה מאוחרת לדוגמה' },
    },
  },
};

export const products = [
  {
    id: 'house-pizza',
    active: true,
    name: 'הפיצה שלנו',
    description: 'רוטב עגבניות, מוצרלה ובצק שנאפה במקום. תיאור לדוגמה.',
    menuDescription: 'גודל ותוספות לבחירה',
    visual: 'pizza',
    image: null,
    imageAlt: 'הדמיית הפיצה לפי הבחירות',
    // להמחשה בלבד. מידע אמיתי יוצג רק לאחר אישור העסק: reviewed: true.
    foodInfo: { reviewed: false, ingredients: ['בצק חיטה', 'רוטב עגבניות', 'מוצרלה'], allergens: ['חיטה (גלוטן)', 'חלב'], crossContact: 'מידע על סביבת ההכנה טרם נמסר מהעסק.' },
    // מידות, חיתוך וקיצורי הערות להמחשה. ייערכו יחד עם המוצר בממשק הניהול.
    notePresets: ['לחתוך לריבועים', 'בלי לחתוך', 'לחלק ל־8 משולשים'],
    variants: [
      { id: 'small', name: 'קטנה', detail: 'אישית', price: 38, scale: 0.67, diameterCm: 24, slices: 6 },
      { id: 'medium', name: 'בינונית', detail: 'לשניים', price: 52, scale: 0.83, diameterCm: 30, slices: 8 },
      { id: 'large', name: 'גדולה', detail: 'לחלוקה', price: 68, scale: 1, diameterCm: 36, slices: 8 },
    ],
    optionGroups: [
      {
        id: 'dough',
        name: 'איך אוהבים את הבצק?',
        type: 'single',
        visualRole: 'crust',
        choices: [
          { id: 'classic', name: 'קלאסי', detail: 'שוליים אווריריים', price: 0, crust: 'classic', foodInfo: { reviewed: false, ingredients: ['בצק חיטה'], allergens: ['חיטה (גלוטן)'] } },
          { id: 'thin', name: 'דק', detail: 'פריך וקליל', price: 0, crust: 'thin', foodInfo: { reviewed: false, ingredients: ['בצק חיטה דק'], allergens: ['חיטה (גלוטן)'] } },
        ],
      },
      {
        id: 'toppings',
        name: 'תוספות',
        type: 'multi',
        placement: true,
        choices: [
          { id: 'olives', name: 'זיתים', price: 6, shape: 'olive', foodInfo: { reviewed: false, ingredients: ['זיתים'], allergens: [] } },
          { id: 'mushrooms', name: 'פטריות', price: 6, shape: 'mushroom', foodInfo: { reviewed: false, ingredients: ['פטריות'], allergens: [] } },
          { id: 'corn', name: 'תירס', price: 5, shape: 'corn', foodInfo: { reviewed: false, ingredients: ['תירס'], allergens: [] } },
          { id: 'onion', name: 'בצל סגול', price: 5, shape: 'onion', foodInfo: { reviewed: false, ingredients: ['בצל סגול'], allergens: [] } },
          // available: false מסמן חוסר זמני; alternatives הם מזהים מאותה קבוצת תוספות.
          // דוגמת חוסר מוצגת רק עם ?demo=soldout; אינה טוענת דבר על מלאי עסק אמיתי.
          { id: 'jalapeno', name: 'חלפיניו', price: 6, shape: 'jalapeno', available: true, demoSoldOut: true, alternatives: ['onion'], foodInfo: { reviewed: false, ingredients: ['פלפל חלפיניו'], allergens: [] } },
          { id: 'feta', name: 'בולגרית', price: 9, shape: 'feta', foodInfo: { reviewed: false, ingredients: ['גבינה בולגרית'], allergens: ['חלב'] } },
        ],
      },
    ],
  },
  {
    id: 'garlic-bread',
    active: true,
    name: 'לחם שום',
    description: 'לחם שום עם חמאה ועשבי תיבול. תיאור לדוגמה.',
    menuDescription: 'חמאה ועשבי תיבול',
    image: './assets/garlic-bread-demo.webp',
    imageAlt: 'צילום לדוגמה של לחם שום',
    foodInfo: { reviewed: false, ingredients: ['לחם חיטה', 'חמאה', 'שום', 'עשבי תיבול'], allergens: ['חיטה (גלוטן)', 'חלב'], crossContact: 'מידע על סביבת ההכנה טרם נמסר מהעסק.' },
    price: 24,
    notePresets: ['לחלק לשניים', 'בלי לחתוך'],
    optionGroups: [
      {
        id: 'extras',
        name: 'תוספות',
        type: 'multi',
        choices: [{ id: 'cheese', name: 'תוספת גבינה', price: 5, foodInfo: { reviewed: false, ingredients: ['גבינה'], allergens: ['חלב'] } }],
      },
    ],
  },
  {
    id: 'pizza-and-garlic', active: true, name: 'פיצה ולחם שום',
    description: 'פיצה בינונית בהרכבה אישית ולחם שום. קומבו ומחיר לדוגמה.',
    menuDescription: 'פיצה בינונית ולחם שום',
    price: 70,
    bundle: [
      { id: 'pizza', name: 'הפיצה', productId: 'house-pizza', variantId: 'medium', variantIds: ['medium', 'large'] },
      { id: 'side', name: 'לחם השום', productId: 'garlic-bread' },
    ],
  },
  {
    id: 'family-meal', active: true, name: 'ארוחה משפחתית',
    description: 'שתי פיצות גדולות, כל אחת בהרכב משלה, ולחם שום. ארוחה ומחיר לדוגמה.',
    menuDescription: '2 פיצות גדולות ולחם שום',
    price: 145,
    bundle: [
      { id: 'pizza-one', name: 'הפיצה הראשונה', productId: 'house-pizza', variantId: 'large', variantIds: ['large'] },
      { id: 'pizza-two', name: 'הפיצה השנייה', productId: 'house-pizza', variantId: 'large', variantIds: ['large'] },
      { id: 'side', name: 'לחם השום', productId: 'garlic-bread' },
    ],
  },
];

// מצבי הדגמה: multiple (תפריט), closed (סגור), payfail (כישלון תשלום), soldout (תוספת שאזלה)
export function demoFlags() {
  const flags = (new URLSearchParams(window.location.search).get('demo') || '').split(',');
  return { multiple: flags.includes('multiple'), closed: flags.includes('closed'), payFail: flags.includes('payfail'), soldOut: flags.includes('soldout') };
}

export const isAvailable = (item) => Boolean(item) && item.available !== false && !(item.demoSoldOut && demoFlags().soldOut);

export function activeProducts() {
  const { multiple } = demoFlags();
  return products.filter((product) => isAvailable(product) && (product.active || multiple)
    && (!product.bundle || product.bundle.every((part) => {
      const child = products.find((item) => item.id === part.productId);
      return child && !child.bundle && isAvailable(child) && (child.active || multiple);
    })));
}

export function findProduct(id) {
  return products.find((product) => product.id === id);
}
