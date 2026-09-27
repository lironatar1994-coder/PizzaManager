// נתוני הדגמה בלבד. בהמשך יוחלף הקובץ בנתונים מממשק הניהול.
export const shop = {
  name: 'פיצה לדוגמה',
  demoOnly: true,
  heroTitle: 'פיצה חמה,\nבדיוק כמו שאוהבים.',
  heroDescription: 'מדגימים בחירת גודל ותוספות, משלוח או איסוף עצמי. לא מתקבלות כאן הזמנות אמיתיות.',
  multiHeroTitle: 'מה מתחשק לכם\nהיום?',
  multiHeroDescription: 'בוחרים מוצר, מתאימים אותו לטעם שלכם וממשיכים להזמנה.',
  // טלפון וכתובת לדוגמה. הקידומת 03-000 אינה מוקצית, כך שהחיוג לא יגיע לאדם אמיתי.
  phone: '03-0000000',
  location: { address: 'רחוב הדוגמה 1, תל אביב' },
  // תוספת על חצי פיצה עולה חצי ממחיר התוספת, מעוגל כלפי מעלה.
  halfToppingFactor: 0.5,
  pickup: { readyHint: 'בהזמנה אמיתית תישלח הודעה כשהאיסוף מוכן' },
  // אזורי משלוח לדוגמה. במערכת האמיתית האזור נגזר מכתובת שאומתה בשירות מפות.
  deliveryZones: [
    { id: 'zone-a', name: 'אזור משלוח א׳', cities: ['תל אביב', 'תל אביב-יפו', 'תל אביב יפו', 'יפו'], fee: 12, minOrder: 60 },
    { id: 'zone-b', name: 'אזור משלוח ב׳', cities: ['רמת גן', 'גבעתיים'], fee: 18, minOrder: 80 },
  ],
  hours: { opensAt: '12:00', closesAt: '23:00' },
};

export const products = [
  {
    id: 'house-pizza',
    active: true,
    name: 'הפיצה שלנו',
    description: 'רוטב עגבניות, מוצרלה ובצק שנאפה במקום. תיאור לדוגמה.',
    visual: 'pizza',
    image: null,
    imageAlt: 'הדמיית הפיצה לפי הבחירות',
    variants: [
      { id: 'small', name: 'קטנה', detail: 'אישית', price: 38, scale: 0.74 },
      { id: 'medium', name: 'בינונית', detail: 'לשניים', price: 52, scale: 0.87 },
      { id: 'large', name: 'גדולה', detail: 'לחלוקה', price: 68, scale: 1 },
    ],
    optionGroups: [
      {
        id: 'dough',
        name: 'איך אוהבים את הבצק?',
        type: 'single',
        visualRole: 'crust',
        choices: [
          { id: 'classic', name: 'קלאסי', detail: 'שוליים אווריריים', price: 0, crust: 'classic' },
          { id: 'thin', name: 'דק', detail: 'פריך וקליל', price: 0, crust: 'thin' },
        ],
      },
      {
        id: 'toppings',
        name: 'תוספות',
        type: 'multi',
        placement: true,
        choices: [
          { id: 'olives', name: 'זיתים', price: 6, shape: 'olive' },
          { id: 'mushrooms', name: 'פטריות', price: 6, shape: 'mushroom' },
          { id: 'corn', name: 'תירס', price: 5, shape: 'corn' },
          { id: 'onion', name: 'בצל סגול', price: 5, shape: 'onion' },
          { id: 'jalapeno', name: 'חלפיניו', price: 6, shape: 'jalapeno' },
          { id: 'feta', name: 'בולגרית', price: 9, shape: 'feta' },
        ],
      },
    ],
  },
  {
    id: 'garlic-bread',
    active: false,
    name: 'לחם שום',
    description: 'לחם שום עם חמאה ועשבי תיבול. תיאור לדוגמה.',
    image: './assets/garlic-bread-demo.webp',
    imageAlt: 'צילום לדוגמה של לחם שום',
    price: 24,
    optionGroups: [
      {
        id: 'extras',
        name: 'תוספות',
        type: 'multi',
        choices: [{ id: 'cheese', name: 'תוספת גבינה', price: 5 }],
      },
    ],
  },
];

// מצבי הדגמה בכתובת: ?demo=multiple (תפריט), ?demo=closed (מחוץ לשעות), ?demo=payfail (תשלום נכשל)
export function demoFlags() {
  const flags = (new URLSearchParams(window.location.search).get('demo') || '').split(',');
  return { multiple: flags.includes('multiple'), closed: flags.includes('closed'), payFail: flags.includes('payfail') };
}

export function activeProducts() {
  const { multiple } = demoFlags();
  return products.filter((product) => product.active || multiple);
}

export function findProduct(id) {
  return products.find((product) => product.id === id);
}
