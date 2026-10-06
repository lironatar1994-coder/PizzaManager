// Illustrative products, generated photos and prices. Imported explicitly into oven-demo.
const photo = key => `./assets/addons/${key}-v1.webp`;
const photoAlt = name => `${name} · תמונה שנוצרה בבינה מלאכותית להמחשה`;
const drinks = [
  ['cola', 'קולה', 'preferred'], ['cola-zero', 'קולה זירו', 'auto'], ['lemon-lime', 'לימון־ליים', 'auto'],
  ['water', 'מים', 'auto'], ['soda', 'סודה', 'auto'],
];
export const demoAddons = [
  ...drinks.map(([id, name, addonRecommendation]) => ({
    id: `demo-drink-${id}`, name, menuCategory: 'drinks', active: true, available: true, addonRecommendation,
    description: 'משקה לדוגמה. הנפח והמחיר ניתנים לעריכה במנהל.', image: photo(`${id}-${['water', 'soda'].includes(id) ? 'bottle-500' : 'can-330'}`), imageAlt: photoAlt(name), optionGroups: [], notePresets: [],
    variants: ['water', 'soda'].includes(id)
      ? [{ id: 'bottle-500', name: 'בקבוק 500 מ״ל', volumeMl: 500, price: 7, scale: 1, available: true, image: photo(`${id}-bottle-500`), imageAlt: photoAlt(`${name}, בקבוק 500 מ״ל`) }]
      : [{ id: 'can-330', name: 'פחית 330 מ״ל', volumeMl: 330, price: 8, scale: 1, available: true, image: photo(`${id}-can-330`), imageAlt: photoAlt(`${name}, פחית 330 מ״ל`) }, { id: 'bottle-1500', name: 'בקבוק 1.5 ליטר', volumeMl: 1500, price: 14, scale: 1, available: true, image: photo(`${id}-bottle-1500`), imageAlt: photoAlt(`${name}, בקבוק 1.5 ליטר`) }],
  })),
  ...[['garlic', 'רוטב שום'], ['bbq', 'רוטב ברביקיו'], ['sweet-chili', 'צ׳ילי מתוק'], ['hot', 'רוטב חריף']].map(([id, name]) => ({
    id: `demo-sauce-${id}`, name, menuCategory: 'sauces', active: true, available: true, addonRecommendation: id === 'garlic' ? 'preferred' : 'auto',
    description: 'גביע רוטב בצד לדוגמה. פרטי המוצר ניתנים לעריכה במנהל.', image: photo(`${id}-cup-50`), imageAlt: photoAlt(`${name}, גביע בצד`), optionGroups: [], notePresets: [],
    variants: [{ id: 'cup-50', name: 'גביע 50 מ״ל', volumeMl: 50, price: 3, scale: 1, available: true }],
  })),
];
