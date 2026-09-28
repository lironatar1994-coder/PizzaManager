import { shop, demoFlags } from './data.js?v=20260929-menu4';

const DAY = 1440;
export const WEEKDAYS = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
const partsFormat = new Intl.DateTimeFormat('en-CA', { timeZone: shop.hours.timeZone || 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const minutesOf = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN;
const dayNumber = (date) => Date.parse(`${date}T00:00:00Z`) / 86400000;
export const offsetDate = (date, days) => new Date((dayNumber(date) + days) * 86400000).toISOString().slice(0, 10);
export const weekdayOf = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();
const clock = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function businessNow(now = new Date()) {
  const parts = Object.fromEntries(partsFormat.formatToParts(now).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute), tick: dayNumber(date) * DAY + Number(parts.hour) * 60 + Number(parts.minute) };
}

export function intervalsForDate(date, settings = shop.hours) {
  const exception = settings.exceptions?.[date];
  if (exception?.closed) return [];
  return exception?.intervals || settings.weekly?.[weekdayOf(date)] || [];
}

function windowsStarting(date, settings) {
  return intervalsForDate(date, settings).flatMap(({ open, close }) => {
    const start = minutesOf(open), end = minutesOf(close);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return [];
    return [{ start: dayNumber(date) * DAY + start, end: dayNumber(date) * DAY + end + (end < start ? DAY : 0) }];
  });
}

// חריג סגירה בתאריך מסוים גובר גם על שעות שנמשכות מהערב הקודם.
export function serviceWindows(date, settings = shop.hours) {
  if (settings.exceptions?.[date]?.closed) return [];
  const floor = dayNumber(date) * DAY;
  const ceiling = floor + DAY;
  return [...windowsStarting(offsetDate(date, -1), settings), ...windowsStarting(date, settings)]
    .map((window) => ({ start: Math.max(floor, window.start), end: Math.min(ceiling, window.end) }))
    .filter((window) => window.end > window.start).sort((a, b) => a.start - b.start);
}

export function dateLabel(date, now = new Date()) {
  const today = businessNow(now).date;
  if (date === today) return 'היום';
  if (date === offsetDate(today, 1)) return 'מחר';
  const [, month, day] = date.split('-');
  return `${WEEKDAYS[weekdayOf(date)]}, ${Number(day)}.${Number(month)}`;
}

export function openingStatus(now = new Date()) {
  const current = businessNow(now);
  const forced = demoFlags().closed;
  const nextDayClosed = Boolean(shop.hours.exceptions?.[offsetDate(current.date, 1)]?.closed);
  const floor = dayNumber(current.date) * DAY;
  const currentWindows = shop.hours.exceptions?.[current.date]?.closed ? [] : [...windowsStarting(offsetDate(current.date, -1), shop.hours), ...windowsStarting(current.date, shop.hours)]
    .map((period) => ({ ...period, end: nextDayClosed ? Math.min(period.end, floor + DAY) : period.end }));
  const window = !forced && currentWindows.find((period) => current.tick >= period.start && current.tick < period.end);
  if (window) {
    const closesAt = clock(window.end);
    return { open: true, closesAt, label: `פתוח עכשיו · עד ${closesAt}` };
  }
  for (let offset = 0; offset < 15; offset++) {
    if (forced && offset === 0) continue;
    const date = offsetDate(current.date, offset);
    const next = serviceWindows(date).find((period) => period.start > current.tick);
    if (next) {
      const nextLabel = `${dateLabel(date, now)} ב־${clock(next.start)}`;
      return { open: false, next: { date, time: clock(next.start) }, nextLabel, label: `סגור כרגע · נפתח ${nextLabel}` };
    }
  }
  return { open: false, label: 'סגור כרגע · שעות פתיחה נוספות טרם הוגדרו' };
}

export function pickupSlots(now = new Date()) {
  const settings = shop.pickup.schedule;
  if (!settings?.enabled) return [];
  const current = businessNow(now);
  const step = Math.max(5, Math.min(120, Math.floor(Number(settings.slotMinutes) || 15)));
  const lead = Math.max(0, Number(settings.preparationMinutes) || 0);
  const days = Math.max(1, Math.min(14, Math.floor(Number(settings.daysAhead) || 7)));
  const slots = [];
  for (let offset = 0; offset < days; offset++) {
    const date = offsetDate(current.date, offset);
    if (demoFlags().closed && offset === 0) continue;
    const business = serviceWindows(date);
    const pickup = settings.weekly || settings.exceptions ? serviceWindows(date, settings.weekly ? settings : { ...settings, weekly: shop.hours.weekly }) : business;
    const windows = business.flatMap((a) => pickup.map((b) => ({ start: Math.max(a.start, b.start), end: Math.min(a.end, b.end) })).filter((period) => period.end > period.start));
    const seen = new Set();
    for (const window of windows) {
      for (let tick = Math.ceil(Math.max(window.start, current.tick + lead) / step) * step; tick + step <= window.end; tick += step) {
        const time = clock(tick), id = `${date}T${time}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const override = settings.slots?.[id];
        const capacity = Math.max(0, Math.floor(Number(override?.capacity ?? settings.ordersPerSlot) || 0));
        const booked = Math.max(0, Math.floor(Number(override?.booked) || 0));
        if (override?.closed || capacity <= booked) continue;
        slots.push({ id, date, time, endTime: clock(tick + step), label: `${time}–${clock(tick + step)}`, capacity, remaining: capacity - booked });
      }
    }
  }
  return slots.sort((a, b) => a.id.localeCompare(b.id));
}

export function selectedPickupSlot(id, now = new Date()) {
  return pickupSlots(now).find((slot) => slot.id === id) || null;
}

export function pickupDescription(slot, now = new Date()) {
  return slot ? `איסוף ${dateLabel(slot.date, now)} · \u2066${slot.label}\u2069` : 'איסוף בהקדם';
}
