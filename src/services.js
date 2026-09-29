// חיפוש כתובת אמיתי; קליטת ההזמנה והתשלום עדיין מדומים. שרת אמיתי יחשב ויאמת הכול מחדש.
import { demoFlags } from './data.js?v=20260929-pizzeria2';
import { openingStatus } from './schedule.js?v=20260929-pizzeria2';
import { verifySelectedAddress } from './address.js?v=20260929-pizzeria2';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const verifyAddress = verifySelectedAddress;

export function phoneDigits(value) {
  return String(value || '').trim().replace(/[\s()-]/g, '').replace(/^(?:\+972|00972)/, '0');
}

export const validPhone = (value) => /^0(5\d{8}|[2-489]\d{7}|7\d{8})$/.test(phoneDigits(value));
export const phoneProblem = (value) => !String(value || '').trim() ? 'צריך טלפון כדי לעדכן על ההזמנה.' : validPhone(value) ? '' : 'המספר לא נראה תקין. בדקו את הספרות, למשל: 050-1234567.';
export function formatPhone(value) {
  const digits = phoneDigits(value);
  if (!validPhone(digits)) return String(value || '');
  const prefix = digits.length === 9 ? 2 : 3;
  return `${digits.slice(0, prefix)}-${digits.slice(prefix)}`;
}

export function isOpen() {
  return openingStatus().open;
}

export async function submitOrder(order) {
  await wait(1400);
  if (demoFlags().payFail) return { ok: false, reason: 'payment' };
  return { ok: true, reference: `DEMO-${String(Date.now()).slice(-4)}`, order };
}
