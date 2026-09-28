// חיפוש כתובת אמיתי; קליטת ההזמנה והתשלום עדיין מדומים. שרת אמיתי יחשב ויאמת הכול מחדש.
import { demoFlags } from './data.js?v=20260928-flow2';
import { verifySelectedAddress } from './address.js?v=20260928-flow2';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const verifyAddress = verifySelectedAddress;

export function isOpen() {
  return !demoFlags().closed;
}

export async function submitOrder(order) {
  await wait(1400);
  if (demoFlags().payFail) return { ok: false, reason: 'payment' };
  return { ok: true, reference: `DEMO-${String(Date.now()).slice(-4)}`, order };
}
