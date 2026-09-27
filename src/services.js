// שירותי הדגמה. במערכת האמיתית: אימות כתובת בשירות מפות, קליטת הזמנה בשרת ומעבר לספק סליקה.
import { shop, demoFlags } from './data.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (text) => text.trim().replace(/[\s־-]+/g, ' ');

export async function verifyAddress({ city, street, number }) {
  await wait(650);
  if (!city.trim() || !street.trim() || !number.trim()) return { status: 'invalid' };
  const zone = shop.deliveryZones.find((item) => item.cities.some((name) => normalize(name) === normalize(city)));
  return zone ? { status: 'ok', zone } : { status: 'out' };
}

export function isOpen() {
  return !demoFlags().closed;
}

export async function submitOrder(order) {
  await wait(1400);
  if (demoFlags().payFail) return { ok: false, reason: 'payment' };
  return { ok: true, reference: `DEMO-${String(Date.now()).slice(-4)}`, order };
}
