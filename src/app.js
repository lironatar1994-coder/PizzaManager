import { mountCheckoutFlow } from './customer-flow.js';
import { setupFloatingPreview } from './floating-preview.js?v=20261001-type1';
import { shop, activeProducts, findProduct, isAvailable } from './data.js?v=20260929-pizzeria2';
import { money, PLACEMENTS, variantsFor, defaultConfig, normalizeConfig, choicePrice, unitPrice, priceBreakdown, describe, lineTotal, copyHalf, swapHalves, replaceExtra, clearExtras, configurationIssues, configurationChanges, prepareRepeatOrder, minimumSuggestions, bundleParts, bundleSavings, complementarySuggestion } from './order.js?v=20260929-pizzeria2';
import { pizzaState, pizzaSVG, updatePizza, shapeIcon } from './pizza.js?v=20260929-pizzeria2';
import { getCart, getLine, cartCount, cartSubtotal, onCartChange, addLine, updateLine, removeLine, lastRemovedLine, undoRemoveLine, clearCart, saveLastOrder, getLastOrder, getRepeatOrder, remembersRepeatOrder, rememberRepeatOrder, getDraft, saveDraft, clearDraft, getMode, saveMode, getFavorites, getFavorite, matchingFavorite, saveFavorite, removeFavorite, onFavoritesChange, favoriteStorageIsPersistent, getCustomerDetails, saveCustomerDetails, forgetCustomerDetails } from './store.js?v=20260929-pizzeria2';
import { verifyAddress, isOpen, submitOrder, validPhone, phoneProblem, formatPhone } from './services.js?v=20260929-pizzeria2';
import { configurationLink, decodeConfiguration } from './config-links.js?v=20260929-pizzeria2';
import { WEEKDAYS, businessNow, weekdayOf, dateLabel, openingStatus, pickupSlots, selectedPickupSlot, pickupDescription } from './schedule.js?v=20260929-pizzeria2';
import { searchAddresses, zoneForAddress } from './address.js?v=20260929-pizzeria2';
import { createNavigator } from './navigation.js?v=20260929-transition3';

const app = document.querySelector('#app');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const navigatePage = createNavigator({ reducedMotion, pizzaSrc: './assets/pizza-base-v2.webp' });
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
let teardown = [];
let freshBuilder = false;
let stopAddressLookup = () => {};

/* ---------- אייקונים ---------- */

const ICONS = {
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v6m4-6v6"/>',
  forward: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  back: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  close: '<path d="M6.5 6.5l11 11m0-11-11 11"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  minus: '<path d="M5.5 12h13"/>',
  box: '<path d="M3.5 10h17v8.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z"/><path d="M3.5 10 6.2 5.5h11.6L20.5 10"/><path d="M9.5 14.8h5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  delivery: '<circle cx="6.5" cy="17" r="2.3"/><circle cx="17.5" cy="17" r="2.3"/><path d="M8.8 17h6.4M14.5 17l-2-8H10m2.5 0h3l4 6.8M4 12.5h5.5"/>',
  pickup: '<path d="M4.5 10.5V19h15v-8.5M3 10.5 5 5h14l2 5.5Z"/><path d="M10 19v-4.5h4V19"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  pin: '<path d="M12 20.5s-6.3-5.8-6.3-10.6a6.3 6.3 0 0 1 12.6 0c0 4.8-6.3 10.6-6.3 10.6Z"/><circle cx="12" cy="9.9" r="2.3"/>',
  alert: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.8v5M12 16.2v.1"/>',
  phone: '<path d="M6.2 4h2.9l1.5 3.9-1.9 1.3a10.5 10.5 0 0 0 6.1 6.1l1.3-1.9 3.9 1.5v2.9a1.6 1.6 0 0 1-1.7 1.6A15.2 15.2 0 0 1 4.6 5.7 1.6 1.6 0 0 1 6.2 4Z"/>',
  clock: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.5V12l3 2"/>',
  expand: '<path d="M8.5 4.5h-4v4m11-4h4v4m0 7v4h-4m-7 0h-4v-4"/><path d="m4.5 4.5 5 5m10-5-5 5m5 10-5-5m-10 5 5-5"/>',
  down: '<path d="m7 9.5 5 5 5-5"/>',
  receipt: '<path d="M6 3.5h12V21l-3-1.5L12 21l-3-1.5L6 21Z"/><path d="M9 8h6m-6 4h6m-6 4h3"/>',
  copy: '<path d="M8 8h12v12H8Z"/><path d="M16 8V4H4v12h4m4-2h4m-2-2v4"/>',
  heart: '<path d="m12 20-7.2-7.1C.5 8.7 6.3 2.4 12 7.4c5.7-5 11.5 1.3 7.2 5.5Z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.7 7.6-4.4m-7.6 7 7.6 4.4"/>',
  info: '<circle cx="12" cy="12" r="8.8"/><path d="M12 10.5v6m0-9v.1"/>',
  undo: '<path d="M9 5 4 10l5 5M4 10h9a6 6 0 0 1 0 12"/>',
  swap: '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  edit: '<path d="m15.5 4.5 4 4M4 20l4.5-1L20 7.5a2.8 2.8 0 0 0-4-4L4.5 15Z"/>',
};
const icon = (name, className = '') => `<svg class="icon${className ? ` ${className}` : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const placementIcon = (placement) => `<svg class="placement__icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.6" fill="none" stroke="currentColor" stroke-width="1.6"/>${{
  right: '<path d="M10 2.4a7.6 7.6 0 0 1 0 15.2Z" fill="currentColor"/>',
  whole: '<circle cx="10" cy="10" r="7.6" fill="currentColor"/>',
  left: '<path d="M10 2.4a7.6 7.6 0 0 0 0 15.2Z" fill="currentColor"/>',
}[placement]}</svg>`;

/* ---------- רכיבים משותפים ---------- */

function brand() {
  return `<a class="brand" href="#/" aria-label="${safe(shop.name)} — לעמוד הפתיחה">
    ${shop.logo ? `<img class="brand__mark" src="${safe(shop.logo)}" alt="" />` : `<svg class="brand__mark" viewBox="0 0 48 48" aria-hidden="true"><use href="${safe(shop.brandMark)}"/></svg>`}
    <span>${safe(shop.name)}</span>
  </a>`;
}

function cartButton() {
  const count = cartCount();
  return `<button class="cart-button" type="button" data-open-cart aria-label="${cartLabel(count)}"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h3l2.5 12h11L21 6H6M9 20h.01M18 20h.01" stroke-linecap="round" stroke-linejoin="round" /></svg><span class="cart-button__count" data-cart-count ${count ? '' : 'hidden'}>${count}</span></button>`;
}
const itemsText = (count) => (count === 1 ? 'פריט אחד' : `${count} פריטים`);
const cartLabel = (count) => (count ? `הסל, ${itemsText(count)}` : 'הסל ריק');

function topbar(back) {
  return `<header class="topbar"><div class="topbar__inner">
    ${back ? `<a class="back-link" href="${back}" aria-label="חזרה">${icon('back')}<span>חזרה</span></a>` : '<span></span>'}
    ${brand()}
    <div class="topbar__end"><span class="demo-pill">הדגמה</span>${contactButtons('icon-button topbar__util')}${cartButton()}</div>
  </div></header>`;
}

function orderProgress() { return ''; }

const alternativeFor = (group, choice) => (choice.alternatives || []).map((id) => group.choices.find((item) => item.id === id)).find(isAvailable);
const priceDifference = (delta) => delta > 0 ? `תוספת ${money(delta)}` : delta < 0 ? `הפחתה ${money(-delta)}` : 'המחיר לא השתנה';

function lineIssues(line) {
  const product = activeProducts().find((item) => item.id === line.config.productId);
  return product ? configurationIssues(product, line.config).map((issue) => issue.name) : ['המוצר אינו זמין'];
}

const phoneHref = () => `tel:${shop.phone.replace(/[^\d+]/g, '')}`;
const wazeHref = () => `https://waze.com/ul?q=${encodeURIComponent(shop.location.address)}&navigate=yes`;
const mapsHref = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.location.address)}`;

function contactButtons(className) {
  return `<a class="${className}" href="${phoneHref()}" aria-label="התקשרות לפיצרייה">${icon('phone')}</a><button type="button" class="${className}" data-open-info aria-label="מיקום ושעות">${icon('pin')}</button>`;
}

function productArt(product, config, label = '') {
  if (product.bundle) return `<span class="bundle-art"${label ? ` role="img" aria-label="${safe(label)}"` : ' aria-hidden="true"'}>${bundleParts(product, config).filter((part) => part.product).map((part) => `<span>${productArt(part.product, part.config)}</span>`).join('')}</span>`;
  if (product.visual === 'pizza') return pizzaSVG(pizzaState(product, config), { label });
  if (product.image) return `<img src="${safe(product.image)}" alt="${label ? safe(product.imageAlt || label) : ''}" loading="lazy" />`;
  return `<span class="art-placeholder" ${label ? `role="img" aria-label="${safe(label)}"` : 'aria-hidden="true"'}><span>תמונת מוצר</span></span>`;
}

function stepper({ value, min = 1, max = 99, label, attr = 'data-qty', small = false }) {
  return `<div class="stepper${small ? ' stepper--small' : ''}" role="group" aria-label="${safe(label)}">
    <button type="button" ${attr}="plus" aria-label="הוספה" ${value >= max ? 'disabled' : ''}>${icon('plus')}</button>
    <output aria-live="polite">${value}</output>
    <button type="button" ${attr}="minus" aria-label="הפחתה" ${value <= min ? 'disabled' : ''}>${icon('minus')}</button>
  </div>`;
}

const detailText = (info) => info.components ? info.components.map((part) => `${part.name}: ${part.title} · ${detailText(part)}${part.label ? ` · ${part.label}` : ''}${part.note ? ` · ${part.note}` : ''}`).join(' / ') : [...info.singles, ...info.extras.map((extra) => extra.text)].join(' · ');

function compositionMarkup(info) {
  if (info.components) return `<div class="bundle-composition">${info.components.map((part) => `<div><strong>${safe(part.name)} · ${safe(part.title)}</strong>${itemLabelMarkup(part.label)}${compositionMarkup(part)}${part.note ? `<p class="cart-line__note">הערה: <bdi>${safe(part.note)}</bdi></p>` : ''}</div>`).join('')}</div>`;
  const divided = info.extras.filter((extra) => extra.divided);
  if (!divided.length) return `<p class="composition-basics">${safe(detailText(info) || 'בלי תוספות')}</p>`;
  const basics = [...info.singles, ...info.extras.filter((extra) => !extra.divided).map((extra) => extra.name)];
  return `${basics.length ? `<p class="composition-basics">${safe(basics.join(' · '))}</p>` : ''}<dl class="composition" aria-label="סיכום תוספות לפי חלקי הפיצה">${['whole', 'right', 'left'].map((part) => `<div><dt>${placementIcon(part)}${PLACEMENTS[part].label}</dt><dd>${safe(divided.filter((extra) => extra.placement === part).map((extra) => extra.name).join(', ') || 'בלי תוספות')}</dd></div>`).join('')}</dl>`;
}

const itemLabelMarkup = (label, className = 'item-label') => label ? `<span class="${className}"><bdi>${safe(label)}</bdi></span>` : '';

function selectedExtrasMarkup(group, value, editing) {
  const choices = group.choices.filter((choice) => value?.[choice.id]);
  const selected = choices.find((choice) => choice.id === editing);
  return `<ul class="selected-extras__list" aria-label="${safe(group.name)} שנבחרו">${choices.map((choice) => `<li>
    ${group.placement ? `<button type="button" data-extra-edit="${safe(choice.id)}" ${!isAvailable(choice) ? 'disabled' : ''} aria-expanded="${choice.id === editing}" aria-label="שינוי מיקום ${safe(choice.name)}">${placementIcon(value[choice.id])}<span>${safe(choice.name)}<small>${isAvailable(choice) ? placementLabel(value[choice.id]) : 'אזל להיום'}</small></span></button>` : `<span class="selected-extras__name">${safe(choice.name)}${!isAvailable(choice) ? '<small>אזל להיום</small>' : ''}</span>`}
    <button type="button" class="selected-extras__remove" data-extra-remove="${safe(choice.id)}" aria-label="הסרת ${safe(choice.name)}">${icon('close')}</button>
  </li>`).join('')}</ul>${selected ? `<section class="selected-extras__editor" aria-label="מיקום ${safe(selected.name)}"><header><strong>${safe(selected.name)}</strong><button type="button" class="icon-button" data-close-extra aria-label="סגירת מיקום התוספת">${icon('close')}</button></header><div role="group" aria-label="בחירת מיקום ${safe(selected.name)}">${['right', 'whole', 'left'].map((part) => `<button type="button" data-quick-placement="${part}" aria-pressed="${value[selected.id] === part}">${placementIcon(part)}<span>${PLACEMENTS[part].label}<small><bdi>${selected.price ? `+${money(choicePrice(selected, part))}` : 'כלול'}</bdi></small></span></button>`).join('')}</div></section>` : ''}`;
}

function priceMarkup(product, config, quantity) {
  const price = priceBreakdown(product, config, quantity);
  return `<dl class="price-rows">${price.rows.map((row) => `<div><dt>${safe(row.name)}</dt><dd><bdi>${row.amount ? money(row.amount) : 'כלול'}</bdi></dd></div>`).join('')}
    ${quantity > 1 ? `<div class="price-rows__unit"><dt>מחיר ליחידה</dt><dd><bdi>${money(price.unit)}</bdi></dd></div><div><dt>כמות</dt><dd><bdi>× ${quantity}</bdi></dd></div>` : ''}
    <div class="price-rows__total"><dt>סה״כ${quantity > 1 ? ` ל־${quantity} יח׳` : ''}</dt><dd><bdi>${money(price.total)}</bdi></dd></div></dl>`;
}

function foodInfoContent(product, config) {
  const selected = [{ name: 'הבסיס', data: product.foodInfo }];
  for (const group of product.optionGroups || []) {
    for (const choice of group.choices) {
      const value = config.options?.[group.id];
      if (group.type === 'single' ? choice.id === value : value?.[choice.id]) selected.push({ name: choice.name, data: choice.foodInfo });
    }
  }
  const known = selected.filter((item) => item.data && (item.data.reviewed === true || shop.demoOnly));
  const unconfirmed = selected.filter((item) => !item.data || !item.data.reviewed);
  const allergens = [...new Set(known.flatMap((item) => item.data.allergens || []))];
  return `${shop.demoOnly ? '<p class="food-info__notice">מידע להמחשה בלבד — טרם אושר בידי העסק.</p>' : unconfirmed.length ? '<p class="food-info__notice">המידע להרכב הזה עדיין לא אושר במלואו בידי העסק.</p>' : ''}
    ${known.length ? `<dl>${known.map((item) => `<div><dt>${safe(item.name)}</dt><dd>${safe((item.data.ingredients || []).join(', ') || 'פירוט מרכיבים טרם נמסר')}</dd></div>`).join('')}</dl>` : ''}
    ${allergens.length ? `<p><strong>אלרגנים שצוינו:</strong> ${safe(allergens.join(', '))}</p>` : '<p>רשימת אלרגנים מאושרת להרכב המלא טרם נמסרה.</p>'}
    ${unconfirmed.length && !shop.demoOnly ? `<p>ממתין לאישור: ${safe(unconfirmed.map((item) => item.name).join(', '))}.</p>` : ''}
    ${product.foodInfo?.crossContact && (product.foodInfo.reviewed || shop.demoOnly) ? `<p>${safe(product.foodInfo.crossContact)}</p>` : ''}
    <a class="food-info__contact" href="${phoneHref()}">${icon('phone')}בירור מרכיבים עם הפיצרייה</a>`;
}

function foodInfoMarkup(product, config, includeDescription = false) {
  return `<details class="food-info"><summary>${icon('info')}<span>מרכיבים ואלרגנים</span>${icon('down')}</summary><div class="food-info__body">${includeDescription && product.description ? `<p class="food-info__description">${safe(product.description)}</p>` : ''}<div data-food-content>${foodInfoContent(product, config)}</div></div></details>`;
}

let repeatMemoryMessage = '';
let repeatMemoryError = false;
function repeatPreferenceMarkup() {
  return `<label class="customer-memory__choice"><input type="checkbox" data-remember-repeat ${remembersRepeatOrder() ? 'checked' : ''} /><span><strong>לשמור את ההרכב לביקור הבא</strong><small>הרכב וכמויות במכשיר הזה. בלי פרטי קשר, כתובת או הערות.</small></span></label>
    <button type="button" class="link-button" data-forget-repeat ${remembersRepeatOrder() ? '' : 'hidden'}>${icon('close')}מחיקת ההרכב השמור</button>
    <p class="customer-memory__status${repeatMemoryError ? ' is-error' : ''}" role="status">${safe(repeatMemoryMessage)}</p>`;
}

function updateRepeatPreference(enabled) {
  const result = rememberRepeatOrder(enabled);
  repeatMemoryError = !result.ok;
  repeatMemoryMessage = !result.ok ? enabled ? 'האחסון במכשיר חסום. לא הצלחנו לשמור לביקור הבא.' : 'לא הצלחנו למחוק את השמירה במכשיר. אפשר לנסות שוב.' : !enabled ? 'השמירה לביקורים הבאים בוטלה. ההזמנה בביקור הנוכחי נשארה.' : result.saved ? 'ההרכב נשמר לביקור הבא. המחיר יחושב מחדש כשתזמינו.' : 'אחרי אישור ההזמנה, ההרכב יישמר לביקור הבא.';
  document.querySelectorAll('[data-repeat-preference]').forEach((section) => {
    const choice = section.querySelector('[data-remember-repeat]');
    const forget = section.querySelector('[data-forget-repeat]');
    const message = section.querySelector('[role="status"]');
    choice.checked = remembersRepeatOrder();
    if (!choice.checked && document.activeElement === forget) choice.focus({ preventScroll: true });
    forget.hidden = !choice.checked;
    message.textContent = repeatMemoryMessage;
    message.classList.toggle('is-error', repeatMemoryError);
  });
}

function productHref() {
  const list = activeProducts();
  return list.length === 1 ? `#/product/${list[0].id}` : '#/menu';
}

/* ---------- מסך פתיחה ---------- */

function home() {
  const list = activeProducts();
  const unavailable = list.length === 0;
  const status = openingStatus();
  const closed = !status.open;
  const remembered = typeof getRepeatOrder === 'function' && getRepeatOrder()?.lines?.length;
  const heroImages = shop.demoOnly ? { mobile: './assets/hero-pizzeria-mobile-v3.webp', desktop: './assets/hero-pizzeria-desktop-v3.webp', alt: 'תמונת המחשה של פיצה על כף עץ ליד תנור לבנים — אינה צילום של מוצר העסק' } : shop.heroImages;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#141614');
  app.innerHTML = `<main class="hero hero--luxury" aria-labelledby="hero-title">
    <!-- THESIS: A centered restaurant identity and four clear actions within one mobile viewport.
    OWN-WORLD: Warm brick oven and wooden pizza peel, an emphatic ivory Heebo 900 name, tomato delivery and ivory pickup controls.
    STORY: Choose delivery or pickup; contact and navigation remain directly below.
    FIRST VIEWPORT: The complete identity and action group sits at the horizontal and vertical center of 100dvh, with safe-area padding.
    FORM: Centered full-height opening, amplified toward a warm pizzeria at the user's request.
    FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->
    <picture class="hero__media"><source media="(max-width: 700px)" srcset="${safe(heroImages.mobile)}" /><img src="${safe(heroImages.desktop)}" alt="${safe(heroImages.alt)}" fetchpriority="high" /></picture>
    <div class="hero__shade" aria-hidden="true"></div>
    <div class="hero__body">
      <div class="hero__identity">
        ${shop.logo ? `<img class="hero__mark" src="${safe(shop.logo)}" alt="" />` : `<svg class="hero__mark" viewBox="0 0 48 48" aria-hidden="true"><use href="./assets/brand/oven-mark-luxury.svg#oven-mark-luxury" /></svg>`}
        <h1 id="hero-title">${safe(shop.name)}</h1>
      </div>
      ${unavailable ? '<p class="hero__empty" role="status">אין מוצרים זמינים כרגע. אפשר לחזור לכאן בהמשך.</p>' : ''}
      ${unavailable ? '' : `<div class="hero__actions" role="group" aria-label="איך תרצו לקבל את ההזמנה?">
        ${shop.deliveryZones?.length ? `<a class="button button--primary hero__cta" href="${productHref()}" data-mode="delivery">${icon('delivery')}<span>משלוח</span></a>` : ''}
        <a class="button hero__cta hero__cta--pickup" href="${productHref()}" data-mode="pickup"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h14l1 12H4Z" /><path d="M8 10V6a4 4 0 0 1 8 0v4" /></svg><span>איסוף עצמי</span></a>
      </div>`}
      <div class="hero__utilities" role="group" aria-label="טלפון ומיקום">
        ${shop.demoOnly ? `<button type="button" class="hero__utility" data-hero-contact="phone" aria-label="חיוג · הצגת מספר הטלפון" aria-expanded="false" aria-controls="hero-contact-panel"><span>חיוג</span>${icon('phone')}</button>` : `<a class="hero__utility" href="${phoneHref()}"><span>חיוג</span>${icon('phone')}</a>`}
        ${shop.demoOnly ? `<button type="button" class="hero__utility" data-hero-contact="location" aria-label="ניווט · הצגת הכתובת" aria-expanded="false" aria-controls="hero-contact-panel"><span>ניווט</span>${icon('pin')}</button>` : `<a class="hero__utility" href="${safe(wazeHref())}" target="_blank" rel="noopener"><span>ניווט</span>${icon('pin')}</a>`}
        <div class="hero__contact-panel" id="hero-contact-panel" aria-hidden="true" inert></div>
      </div>
      <p class="hero__closed" data-hero-closed ${closed ? '' : 'hidden'}>${icon('alert')}<span>הפיצרייה סגורה כרגע.</span></p>
      <div class="hero__extras">
        <span class="hero__cart" data-hero-cart ${cartCount() ? '' : 'hidden'}>${cartButton()}</span>
        ${getFavorites().length ? `<button type="button" class="hero__shortcut" data-open-favorites>${icon('heart')}המועדפים שלי</button>` : ''}
        ${remembered ? `<a class="hero__shortcut" href="#/repeat">${icon('undo')}להזמין שוב</a>` : ''}
      </div>
    </div>
    <footer class="hero__footer"><button type="button" class="hero__hours" data-open-info aria-label="שעות הפעילות ופירוט השבוע">${icon('clock')}<span>שעות פעילות</span></button>${shop.demoOnly ? '<span class="hero__disclaimer">תמונת הדגמה · ללא חיוב</span>' : ''}</footer>
  </main>`;
}

function heroContactContent(kind) {
  const heading = kind === 'phone' ? shop.demoOnly ? 'טלפון לדוגמה' : 'טלפון' : shop.demoOnly ? 'כתובת לדוגמה' : 'כתובת';
  const detail = kind === 'phone'
    ? `<a class="hero__contact-value" href="${phoneHref()}"><bdi>${safe(shop.phone)}</bdi>${icon('phone')}</a>`
    : `<p class="hero__contact-address">${safe(shop.location.address)}</p><a class="hero__contact-nav" href="${safe(wazeHref())}" target="_blank" rel="noopener">ניווט ב־Waze ${icon('forward')}</a>`;
  return `<div class="hero__contact-head"><span>${heading}</span><button type="button" data-hero-contact-close aria-label="סגירה">${icon('close')}</button></div>${detail}`;
}

function closeHeroContact() {
  const utilities = document.querySelector('.hero__utilities');
  if (!utilities) return;
  const panel = utilities.querySelector('.hero__contact-panel');
  if (panel.contains(document.activeElement)) {
    utilities.querySelector(`[data-hero-contact="${panel.dataset.kind}"]`)?.focus({ preventScroll: true });
  }
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  panel.inert = true;
  utilities.querySelectorAll('[data-hero-contact]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
}

function toggleHeroContact(kind) {
  const utilities = document.querySelector('.hero__utilities');
  if (!utilities) return;
  const panel = utilities.querySelector('.hero__contact-panel');
  if (panel.classList.contains('is-open') && panel.dataset.kind === kind) { closeHeroContact(); return; }
  panel.innerHTML = heroContactContent(kind);
  panel.dataset.kind = kind;
  const utilityBox = utilities.getBoundingClientRect();
  const panelBox = panel.getBoundingClientRect();
  const roomBelow = window.innerHeight - utilityBox.bottom;
  panel.classList.remove('is-side');
  panel.classList.toggle('is-up', roomBelow < panelBox.height + 20);
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  panel.inert = false;
  utilities.querySelectorAll('[data-hero-contact]').forEach((button) => button.setAttribute('aria-expanded', String(button.dataset.heroContact === kind)));
}

/* ---------- תפריט ---------- */

function menu() {
  const list = activeProducts();
  const menuItems = (items, group) => `<ul class="menu-list menu-list--${group}">${items.map((product, index) => {
    const lead = group === 'products' && index === 0;
    const config = defaultConfig(product);
    const price = product.bundle ? unitPrice(product, config) : Math.min(...variantsFor(product).filter(isAvailable).map((variant) => variant.price));
    const saving = bundleSavings(product, config);
    const description = product.menuDescription && !/^(גודל ותוספות לבחירה|גדלים לבחירה|תוספות לבחירה)$/.test(product.menuDescription) ? product.menuDescription : product.bundle ? product.description : '';
    const fromPrice = !product.bundle && variantsFor(product).filter(isAvailable).some((variant) => variant.price > price);
    const featured = Boolean(product.menuFeatured && product.menuImage);
    const art = product.menuImage ? `<img src="${safe(product.menuImage)}" alt="${safe(product.menuImageAlt || product.imageAlt || product.name)}" width="960" height="640" decoding="async" />` : productArt(product, { ...config, variantId: variantsFor(product).at(-1).id });
    return `<li${lead ? ' class="menu-list__lead"' : featured ? ' class="menu-list__featured"' : ''}><a class="menu-item menu-item--${product.bundle ? 'meal' : 'product'}${lead ? ' menu-item--lead' : !product.bundle ? ' menu-item--secondary' : ''}${featured ? ' menu-item--featured' : ''}" href="#/product/${safe(product.id)}">
      <span class="menu-item__art${product.menuImage ? ' menu-item__art--photo' : ''}">${art}</span>
      <span class="menu-item__text"><strong class="menu-item__name">${safe(product.name)}</strong>${description ? `<span class="menu-item__description">${safe(description)}</span>` : ''}<span class="menu-item__bottom"><span class="menu-item__price">${fromPrice ? 'מ־' : ''}<bdi>${money(price)}</bdi></span><span class="menu-item__go"><span>מרכיבים</span>${icon('forward')}</span></span>${saving ? `<small class="menu-item__saving">חוסכים <bdi>${money(saving)}</bdi></small>` : ''}</span>
    </a></li>`;
  }).join('')}</ul>`;
  const bundles = list.filter((product) => product.bundle).sort((a, b) => Number(Boolean(b.menuFeatured)) - Number(Boolean(a.menuFeatured)));
  const individual = list.filter((product) => !product.bundle);
  app.innerHTML = `${topbar('#/').replace('class="topbar"', 'class="topbar menu-topbar"')}
    <main class="page menu-page"><!--
      THESIS: One editorial pizza photograph gives the first product presence; other products stay easy to select in compact rows.
      OWN-WORLD: Warm ivory, white surfaces, espresso ink, Heebo, tomato actions and 16px menu corners within the existing pizza identity.
      STORY: Progress, short title, prominent first product, compact following products, then the actual basket and checkout.
      FIRST VIEWPORT: The two managed active products are visible at the approved mobile size; no intro, categories or separate menu banner.
      FORM: Implement the user-approved premium mobile comp with real product links, dynamic prices and a basket-derived footer.
      FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
    --><div class="wrap">
      ${orderProgress('compose')}
      <header class="menu-head"><h1>התפריט</h1>${getFavorites().length ? `<button type="button" class="icon-button menu-favorites" data-open-favorites aria-label="המועדפים שלי">${icon('heart')}</button>` : ''}</header>
      ${individual.length ? `<section class="menu-section" aria-labelledby="individual-title"><h2 class="visually-hidden" id="individual-title">מוצרים להרכבה</h2>${menuItems(individual, 'products')}</section>` : ''}
      ${bundles.length ? `<section class="menu-section menu-section--bundles" aria-labelledby="combos-title"><h2 id="combos-title">ארוחות</h2>${menuItems(bundles, 'meals')}</section>` : ''}
      <p class="menu-note">${shop.demoOnly ? 'נתוני ותמונות הדגמה' : 'המחירים לפני תוספות'}</p>
    </div><footer class="menu-cart" data-menu-cart hidden><div class="menu-cart__inner"><button type="button" class="button button--primary menu-cart__button" data-open-cart><span class="menu-cart__action">${icon('box')}לסל</span><span class="menu-cart__count" data-menu-cart-count></span><bdi data-menu-cart-total></bdi></button></div></footer></main>`;
  refreshMenuCart();
}

function refreshMenuCart() {
  const footer = document.querySelector('[data-menu-cart]');
  if (!footer) return;
  const count = cartCount();
  const total = money(cartSubtotal());
  footer.hidden = count === 0;
  document.querySelector('.menu-page')?.classList.toggle('menu-page--with-cart', count > 0);
  const progress = document.querySelector('.menu-page .order-progress');
  if (progress) {
    progress.querySelector('[data-open-cart]').disabled = count === 0;
    if (progress.dataset.hasCart !== String(count > 0)) {
      progress.dataset.hasCart = String(count > 0);
      progress.querySelector('li:last-child').innerHTML = count > 0
        ? '<a href="#/checkout" data-close-sheet>פרטים</a>'
        : '<span aria-disabled="true">פרטים</span>';
    }
  }
  footer.querySelector('[data-menu-cart-count]').textContent = itemsText(count);
  footer.querySelector('[data-menu-cart-total]').textContent = total;
  footer.querySelector('[data-open-cart]').setAttribute('aria-label', `לסל, ${itemsText(count)}, ${total}`);
}

/* ---------- קומבואים: כל פריט בהרכב משלו ---------- */

function bundleItemMarkup(part, index) {
  const { product, config } = part;
  const prefix = `bundle-${part.id}`;
  const allowed = part.variantIds || variantsFor(product).map((variant) => variant.id);
  const sizes = variantsFor(product).filter((variant) => allowed.includes(variant.id));
  const included = variantsFor(product).find((variant) => variant.id === part.included.variantId);
  return `<details class="bundle-item" data-bundle-part="${safe(part.id)}"${index === 0 ? ' open' : ''}>
    <summary><span class="bundle-item__art" data-part-art>${productArt(product, config)}</span><span class="bundle-item__heading"><strong>${safe(part.name)}</strong><span data-part-title>${safe(describe(product, config).title)}</span><small data-part-extra></small></span><span class="bundle-item__edit">התאמה ${icon('down')}</span></summary>
    <div class="bundle-item__body">
      ${sizes.length > 1 ? `<label class="bundle-field" for="${safe(prefix)}-size"><span>גודל · ${safe(part.name)}</span><select class="input" id="${safe(prefix)}-size" data-part-variant>${sizes.map((variant) => `<option value="${safe(variant.id)}"${config.variantId === variant.id ? ' selected' : ''}${!isAvailable(variant) ? ' disabled' : ''}>${safe(variant.name)}${variant.price > included.price ? ` · +${money(variant.price - included.price)}` : ' · כלול'}${!isAvailable(variant) ? ' · אזל להיום' : ''}</option>`).join('')}</select></label>` : `<p class="bundle-item__included">${safe(included?.name || product.name)} כלול בארוחה${included?.diameterCm ? ` · ${included.diameterCm} ס״מ` : ''}</p>`}
      ${product.optionGroups?.map((group) => group.type === 'single'
        ? `<label class="bundle-field" for="${safe(prefix)}-${safe(group.id)}"><span>${safe(group.name)}</span><select class="input" id="${safe(prefix)}-${safe(group.id)}" data-part-single="${safe(group.id)}">${group.choices.map((choice) => `<option value="${safe(choice.id)}"${config.options[group.id] === choice.id ? ' selected' : ''}${!isAvailable(choice) ? ' disabled' : ''}>${safe(choice.name)} · ${choice.price ? `+${money(choice.price)}` : 'כלול'}${!isAvailable(choice) ? ' · אזל להיום' : ''}</option>`).join('')}</select></label>`
        : `<fieldset class="bundle-extras"><legend>${safe(group.name)} · ${safe(part.name)}</legend>${group.choices.map((choice) => {
          const placement = config.options[group.id]?.[choice.id];
          const available = isAvailable(choice);
          const fieldId = `${prefix}-${group.id}-${choice.id}`;
          return `<div class="bundle-extra"><label for="${safe(fieldId)}"><input type="checkbox" id="${safe(fieldId)}" data-part-extra="${safe(choice.id)}" data-part-group="${safe(group.id)}"${placement ? ' checked' : ''}${available || placement ? '' : ' disabled'}/>${choice.shape ? `<span class="bundle-extra__art">${shapeIcon(choice.shape)}</span>` : ''}<span>${safe(choice.name)}<small data-extra-price>${available ? `+${money(choicePrice(choice, placement || 'whole'))}` : 'אזל להיום'}</small></span></label>${group.placement ? `<select class="input" data-part-placement="${safe(choice.id)}" data-part-group="${safe(group.id)}" aria-label="מיקום ${safe(choice.name)} · ${safe(part.name)}"${placement && available ? '' : ' disabled'}>${['whole', 'right', 'left'].map((position) => `<option value="${position}"${(placement || 'whole') === position ? ' selected' : ''}>${PLACEMENTS[position].label} · +${money(choicePrice(choice, position))}</option>`).join('')}</select>` : ''}</div>`;
        }).join('')}</fieldset>`).join('') || ''}
      <details class="bundle-personal"><summary>שם והערה · לא חובה ${icon('down')}</summary><label class="bundle-field" for="${safe(prefix)}-name"><span>למי זה?</span><input class="input" dir="auto" id="${safe(prefix)}-name" data-part-name maxlength="40" value="${safe(config.label)}" placeholder="למשל: של הילדים" autocomplete="off"/></label><label class="bundle-field" for="${safe(prefix)}-note"><span>הוראות למטבח</span><textarea class="input" dir="auto" id="${safe(prefix)}-note" data-part-note maxlength="200" rows="2">${safe(config.note)}</textarea></label></details>
      ${foodInfoMarkup(product, config)}
    </div>
  </details>`;
}

function bundlePage(product, editLine, copyLine, source, returnToCheckout) {
  let draftKey = source?.key || (editLine ? `edit:${editLine.id}` : copyLine ? `copy:${copyLine.id}` : `product:${product.id}`);
  const draft = getDraft(draftKey, product);
  let config = normalizeConfig(product, draft?.config || source?.config || editLine?.config || copyLine?.config);
  let quantity = draft?.qty ?? source?.qty ?? editLine?.qty ?? 1;
  let adding = false;
  let persistEnabled = true;
  const back = returnToCheckout ? '#/checkout' : '#/menu';
  app.innerHTML = `${topbar(back)}<main class="page bundle-page"><div class="wrap bundle-layout">
    <div>${orderProgress('compose', product.id)}<header class="page-head"><h1>${safe(product.name)}</h1></header>

      <form id="bundle-form" class="bundle-items">${bundleParts(product, config).filter((part) => part.product).map(bundleItemMarkup).join('')}</form>
      <p class="bundle-errors" role="status" data-bundle-errors hidden></p>
      <p class="bundle-edit-status" role="status" data-bundle-edit-status hidden></p>
    </div>
    <aside class="bundle-overview" aria-label="סיכום ומחיר הארוחה"><div class="bundle-overview__art" data-bundle-art>${productArt(product, config)}</div><h2>מה בארוחה?</h2><div data-bundle-composition>${compositionMarkup(describe(product, config))}</div><p class="bundle-saving" data-bundle-saving></p><details class="bundle-price"><summary>פירוט המחיר ${icon('down')}</summary><div data-bundle-price>${priceMarkup(product, config, quantity)}</div></details></aside>
  </div></main><div class="buybar buybar--bundle"><div class="buybar__inner"><div class="bundle-total"><span>סה״כ לארוחה${shop.demoOnly ? ' · לדוגמה' : ''}</span><strong data-bundle-total><bdi>${money(unitPrice(product, config) * quantity)}</bdi></strong><small>משלוח מחושב בקופה</small></div>${stepper({ value: quantity, label: 'כמות ארוחות', attr: 'data-bundle-qty' })}<button type="button" class="button button--primary" id="add-bundle">${editLine ? returnToCheckout ? 'שמירה וחזרה לקופה' : 'עדכון הארוחה בסל' : 'הוספת הארוחה לסל'} ${icon('forward')}</button></div></div>`;
  const form = document.querySelector('#bundle-form');
  const persist = () => persistEnabled && saveDraft(draftKey, product, { config, qty: quantity, scroll: window.scrollY });
  const refresh = () => {
    const parts = bundleParts(product, config);
    const issues = configurationIssues(product, config);
    document.querySelector('[data-bundle-total]').innerHTML = `<bdi>${money(unitPrice(product, config) * quantity)}</bdi>`;
    document.querySelector('[data-bundle-price]').innerHTML = priceMarkup(product, config, quantity);
    document.querySelector('[data-bundle-composition]').innerHTML = compositionMarkup(describe(product, config));
    document.querySelector('[data-bundle-art]').innerHTML = productArt(product, config);
    const saving = bundleSavings(product, config) * quantity;
    document.querySelector('[data-bundle-saving]').textContent = saving ? `חיסכון של ${money(saving)} לעומת אותם פריטים בנפרד${shop.demoOnly ? ' · מחירי הדגמה' : ''}` : '';
    const errors = document.querySelector('[data-bundle-errors]');
    errors.hidden = !issues.length;
    errors.textContent = issues.length ? `צריך לעדכן: ${issues.map((issue) => issue.name).join(', ')}.` : '';
    const existing = editLine && getLine(editLine.id);
    const button = document.querySelector('#add-bundle');
    button.disabled = adding || Boolean(issues.length) || !activeProducts().some((item) => item.id === product.id);
    button.firstChild.textContent = existing ? returnToCheckout ? 'שמירה וחזרה לקופה ' : 'עדכון הארוחה בסל ' : 'הוספת הארוחה לסל ';
    const status = document.querySelector('[data-bundle-edit-status]');
    const change = existing ? configurationChanges(product, normalizeConfig(product, existing.config), config, existing.qty, quantity) : null;
    status.hidden = !editLine || Boolean(existing && !change.changes.length);
    status.textContent = editLine && !existing ? 'הארוחה הוסרה מהסל. אפשר להוסיף מחדש את ההרכב הזה.' : change?.changes.length ? `${change.changes.join(' · ')}. ${priceDifference(change.delta)}.` : '';
    document.querySelector('.buybar--bundle output').textContent = quantity;
    document.querySelector('[data-bundle-qty="minus"]').disabled = quantity <= 1;
    document.querySelector('[data-bundle-qty="plus"]').disabled = quantity >= 99;
    for (const part of parts) {
      const node = form.querySelector(`[data-bundle-part="${CSS.escape(part.id)}"]`);
      if (!node || !part.product) continue;
      node.querySelector('[data-part-art]').innerHTML = productArt(part.product, part.config);
      node.querySelector('[data-part-title]').textContent = describe(part.product, part.config).title;
      const extra = Math.max(0, unitPrice(part.product, part.config) - unitPrice(part.product, part.included));
      node.querySelector('[data-part-extra]').textContent = extra ? `שדרוגים ותוספות: +${money(extra)}` : 'כלול במחיר הארוחה';
      node.querySelectorAll('[data-part-placement]').forEach((select) => {
        const choice = part.product.optionGroups.find((group) => group.id === select.dataset.partGroup)?.choices.find((item) => item.id === select.dataset.partPlacement);
        const placement = part.config.options[select.dataset.partGroup]?.[select.dataset.partPlacement];
        select.disabled = !placement || !isAvailable(choice);
      });
      node.querySelectorAll('[data-part-extra]').forEach((input) => {
        if (input.tagName !== 'INPUT') return;
        const group = part.product.optionGroups.find((item) => item.id === input.dataset.partGroup);
        const choice = group.choices.find((item) => item.id === input.dataset.partExtra);
        const placement = part.config.options[group.id]?.[choice.id];
        input.disabled = !isAvailable(choice) && !placement;
        input.closest('.bundle-extra').querySelector('[data-extra-price]').textContent = isAvailable(choice) ? `+${money(choicePrice(choice, placement || 'whole'))}` : 'אזל להיום';
      });
      const food = node.querySelector('.food-info');
      if (food) { const open = food.open; food.outerHTML = foodInfoMarkup(part.product, part.config); node.querySelector('.food-info').open = open; }
    }
  };
  const update = (event) => {
    const input = event.target;
    const node = input.closest('[data-bundle-part]');
    if (!node) return;
    const part = bundleParts(product, config).find((item) => item.id === node.dataset.bundlePart);
    if (!part?.product) return;
    const next = structuredClone(part.config);
    if (input.hasAttribute('data-part-variant')) next.variantId = input.value;
    else if (input.hasAttribute('data-part-single')) next.options[input.dataset.partSingle] = input.value;
    else if (input.hasAttribute('data-part-extra')) {
      if (input.checked) next.options[input.dataset.partGroup][input.dataset.partExtra] = node.querySelector(`[data-part-placement="${CSS.escape(input.dataset.partExtra)}"]`)?.value || 'whole';
      else delete next.options[input.dataset.partGroup][input.dataset.partExtra];
    } else if (input.hasAttribute('data-part-placement')) next.options[input.dataset.partGroup][input.dataset.partPlacement] = input.value;
    else if (input.hasAttribute('data-part-name')) next.label = input.value;
    else if (input.hasAttribute('data-part-note')) next.note = input.value;
    else return;
    config.items = config.items.map((item) => item.id === part.id ? { id: part.id, config: next } : item);
    config = normalizeConfig(product, config);
    persistEnabled = true;
    persist(); refresh();
  };
  form.addEventListener('change', update);
  form.addEventListener('input', (event) => { if (event.target.matches('[data-part-name], [data-part-note]')) update(event); });
  form.addEventListener('submit', (event) => event.preventDefault());
  document.querySelectorAll('[data-bundle-qty]').forEach((button) => button.addEventListener('click', () => { quantity = Math.max(1, Math.min(99, quantity + (button.dataset.bundleQty === 'plus' ? 1 : -1))); persistEnabled = true; persist(); refresh(); }));
  document.querySelector('#add-bundle').addEventListener('click', () => {
    if (adding || configurationIssues(product, config).length || !activeProducts().some((item) => item.id === product.id)) return;
    adding = true;
    const updated = Boolean(editLine && getLine(editLine.id));
    let line;
    if (updated) { updateLine(editLine.id, { config, qty: quantity }); line = getLine(editLine.id); }
    else line = addLine(config, quantity);
    clearDraft(draftKey); editLine = null; draftKey = `product:${product.id}`; persistEnabled = false;
    adding = false;
    if (returnToCheckout) { checkout.updatedLine = line.id; window.location.hash = '#/checkout'; return; }
    history.replaceState(null, '', `#/product/${product.id}`);
    refresh(); openAdded(line, updated);
  });
  teardown.push(onCartChange(refresh));
  const rememberScroll = () => persist();
  window.addEventListener('scroll', rememberScroll, { passive: true });
  teardown.push(() => window.removeEventListener('scroll', rememberScroll));
  refresh();
  return draft?.scroll || 0;
}

function repeatPage() {
  const order = getRepeatOrder();
  const repeat = prepareRepeatOrder(order, activeProducts());
  app.innerHTML = `${topbar('#/')}<main class="page repeat-page"><div class="wrap repeat-page__inner">
    ${orderProgress('compose')}
    <header class="page-head"><h1>להזמין שוב</h1>${order ? '' : '<p>אין הזמנה שמורה</p>'}</header>
    ${shop.demoOnly ? '<p class="repeat-page__hint">הזמנה ומחירים לדוגמה בלבד.</p>' : ''}
    ${repeat.notices.length ? `<section class="repeat-updates" aria-label="התאמות לתפריט הנוכחי"><h2>מה התעדכן?</h2><ul>${repeat.notices.map((notice) => `<li>${safe(notice)}</li>`).join('')}</ul></section>` : ''}
    <ul class="repeat-lines">${repeat.lines.map((line) => {
      const product = findProduct(line.config.productId);
      return `<li><span class="repeat-line__art">${productArt(product, line.config)}</span><div>${itemLabelMarkup(line.config.label)}<h2>${line.qty} × ${safe(line.title)}</h2>${compositionMarkup(describe(product, line.config))}${line.config.note ? `<p class="cart-line__note">הערה: <bdi>${safe(line.config.note)}</bdi></p>` : ''}</div><bdi>${money(line.total)}</bdi></li>`;
    }).join('')}</ul>
    ${repeat.lines.length ? `${cartCount() ? '<p class="repeat-page__hint">יתווסף לסל הנוכחי</p>' : ''}<button type="button" class="button button--primary" data-load-repeat>טעינה לסל ועריכה · <bdi>${money(repeat.total)}</bdi>${icon('forward')}</button>` : ''}
    <a class="link-button" href="${productHref()}">להרכבה חדשה ${icon('forward')}</a><section class="customer-memory" data-repeat-preference aria-label="שמירת הרכב לביקור הבא">${repeatPreferenceMarkup()}</section><p data-repeat-status role="status"></p>
  </div></main>`;
  document.querySelector('[data-load-repeat]')?.addEventListener('click', (event) => {
    event.currentTarget.disabled = true;
    const current = prepareRepeatOrder(order, activeProducts());
    if (current.lines.length !== repeat.lines.length || JSON.stringify(current.lines) !== JSON.stringify(repeat.lines)) { repeatPage(); return; }
    current.lines.forEach((line) => addLine(line.config, line.qty));
    document.querySelector('[data-repeat-status]').textContent = 'ההרכב נטען לסל. אפשר לערוך כל פריט.';
    openCart();
  });
}

/* ---------- מסך הרכבה ---------- */

function builderSummaryMarkup(product, config, quantity) {
  const price = priceBreakdown(product, config, quantity);
  const base = price.rows[0];
  const extras = price.unit - base.amount;
  const count = (product.optionGroups || []).filter((group) => group.type === 'multi').reduce((sum, group) => sum + Object.keys(config.options[group.id] || {}).length, 0);
  return `<dl><div><dt>${safe(base.name)}</dt><dd><bdi>${money(base.amount * quantity)}</bdi></dd></div><div><dt>תוספות${count ? ` (${count})` : ''}</dt><dd><bdi>${money(extras * quantity)}</bdi></dd></div><div class="builder-cost__total"><dt>סה״כ${quantity > 1 ? ` · ${quantity} יח׳` : ''}</dt><dd><bdi>${money(price.total)}</bdi></dd></div></dl>`;
}

function variantSection(product, config) {
  if (!product.variants?.length || product.variants.length < 2) return '';
  return `<fieldset class="field-group"><legend class="field-group__head"><span class="field-group__title">${product.visual === 'pizza' ? 'גודל הפיצה' : 'גודל'}</span></legend>
    <div class="tile-row tile-row--3">${product.variants.map((variant) => `<label class="tile tile--size">
      <input type="radio" name="variant" value="${safe(variant.id)}" ${variant.id === config.variantId ? 'checked' : ''} ${!isAvailable(variant) ? 'disabled' : ''} />
      <span class="tile__surface">
        <strong>${safe(variant.name)}</strong>${!isAvailable(variant) ? '<small>אזל להיום</small>' : ''}
        <bdi>${money(variant.price)}</bdi>
      </span>
    </label>`).join('')}</div></fieldset>`;
}

function singleGroup(group, value) {
  const allFree = group.choices.every((choice) => Number(choice.price || 0) === 0);
  return `<fieldset class="field-group${group.visualRole === 'crust' ? ' field-group--crust' : ''}"><legend class="field-group__head"><span class="field-group__title">${safe(group.visualRole === 'crust' ? 'סוג הבצק' : group.name)}</span></legend>
    <div class="tile-row${group.visualRole === 'crust' ? ' tile-row--crust' : ''} tile-row--${Math.min(group.choices.length, 3)}">${group.choices.map((choice) => `<label class="tile tile--option${choice.crust ? ' tile--crust' : ''}">
      <input type="radio" name="opt-${safe(group.id)}" value="${safe(choice.id)}" ${choice.id === value ? 'checked' : ''} ${!isAvailable(choice) ? 'disabled' : ''} />
      <span class="tile__surface">
        <strong>${safe(choice.name)}</strong>${!isAvailable(choice) ? '<small>אזל להיום</small>' : !choice.crust && choice.detail ? `<small>${safe(choice.detail)}</small>` : ''}${allFree ? '' : `<bdi>${choice.price ? `+${money(choice.price)}` : 'כלול'}</bdi>`}
      </span>
    </label>`).join('')}</div></fieldset>`;
}

function toppingPriceMarkup(choice, placement = 'whole') {
  return choice.price ? `+${money(choicePrice(choice, placement))}` : 'כלול';
}

const placementShortLabel = (part) => part === 'right' ? 'ימין' : part === 'left' ? 'שמאל' : 'שלמה';

function multiGroup(group, value) {
  return `<fieldset class="field-group" data-option-group="${safe(group.id)}"><legend class="field-group__head"><span class="field-group__title">${safe(group.name)}</span><button type="button" class="link-button extras-clear" data-clear-group="${safe(group.id)}" ${Object.keys(value || {}).length ? '' : 'disabled'}>${icon('trash')}ניקוי</button></legend>
    <div class="extras-recovery" data-clear-recovery="${safe(group.id)}" hidden><span>התוספות נוקו</span><button type="button" class="link-button" data-undo-clear>${icon('undo')}החזרה</button></div>
    <div class="selected-extras" data-selected-extras="${safe(group.id)}" hidden></div>
    <div class="topping-grid">${group.choices.map((choice) => {
      const placement = value?.[choice.id];
      const available = isAvailable(choice);
      const alternative = !available ? alternativeFor(group, choice) : null;
      return `<div class="topping topping--compact${group.placement ? ' topping--halves' : ''}${available ? '' : ' topping--unavailable'}" data-choice="${safe(choice.id)}">
        <label class="topping__main">
          <input type="checkbox" name="multi-${safe(group.id)}" value="${safe(choice.id)}" ${placement ? 'checked' : ''} ${available ? '' : 'disabled'} />
          ${choice.shape ? `<span class="topping__art">${shapeIcon(choice.shape)}</span>` : ''}
          <span class="topping__name">${safe(choice.name)}</span>
          <span class="topping__price" data-price-for="${safe(choice.id)}">${toppingPriceMarkup(choice, placement || 'whole')}</span>
          <span class="topping__check">${icon('plus')}${icon('check')}</span>
          ${available ? '' : '<span class="topping__stock">אזל להיום</span>'}
        </label>
        ${alternative ? `<button type="button" class="topping__alternative" data-alternative-group="${safe(group.id)}" data-alternative-from="${safe(choice.id)}" data-alternative-to="${safe(alternative.id)}" aria-label="בחירת ${safe(alternative.name)} במקום ${safe(choice.name)}">אפשר במקום: ${safe(alternative.name)} ${icon('plus')}</button>` : ''}
        ${group.placement ? `<button type="button" class="topping__placement-toggle" data-placement-toggle ${available ? '' : 'disabled'} aria-expanded="false" aria-controls="placement-${safe(group.id)}-${safe(choice.id)}" aria-label="${placement ? `מיקום ${safe(choice.name)}: ${placementLabel(placement)}. שינוי מיקום` : `בחירת מיקום ${safe(choice.name)}`}"><span data-placement-label>${placement ? placementShortLabel(placement) : 'מיקום'}</span>${icon('down')}</button>
        <div class="placement" id="placement-${safe(group.id)}-${safe(choice.id)}" role="radiogroup" aria-label="איפה לשים ${safe(choice.name)}?">${['whole', 'right', 'left'].map((key) => [key, PLACEMENTS[key]]).map(([key, info]) => `<label class="placement__option">
          <input type="radio" name="place-${safe(group.id)}-${safe(choice.id)}" value="${key}" aria-label="${info.label}, ${choice.price ? money(choicePrice(choice, key)) : 'כלול'}" ${placement === key ? 'checked' : ''} ${available ? '' : 'disabled'} />
          <span aria-hidden="true">${placementIcon(key)}${key === 'whole' ? 'שלמה' : key === 'right' ? 'חצי ימין' : 'חצי שמאל'}<small><bdi>${choice.price ? `+${money(choicePrice(choice, key))}` : 'כלול'}</bdi></small></span>
        </label>`).join('')}</div>` : ''}
      </div>`;
    }).join('')}</div></fieldset>`;
}

const placementLabel = (placement) => placement === 'right' ? 'על חצי ימין' : placement === 'left' ? 'על חצי שמאל' : 'על כל הפיצה';

function closePlacement(topping) {
  topping?.classList.remove('is-editing');
  topping?.querySelector('[data-placement-toggle]')?.setAttribute('aria-expanded', 'false');
}

function readConfig(form, product) {
  const config = { productId: product.id, variantId: form.elements.variant?.value || variantsFor(product)[0].id, options: {}, note: form.elements.note.value, label: form.elements.itemName.value };
  for (const group of product.optionGroups || []) {
    if (group.type === 'single') config.options[group.id] = form.querySelector(`input[name="opt-${CSS.escape(group.id)}"]:checked`)?.value;
    else {
      config.options[group.id] = {};
      form.querySelectorAll(`input[name="multi-${CSS.escape(group.id)}"]:checked`).forEach((input) => {
        const placement = group.placement ? form.querySelector(`input[name="place-${CSS.escape(group.id)}-${CSS.escape(input.value)}"]:checked`)?.value : 'whole';
        config.options[group.id][input.value] = placement || 'whole';
      });
    }
  }
  return normalizeConfig(product, config);
}

function productPage(product, editLine, copyLine, source, returnToCheckout = false) {
  if (product.bundle) return bundlePage(product, editLine, copyLine, source, returnToCheckout);
  const list = activeProducts();
  const back = returnToCheckout ? '#/checkout' : list.length > 1 ? '#/menu' : '#/';
  let draftKey = source?.key || (editLine ? `edit:${editLine.id}` : copyLine ? `copy:${copyLine.id}` : `product:${product.id}`);
  const draft = getDraft(draftKey, product);
  let config = draft?.config || source?.config || (editLine || copyLine ? normalizeConfig(product, (editLine || copyLine).config) : defaultConfig(product));
  let quantity = draft?.qty ?? source?.qty ?? editLine?.qty ?? 1;
  let hasDraft = Boolean(draft);
  let savedScroll = draft?.scroll || 0;
  let clearedExtras = null;
  let recoveredEditId = null;
  let selectedExtraEditor = null;
  let personalOpen = draft?.personalOpen ?? false;
  let lastChange = null;
  let isAdding = false;
  const returnSuffix = returnToCheckout ? '?return=checkout' : '';
  const submitLabel = () => returnToCheckout ? editLine ? 'שמירה וחזרה לקופה' : 'הוספה וחזרה לקופה' : editLine ? 'עדכון בסל' : 'הוספה לסל';
  const isPizza = product.visual === 'pizza';
  const variantScales = variantsFor(product).length > 1 ? variantsFor(product).map((variant) => variant.scale ?? 1) : [];

  app.innerHTML = `${topbar(back)}
    <main class="builder${isPizza ? '' : ' builder--flat'}">
      <section class="stage" aria-label="התצוגה של ${safe(product.name)}">

        ${isPizza ? `<button type="button" class="stage__expand" data-expand-pizza aria-label="הגדלת תצוגת הפיצה ועריכת חצאים" aria-haspopup="dialog">${icon('expand')}</button><button type="button" class="stage__collapse" data-preview-collapse aria-label="צמצום תצוגת הפיצה" aria-expanded="true" aria-controls="stage-art">${icon('down')}</button>` : ''}
        <div class="stage__canvas">${isPizza ? '<button type="button" class="stage__view" data-preview-open aria-label="פתיחת הפיצה ועריכת חצאים" aria-haspopup="dialog"></button>' : ''}${isPizza ? '<span class="stage__flare" aria-hidden="true"></span>' : ''}<div class="stage__pizza" id="stage-art">${isPizza ? pizzaSVG(pizzaState(product, config), { rings: variantScales, label: `הדמיה של ${product.name} לפי הבחירות שלכם` }) : productArt(product, config, product.name)}</div></div>
        <div class="stage__summary"><p class="stage__title" id="stage-title"></p><p class="stage__detail" id="stage-detail"></p><div class="stage__composition" data-stage-composition></div>${isPizza ? '<p class="stage__compact" id="stage-compact"></p>' : ''}</div>
      </section>
      <form class="builder__form" id="builder-form" novalidate>
        ${orderProgress('compose', product.id)}
        <header class="builder__intro"><div class="builder__title-row"><h1>${safe(product.name)}</h1><div class="builder__about">${foodInfoMarkup(product, config, true)}</div></div>${returnToCheckout ? `<a class="builder__return" href="#/checkout">${icon('back')}חזרה לקופה</a>` : ''}${copyLine ? `<p class="builder__resume">${icon('copy')}<span>עותק חדש</span></p>` : ''}${source ? `<p class="builder__resume">${icon(source.kind === 'favorite' ? 'heart' : 'share')}<span>${safe(source.label)}</span></p>` : ''}</header>
        <p class="builder-availability" data-builder-availability role="status" hidden></p>
        <details class="builder-tools">
          <summary>${icon('heart')}<span>שמירה ושיתוף</span><small data-tools-saved hidden>שמורה</small>${icon('down')}</summary>
          <div class="builder-tools__actions">
            <button type="button" data-save-toggle aria-expanded="false" aria-controls="favorite-editor">${icon('heart')}<span data-save-label>שמירה</span></button>
            <button type="button" data-open-favorites><span>המועדפים שלי</span><span class="builder-tools__count" data-favorite-count hidden></span></button>
            <button type="button" data-share-toggle aria-expanded="false" aria-controls="share-editor">${icon('share')}<span>שיתוף</span></button>
          </div>
          <div class="builder-tools__panel" id="favorite-editor" hidden>
            <label for="favorite-name">שם להרכב</label>
            <div class="builder-tools__save"><input class="input" id="favorite-name" maxlength="40" dir="auto" value="${safe(source?.kind === 'favorite' ? source.name : 'הקבועה שלי')}" autocomplete="off" /><button type="button" class="button button--quiet button--small" data-save-favorite>שמירה</button></div>

            <p class="builder-tools__status" data-favorite-status role="status"></p>
          </div>
          <div class="builder-tools__panel" id="share-editor" hidden>
            <label for="share-link">קישור להרכב</label>
            <input class="input share-link" id="share-link" dir="ltr" type="url" readonly aria-describedby="share-hint" />
            <div class="builder-tools__share"><button type="button" class="button button--quiet button--small" data-copy-link>${icon('copy')}העתקת קישור</button>${typeof navigator.share === 'function' ? `<button type="button" class="link-button" data-native-share>${icon('share')}שיתוף</button>` : ''}</div>
            <p id="share-hint">קישור להרכב בלבד, ללא פרטים אישיים.</p>
            <p class="builder-tools__status" data-share-status role="status"></p>
          </div>
        </details>
        <div class="builder-undo" data-builder-undo hidden><span data-last-change></span><button type="button" class="link-button" data-undo-change>${icon('undo')}ביטול השינוי האחרון</button></div>
        <details class="edit-changes" data-edit-changes hidden><summary><span><strong>שינויים לפני העדכון</strong><small data-edit-change-summary></small></span>${icon('down')}</summary><ul data-edit-change-list></ul><p data-edit-change-total></p></details>
        ${variantSection(product, config)}
        ${(product.optionGroups || []).map((group) => (group.type === 'single' ? singleGroup(group, config.options[group.id]) : multiGroup(group, config.options[group.id]))).join('')}
        <div class="field-group field-group--inline builder-quantity" data-builder-quantity><span class="field-group__title" id="qty-title">כמות</span>${stepper({ value: quantity, label: 'כמות' })}</div>
        <section class="builder-cost" data-builder-summary aria-label="סיכום מחיר"></section>
        <details class="builder-personal" data-personal ${personalOpen ? 'open' : ''}>
        <summary><span><strong>שם והערה</strong><small data-personal-summary></small></span>${icon('down')}</summary>
        <div class="builder-personal__fields">
        <div class="field-group item-name-field"><label class="field-group__head" for="item-name"><span class="field-group__title">שם לפריט</span></label><input class="input" id="item-name" name="itemName" dir="auto" maxlength="40" autocomplete="off" placeholder="למשל: של הילדים" value="${safe(config.label)}" /></div>
        <div class="field-group">
          <label class="field-group__head" for="kitchen-note"><span class="field-group__title">הערה למטבח</span></label>
          <textarea class="input" id="kitchen-note" name="note" dir="auto" rows="2" maxlength="200" placeholder="למשל: לחתוך לריבועים">${safe(config.note)}</textarea>
          ${(product.notePresets || []).length ? `<div class="note-presets" role="group" aria-label="קיצורי הערות למטבח, אפשר לבחור קיצור אחד">${product.notePresets.map((note) => `<button type="button" data-note-preset="${safe(note)}" aria-pressed="false">${icon('plus')}<span>${safe(note)}</span></button>`).join('')}</div><p class="note-presets__status" data-note-status role="status"></p>` : ''}
        </div>
        </div></details>
      </form>
    </main>
    <div class="buybar buybar--builder"><p class="buybar__recovery" data-edit-recovery role="status" hidden></p><div class="buybar__inner">
      <div class="price-panel" id="price-panel" hidden><header><h2 tabindex="-1">מה כלול במחיר?</h2><button type="button" class="icon-button" data-close-price aria-label="סגירת פירוט המחיר">${icon('close')}</button></header><div data-price-content></div><section class="price-basket" data-builder-basket hidden aria-label="סכומי הסל"><button type="button" data-open-cart><span data-basket-current></span>${icon('down')}</button><p data-basket-projected></p></section><section class="price-changes" data-price-changes hidden><h3>שינויים ביחס לפריט בסל</h3><ul data-price-change-list></ul><p data-price-change-total></p></section><p>${shop.demoOnly ? 'מחירי הדגמה. ' : ''}משלוח יחושב בקופה.</p></div>
      <button type="button" class="buybar__price" data-price-toggle aria-label="פירוט המחיר" title="פירוט המחיר" aria-expanded="false" aria-controls="price-panel">${icon('receipt')}</button>
      <button type="button" id="add-to-cart" class="button button--primary buybar__cta"><span class="buybar__cta-copy"><span id="add-label"></span><span aria-hidden="true">·</span><bdi id="bar-total"></bdi></span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h3l2.5 12h11L21 6H6M9 20h.01M18 20h.01" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
    </div></div>
    <p class="visually-hidden" aria-live="polite" id="builder-status"></p>`;

  const form = document.querySelector('#builder-form');
  // שמירה ושיתוף בסוף ההרכבה, אחרי הגודל, האפשרויות, התוספות וההערה.
  form.querySelector('[data-personal]').after(form.querySelector('.builder-tools'));
  const art = document.querySelector('#stage-art');
  const status = document.querySelector('#builder-status');
  const saveToggle = form.querySelector('[data-save-toggle]');
  const shareToggle = form.querySelector('[data-share-toggle]');
  const favoriteEditor = form.querySelector('#favorite-editor');
  const shareEditor = form.querySelector('#share-editor');
  const noteInput = form.elements.note;
  const personal = form.querySelector('[data-personal]');
  const presetActive = (preset) => config.note.split('\n').some((line) => line.trim() === preset);
  const syncNotePresets = () => form.querySelectorAll('[data-note-preset]').forEach((button) => {
    const active = presetActive(button.dataset.notePreset);
    button.setAttribute('aria-pressed', String(active));
    button.querySelector('svg').outerHTML = icon(active ? 'check' : 'plus');
  });
  const syncSaved = () => {
    const match = matchingFavorite(product, config, quantity);
    saveToggle.classList.toggle('is-saved', Boolean(match));
    saveToggle.querySelector('[data-save-label]').textContent = match ? 'שמורה' : 'שמירה';
    form.querySelector('[data-tools-saved]').hidden = !match;
    const count = getFavorites().length;
    const countNode = form.querySelector('[data-favorite-count]');
    countNode.textContent = count;
    countNode.hidden = !count;
  };
  const resolveEditedLine = () => {
    const restored = recoveredEditId ? getLine(recoveredEditId) : null;
    if (!editLine && restored) {
      editLine = restored;
      recoveredEditId = null;
      clearDraft(draftKey);
      draftKey = `edit:${restored.id}`;
      saveDraft(draftKey, product, { config, qty: quantity, scroll: savedScroll, personalOpen });
      history.replaceState(null, '', `#/product/${product.id}/edit/${restored.id}${returnSuffix}`);
      const recovery = document.querySelector('[data-edit-recovery]');
      recovery.textContent = 'הפריט הוחזר לסל. אפשר להמשיך לערוך.';
      recovery.hidden = false;
      document.querySelector('#add-label').textContent = submitLabel();
    }
    const original = editLine ? getLine(editLine.id) : null;
    if (editLine && !original) {
      recoveredEditId = editLine.id;
      editLine = null;
      clearDraft(draftKey);
      draftKey = `product:${product.id}`;
      hasDraft = true;
      saveDraft(draftKey, product, { config, qty: quantity, scroll: savedScroll, personalOpen });
      history.replaceState(null, '', `#/product/${product.id}${returnSuffix}`);
      const recovery = document.querySelector('[data-edit-recovery]');
      recovery.textContent = 'הפריט הוסר מהסל. הבחירות נשמרו להוספה מחדש.';
      recovery.hidden = false;
      document.querySelector('#add-label').textContent = submitLabel();
    }
    return original;
  };
  const syncBasket = () => {
    const basket = document.querySelector('[data-builder-basket]');
    if (!basket) return;
    const count = cartCount();
    const subtotal = cartSubtotal();
    const original = resolveEditedLine();
    const projected = subtotal - (original ? lineTotal(original, product) : 0) + unitPrice(product, config) * quantity;
    basket.hidden = !count;
    basket.querySelector('[data-basket-current]').innerHTML = `בסל · ${itemsText(count)} · <bdi>${money(subtotal)}</bdi>`;
    basket.querySelector('[data-basket-projected]').innerHTML = `${editLine ? 'לאחר העדכון' : 'עם הבחירה הזו'} <strong><bdi>${money(projected)}</bdi></strong>`;
  };
  teardown.push(onFavoritesChange(syncSaved), onCartChange(syncBasket));
  let drawn = isPizza ? pizzaState(product, config) : null;
  let scrollTimer;
  const flushDraft = () => {
    clearTimeout(scrollTimer);
    if (!document.querySelector('dialog[open]')) savedScroll = window.scrollY;
    if (hasDraft && !freshBuilder) saveDraft(draftKey, product, { config, qty: quantity, scroll: savedScroll, personalOpen });
  };
  const rememberSelection = () => { hasDraft = true; flushDraft(); };
  const captureChange = (previous, previousQty = quantity) => {
    if (JSON.stringify([previous.variantId, previous.options, previousQty]) === JSON.stringify([config.variantId, config.options, quantity])) return;
    lastChange = { variantId: previous.variantId, options: structuredClone(previous.options), qty: previousQty };
  };
  personal.addEventListener('toggle', () => { personalOpen = personal.open; rememberSelection(); });
  const rememberScroll = () => {
    if (document.querySelector('dialog[open]')) return;
    savedScroll = window.scrollY;
    hasDraft = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(flushDraft, 160);
  };
  const onVisibility = () => { if (document.hidden) flushDraft(); };
  window.addEventListener('scroll', rememberScroll, { passive: true });
  window.addEventListener('pagehide', flushDraft);
  document.addEventListener('visibilitychange', onVisibility);
  teardown.push(() => {
    flushDraft();
    window.removeEventListener('scroll', rememberScroll);
    window.removeEventListener('pagehide', flushDraft);
    document.removeEventListener('visibilitychange', onVisibility);
  });

  const refresh = () => {
    const info = describe(product, config);
    form.querySelector('[data-food-content]').innerHTML = foodInfoContent(product, config);
    const unit = unitPrice(product, config);
    const total = unit * quantity;
    const issues = configurationIssues(product, config);
    const availability = form.querySelector('[data-builder-availability]');
    availability.hidden = !issues.length;
    availability.textContent = issues.length ? `אזל להיום: ${issues.map((issue) => issue.name).join(', ')}. הסירו את הבחירה או בחרו חלופה לפני ההוספה.` : '';
    document.querySelector('#add-to-cart').disabled = isAdding || Boolean(issues.length);
    const undo = form.querySelector('[data-builder-undo]');
    undo.hidden = !lastChange;
    if (lastChange) {
      const change = configurationChanges(product, { ...config, variantId: lastChange.variantId, options: lastChange.options }, config, lastChange.qty, quantity);
      undo.querySelector('[data-last-change]').textContent = change.changes.at(-1) || 'ההרכב עודכן';
    }
    const original = editLine ? getLine(editLine.id) : null;
    const change = original ? configurationChanges(product, original.config, config, original.qty, quantity) : null;
    const hasChanges = Boolean(change?.changes.length);
    form.querySelector('[data-edit-changes]').hidden = !hasChanges;
    document.querySelector('[data-price-changes]').hidden = !hasChanges;
    if (hasChanges) {
      form.querySelector('[data-edit-change-summary]').textContent = `${change.changes.length === 1 ? 'שינוי אחד' : `${change.changes.length} שינויים`} · ${priceDifference(change.delta)}`;
      const changesMarkup = change.changes.map((text) => `<li>${safe(text)}</li>`).join('');
      form.querySelector('[data-edit-change-list]').innerHTML = changesMarkup;
      document.querySelector('[data-price-change-list]').innerHTML = changesMarkup;
      const totals = `לפני <bdi>${money(change.previousTotal)}</bdi> · אחרי <bdi>${money(change.total)}</bdi>`;
      form.querySelector('[data-edit-change-total]').innerHTML = totals;
      document.querySelector('[data-price-change-total]').textContent = priceDifference(change.delta);
    }
    document.querySelector('#stage-title').textContent = [config.label, info.title, quantity > 1 ? `${quantity} יח׳` : ''].filter(Boolean).join(' · ');
    const details = isPizza ? info.extras.filter((extra) => !extra.divided).map((extra) => extra.text).join(' · ') : detailText(info);
    const stageDetail = document.querySelector('#stage-detail');
    stageDetail.textContent = details;
    stageDetail.hidden = !details;
    form.querySelectorAll('[data-clear-recovery]').forEach((node) => { node.hidden = clearedExtras?.groupIds[0] !== node.dataset.clearRecovery; });
    form.querySelectorAll('[data-clear-group]').forEach((button) => { button.disabled = !Object.keys(config.options[button.dataset.clearGroup] || {}).length; });
    for (const group of product.optionGroups || []) {
      if (group.type !== 'multi') continue;
      const node = form.querySelector(`[data-selected-extras="${CSS.escape(group.id)}"]`);
      const value = config.options[group.id];
      const editing = selectedExtraEditor?.groupId === group.id && value[selectedExtraEditor.choiceId] ? selectedExtraEditor.choiceId : null;
      const markup = selectedExtrasMarkup(group, value, editing);
      node.hidden = !Object.keys(value).length;
      if (node.innerHTML !== markup) node.innerHTML = markup;
    }
    const personalSummary = [config.label, config.note.replace(/\s+/g, ' ')].filter(Boolean).join(' · ');
    personal.querySelector('[data-personal-summary]').textContent = personalSummary || 'לא חובה';
    personal.classList.toggle('has-content', Boolean(personalSummary));
    document.querySelector('[data-stage-composition]').innerHTML = info.extras.some((extra) => extra.divided) ? compositionMarkup(info) : '';
    if (isPizza) {
      const toppingCount = info.extras.length;
      const toppingSummary = toppingCount === 0 ? 'בלי תוספות' : toppingCount === 1 ? 'תוספת אחת' : `${toppingCount} תוספות`;
      const compact = document.querySelector('#stage-compact');
      compact.textContent = toppingCount ? toppingSummary : '';
      compact.hidden = !toppingCount;
    }
    document.querySelector('#bar-total').textContent = money(total);
    document.querySelector('#add-label').textContent = submitLabel();
    document.querySelector('[data-price-toggle]').setAttribute('aria-label', `פירוט המחיר, ${money(total)}`);
    document.querySelector('[data-price-content]').innerHTML = priceMarkup(product, config, quantity);
    form.querySelector('[data-builder-summary]').innerHTML = builderSummaryMarkup(product, config, quantity);
    syncSaved();
    syncNotePresets();
    syncBasket();
    form.querySelector('#share-link').value = configurationLink(window.location.href, product, config, quantity, !product.active);
    document.querySelector('[data-builder-quantity] output').textContent = quantity;
    document.querySelector('[data-builder-quantity] [data-qty="minus"]').disabled = quantity <= 1;
    document.querySelector('[data-builder-quantity] [data-qty="plus"]').disabled = quantity >= 99;
    for (const group of product.optionGroups || []) {
      if (group.type !== 'multi') continue;
      for (const choice of group.choices) {
        const label = form.querySelector(`[data-price-for="${CSS.escape(choice.id)}"]`);
        if (label) label.innerHTML = toppingPriceMarkup(choice, config.options[group.id]?.[choice.id] || 'whole');
        const topping = label?.closest('.topping');
        const placement = config.options[group.id]?.[choice.id] || 'whole';
        const toggle = topping?.querySelector('[data-placement-toggle]');
        if (toggle) {
          toggle.querySelector('[data-placement-label]').textContent = config.options[group.id]?.[choice.id] ? placementShortLabel(placement) : 'מיקום';
          topping.querySelectorAll('.placement input').forEach((radio) => { radio.checked = config.options[group.id]?.[choice.id] === radio.value; });
          toggle.setAttribute('aria-label', config.options[group.id]?.[choice.id] ? `מיקום ${choice.name}: ${placementLabel(placement)}. שינוי מיקום` : `בחירת מיקום ${choice.name}`);
        }
      }
    }
  };

  document.querySelector('[data-builder-quantity]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-qty]');
    if (!button) return;
    const previousQty = quantity;
    quantity = Math.max(1, Math.min(99, quantity + (button.dataset.qty === 'plus' ? 1 : -1)));
    captureChange(config, previousQty);
    refresh(); rememberSelection();
    status.textContent = `כמות: ${quantity}`;
    reactToChoice(art, false);
  });

  form.addEventListener('change', (event) => {
    const previous = config;
    if (event.target.name?.startsWith('place-')) event.target.closest('.topping').querySelector('input[type="checkbox"]').checked = true;
    config = readConfig(form, product);
    captureChange(previous);
    if (isPizza) {
      const next = pizzaState(product, config);
      updatePizza(art.querySelector('svg'), drawn, next);
      drawn = next;
    }
    const target = event.target;
    if (target.name?.startsWith('multi-') || target.name?.startsWith('place-')) clearedExtras = null;
    if (target.name?.startsWith('multi-')) {
      const name = target.closest('.topping').querySelector('.topping__name').textContent;
      form.querySelectorAll('.topping.is-editing').forEach(closePlacement);
      const selectedTopping = target.closest('.topping');
      const placementControl = selectedTopping.querySelector('[data-placement-toggle]');
      if (target.checked && placementControl) {
        selectedTopping.classList.add('is-editing');
        placementControl.setAttribute('aria-expanded', 'true');
      }
      status.textContent = target.checked ? `נוסף: ${name}` : `הוסר: ${name}`;
    } else if (target.name?.startsWith('place-')) {
      const topping = target.closest('.topping');
      status.textContent = `${topping.querySelector('.topping__name').textContent}: ${target.getAttribute('aria-label')}`;
      closePlacement(topping);
      topping.querySelector('[data-placement-toggle]').focus({ preventScroll: true });
    } else if (target.name === 'variant') {
      status.textContent = `נבחר גודל ${target.closest('.tile').querySelector('strong').textContent}`;
    } else if (target.name?.startsWith('opt-')) {
      status.textContent = `נבחר ${target.closest('.tile').querySelector('strong').textContent}`;
    }
    if (previous.variantId !== config.variantId) pulse(art.querySelector('svg'));
    refresh();
    rememberSelection();
    if (target.matches('input[type="radio"], input[type="checkbox"]')) reactToChoice(art, true);
  });
  form.addEventListener('input', (event) => {
    if (event.target.name === 'note') { config = { ...config, note: event.target.value }; refresh(); rememberSelection(); }
    if (event.target.name === 'itemName') { config = normalizeConfig(product, { ...config, label: event.target.value }); refresh(); rememberSelection(); }
  });
  form.addEventListener('click', (event) => {
    if (event.target.closest('[data-undo-change]')) { setPreviewConfig(config, { type: 'undo-change' }); form.querySelector('.food-info > summary')?.focus({ preventScroll: true }); return; }
    const alternativeButton = event.target.closest('[data-alternative-group]');
    if (alternativeButton) {
      const { alternativeGroup: groupId, alternativeFrom: from, alternativeTo: to } = alternativeButton.dataset;
      const group = product.optionGroups.find((item) => item.id === groupId);
      const choice = group?.choices.find((item) => item.id === to);
      if (!choice || !isAvailable(choice)) return;
      setPreviewConfig(replaceExtra(product, config, groupId, from, to));
      status.textContent = `נבחרה חלופה: ${choice.name}`;
      return;
    }
    const selected = event.target.closest('[data-selected-extras]');
    if (selected) {
      const groupId = selected.dataset.selectedExtras;
      const edit = event.target.closest('[data-extra-edit]');
      const remove = event.target.closest('[data-extra-remove]');
      const placement = event.target.closest('[data-quick-placement]');
      if (edit) {
        selectedExtraEditor = selectedExtraEditor?.groupId === groupId && selectedExtraEditor.choiceId === edit.dataset.extraEdit ? null : { groupId, choiceId: edit.dataset.extraEdit };
        refresh();
        (selected.querySelector('[data-quick-placement][aria-pressed="true"]') || selected.querySelector(`[data-extra-edit="${CSS.escape(edit.dataset.extraEdit)}"]`))?.focus({ preventScroll: true });
        return;
      }
      if (remove || placement) {
        const choiceId = remove?.dataset.extraRemove || selectedExtraEditor?.choiceId;
        if (!choiceId) return;
        const options = structuredClone(config.options);
        const name = product.optionGroups.find((group) => group.id === groupId).choices.find((choice) => choice.id === choiceId).name;
        if (remove) { delete options[groupId][choiceId]; selectedExtraEditor = null; }
        else options[groupId][choiceId] = placement.dataset.quickPlacement;
        setPreviewConfig({ ...config, options });
        status.textContent = remove ? `הוסר: ${name}` : `${name}: ${PLACEMENTS[placement.dataset.quickPlacement].label}`;
        (placement ? selected.querySelector('[data-quick-placement][aria-pressed="true"]') : selected.querySelector('[data-extra-edit], [data-extra-remove]') || form.querySelector(`[data-clear-group="${CSS.escape(groupId)}"]`))?.focus({ preventScroll: true });
        return;
      }
      if (event.target.closest('[data-close-extra]')) {
        const choiceId = selectedExtraEditor.choiceId;
        selectedExtraEditor = null; refresh();
        selected.querySelector(`[data-extra-edit="${CSS.escape(choiceId)}"]`)?.focus({ preventScroll: true });
        return;
      }
    }
    const clear = event.target.closest('[data-clear-group]');
    if (clear) { setPreviewConfig(config, { type: 'clear', groupId: clear.dataset.clearGroup }); form.querySelector(`[data-clear-recovery="${CSS.escape(clear.dataset.clearGroup)}"] [data-undo-clear]`)?.focus({ preventScroll: true }); return; }
    if (event.target.closest('[data-undo-clear]')) { const groupId = clearedExtras?.groupIds[0]; setPreviewConfig(config, { type: 'undo-clear' }); if (groupId) form.querySelector(`[data-clear-group="${CSS.escape(groupId)}"]`)?.focus({ preventScroll: true }); return; }
    const preset = event.target.closest('[data-note-preset]');
    if (preset) {
      const note = preset.dataset.notePreset;
      const removing = presetActive(note);
      const lines = config.note.split('\n');
      const remaining = lines.filter((line) => removing ? line.trim() !== note : !(product.notePresets || []).includes(line.trim())).join('\n').trim();
      const value = removing ? remaining : [remaining, note].filter(Boolean).join('\n');
      const hint = form.querySelector('[data-note-status]');
      if (value.length > noteInput.maxLength) { hint.textContent = 'ההערה ארוכה מדי. קצרו אותה ואז הוסיפו את הקיצור.'; return; }
      hint.textContent = '';
      noteInput.value = value;
      config = { ...config, note: value };
      refresh(); rememberSelection();
      status.textContent = removing ? `הוסר מההערה: ${note}` : `נוסף להערה: ${note}`;
      return;
    }
    if (event.target.matches('.placement input')) {
      const topping = event.target.closest('.topping');
      closePlacement(topping);
      topping.querySelector('[data-placement-toggle]').focus({ preventScroll: true });
      return;
    }
    const placementToggle = event.target.closest('[data-placement-toggle]');
    if (placementToggle) {
      const topping = placementToggle.closest('.topping');
      const open = !topping.classList.contains('is-editing');
      form.querySelectorAll('.topping.is-editing').forEach(closePlacement);
      if (open) {
        topping.classList.add('is-editing');
        placementToggle.setAttribute('aria-expanded', 'true');
      }
      return;
    }
  });

  const toggleTools = (kind) => {
    const panel = kind === 'save' ? favoriteEditor : shareEditor;
    const toggle = kind === 'save' ? saveToggle : shareToggle;
    const opening = panel.hidden;
    favoriteEditor.hidden = true; shareEditor.hidden = true;
    saveToggle.setAttribute('aria-expanded', 'false'); shareToggle.setAttribute('aria-expanded', 'false');
    if (opening) {
      panel.hidden = false; toggle.setAttribute('aria-expanded', 'true');
      if (kind === 'save') {
        const match = matchingFavorite(product, config, quantity);
        if (match) form.querySelector('#favorite-name').value = match.name;
        form.querySelector('#favorite-name').focus({ preventScroll: true });
      }
    }
  };
  saveToggle.addEventListener('click', () => toggleTools('save'));
  shareToggle.addEventListener('click', () => toggleTools('share'));
  form.querySelector('[data-save-favorite]').addEventListener('click', () => {
    const result = saveFavorite(product, { name: form.querySelector('#favorite-name').value, config, qty: quantity });
    form.querySelector('[data-favorite-status]').textContent = !result.ok ? 'אפשר לשמור עד 12 הרכבים. פתחו את המועדפים כדי לפנות מקום.' : result.persisted ? 'נשמר במועדפים שלכם. אפשר לחזור אליו גם בביקור הבא.' : 'האחסון במכשיר חסום. ההרכב נשמר רק כל עוד העמוד הזה פתוח.';
  });
  form.querySelector('[data-copy-link]').addEventListener('click', async () => {
    const input = form.querySelector('#share-link');
    const message = form.querySelector('[data-share-status]');
    try { await navigator.clipboard.writeText(input.value); message.textContent = 'הקישור הועתק. אפשר לשלוח למי שמזמין איתכם.'; }
    catch { input.focus({ preventScroll: true }); input.select(); message.textContent = 'העתקה אוטומטית אינה זמינה. הקישור מסומן להעתקה ידנית.'; }
  });
  form.querySelector('[data-native-share]')?.addEventListener('click', async () => {
    try { await navigator.share({ title: `ההרכב שלי · ${product.name}`, url: form.querySelector('#share-link').value }); }
    catch (error) { if (error.name !== 'AbortError') form.querySelector('[data-share-status]').textContent = 'השיתוף לא נפתח. אפשר להעתיק את הקישור.'; }
  });
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && event.target.closest('.selected-extras__editor')) {
      event.preventDefault();
      const { groupId, choiceId } = selectedExtraEditor;
      selectedExtraEditor = null; refresh();
      form.querySelector(`[data-selected-extras="${CSS.escape(groupId)}"] [data-extra-edit="${CSS.escape(choiceId)}"]`)?.focus({ preventScroll: true });
    }
    if (event.key === 'Enter' && event.target.id === 'favorite-name') { event.preventDefault(); form.querySelector('[data-save-favorite]').click(); }
    if (event.key === 'Escape' && (!favoriteEditor.hidden || !shareEditor.hidden)) { const toggle = favoriteEditor.hidden ? shareToggle : saveToggle; favoriteEditor.hidden = true; shareEditor.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus({ preventScroll: true }); }
    else if (event.key === 'Escape' && event.target.closest('.builder-tools')) { const tools = form.querySelector('.builder-tools'); tools.open = false; tools.querySelector('summary').focus({ preventScroll: true }); }
  });
  form.addEventListener('submit', (event) => event.preventDefault());

  const setPreviewConfig = (nextConfig, action = {}) => {
    const previous = config;
    const previousQty = quantity;
    const undoing = action.type === 'undo-change' && lastChange;
    if (undoing) {
      config = normalizeConfig(product, { ...config, variantId: lastChange.variantId, options: lastChange.options });
      quantity = lastChange.qty;
      lastChange = null; clearedExtras = null; selectedExtraEditor = null;
    } else if (action.type === 'clear') {
      const groupIds = (product.optionGroups || []).filter((group) => group.type === 'multi' && (!action.groupId || group.id === action.groupId)).map((group) => group.id);
      clearedExtras = { groupIds, options: structuredClone(config.options) };
      config = clearExtras(product, config, action.groupId);
    } else if (action.type === 'undo-clear' && clearedExtras) {
      const options = { ...config.options };
      for (const id of clearedExtras.groupIds) options[id] = clearedExtras.options[id];
      config = normalizeConfig(product, { ...config, options });
      clearedExtras = null;
    } else { config = normalizeConfig(product, nextConfig); clearedExtras = null; }
    if (!undoing) captureChange(previous, previousQty);
    form.querySelectorAll('input[name="variant"]').forEach((input) => { input.checked = input.value === config.variantId; });
    for (const group of product.optionGroups || []) {
      if (group.type === 'single') { form.querySelectorAll(`input[name="opt-${CSS.escape(group.id)}"]`).forEach((input) => { input.checked = input.value === config.options[group.id]; }); continue; }
      for (const choice of group.choices) {
        const checkbox = form.querySelector(`input[name="multi-${CSS.escape(group.id)}"][value="${CSS.escape(choice.id)}"]`);
        checkbox.checked = Boolean(config.options[group.id]?.[choice.id]);
        const placement = config.options[group.id]?.[choice.id] || 'whole';
        const radio = form.querySelector(`input[name="place-${CSS.escape(group.id)}-${CSS.escape(choice.id)}"][value="${placement}"]`);
        if (radio) radio.checked = true;
        closePlacement(checkbox.closest('.topping'));
      }
    }
    if (isPizza) {
      const next = pizzaState(product, config);
      updatePizza(art.querySelector('svg'), drawn, next);
      drawn = next;
    }
    refresh();
    rememberSelection();
    status.textContent = `${undoing ? 'השינוי האחרון בוטל' : action.type === 'clear' ? 'התוספות נוקו' : action.type === 'undo-clear' ? 'התוספות הוחזרו' : 'הבחירות עודכנו'}, סה״כ ${money(unitPrice(product, config) * quantity)}`;
    return { config, quantity, canUndo: Boolean(lastChange), canUndoClear: Boolean(clearedExtras) };
  };
  document.querySelector('[data-expand-pizza]')?.addEventListener('click', () => openPizzaPreview(product, config, quantity, setPreviewConfig, Boolean(clearedExtras), Boolean(lastChange)));

  const priceToggle = document.querySelector('[data-price-toggle]');
  const pricePanel = document.querySelector('#price-panel');
  const closePrice = () => { pricePanel.hidden = true; priceToggle.setAttribute('aria-expanded', 'false'); };
  priceToggle.addEventListener('click', () => { pricePanel.hidden = !pricePanel.hidden; priceToggle.setAttribute('aria-expanded', String(!pricePanel.hidden)); if (!pricePanel.hidden) pricePanel.querySelector('h2').focus({ preventScroll: true }); });
  pricePanel.querySelector('[data-close-price]').addEventListener('click', () => { closePrice(); priceToggle.focus({ preventScroll: true }); });
  const closeOutside = (event) => { if (!event.target.closest('.buybar')) closePrice(); };
  const closeOnEscape = (event) => { if (event.key === 'Escape' && !pricePanel.hidden) { closePrice(); priceToggle.focus({ preventScroll: true }); } };
  document.addEventListener('click', closeOutside);
  document.addEventListener('keydown', closeOnEscape);
  teardown.push(() => { document.removeEventListener('click', closeOutside); document.removeEventListener('keydown', closeOnEscape); });

  document.querySelector('#add-to-cart').addEventListener('click', async (event) => {
    if (isAdding || configurationIssues(product, config).length) return;
    const button = event.currentTarget;
    isAdding = true;
    button.disabled = true;
    closePrice();
    config = readConfig(form, product);
    resolveEditedLine();
    const updated = Boolean(editLine);
    let line;
    if (editLine) {
      updateLine(editLine.id, { config, qty: quantity });
      line = getLine(editLine.id);
      editLine = null;
    } else line = addLine(config, quantity);
    if (!line) { isAdding = false; refresh(); return; }
    recoveredEditId = null;
    clearedExtras = null;
    lastChange = null;
    document.querySelector('[data-edit-recovery]').hidden = true;
    clearDraft(draftKey);
    draftKey = `product:${product.id}`;
    hasDraft = false;
    if (returnToCheckout) {
      checkout.updatedLine = line.id;
      window.location.hash = '#/checkout';
      return;
    }
    history.replaceState(null, '', `#/product/${product.id}`);
    refresh();
    const route = window.location.hash;
    try { await flyToCart(art); } finally { isAdding = false; button.disabled = false; }
    if (art.isConnected && window.location.hash === route) openAdded(line, updated);
  });

  if (isPizza) teardown.push(setupStage(document.querySelector('.stage')));
  refresh();
  return savedScroll;
}

function pulse(element) {
  if (reducedMotion.matches) return;
  element.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
}

function reactToChoice(art, visualChange) {
  if (reducedMotion.matches) return;
  const total = document.querySelector('#bar-total');
  const label = document.querySelector('#add-label');
  for (const element of [total, label]) {
    element.getAnimations().forEach((animation) => animation.cancel());
    element.animate([
      { transform: 'translateY(3px)', opacity: .72 },
      { transform: 'translateY(0)', opacity: 1 },
    ], { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  if (!visualChange) return;
  const flare = art.closest('.stage')?.querySelector('.stage__flare');
  if (!flare) return;
  flare.getAnimations().forEach((animation) => animation.cancel());
  flare.animate([
    { opacity: 0, transform: 'scale(.82)' },
    { opacity: .75, transform: 'scale(1)', offset: .35 },
    { opacity: 0, transform: 'scale(1.12)' },
  ], { duration: 590, easing: 'cubic-bezier(.16,1,.3,1)' });
  const dot = art.closest('.stage').querySelector('.stage__live-dot');
  if (dot) {
    dot.getAnimations().forEach((animation) => animation.cancel());
    dot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
}

// במובייל הפיצה צפה מעל פעולת ההוספה; בדסקטופ היא נשארת בטור שלה.
function setupStage(stage) {
  return setupFloatingPreview(stage);
}

function flyToCart(source) {
  const target = document.querySelector('.topbar .cart-button');
  const graphic = source.querySelector('svg, img, .art-placeholder');
  if (reducedMotion.matches || !target || !graphic || !graphic.animate) return Promise.resolve();
  const from = graphic.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const ghost = graphic.cloneNode(true);
  ghost.classList.add('fly-ghost');
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.append(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.max(0.06, 28 / from.width);
  const flight = ghost.animate([
    { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 40}px) scale(${Math.max(scale, 0.45)}) rotate(-120deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(-240deg)`, opacity: 0.2 },
  ], { duration: 520, easing: 'cubic-bezier(.55,0,.25,1)' });
  return flight.finished.catch(() => {}).then(() => {
    ghost.remove();
    if (target.isConnected) target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
  });
}

/* ---------- תצוגת הפיצה המוגדלת ---------- */

const pizzaPreview = document.createElement('dialog');
pizzaPreview.className = 'pizza-preview';
pizzaPreview.setAttribute('aria-labelledby', 'pizza-preview-title');
document.body.append(pizzaPreview);
let previewReturnPosition = null;
let previewReturnRoute = '';
let previewEditor = null;

function previewChoiceMarkup(group, choice) {
  const available = isAvailable(choice);
  const alternative = !available ? alternativeFor(group, choice) : null;
  return `<div class="preview-choice-item"><button type="button" class="preview-choice" data-preview-group="${safe(group.id)}" data-preview-choice="${safe(choice.id)}" ${available ? '' : 'disabled'} aria-pressed="false">${choice.shape ? `<span class="preview-choice__art">${shapeIcon(choice.shape)}</span>` : ''}<span class="preview-choice__text"><strong>${safe(choice.name)}</strong><small data-preview-detail></small></span><span class="preview-choice__check">${icon('check')}</span></button>${alternative ? `<button type="button" class="preview-alternative" data-preview-alternative="${safe(alternative.id)}" data-preview-group="${safe(group.id)}" data-preview-from="${safe(choice.id)}">אפשר במקום: ${safe(alternative.name)}</button>` : ''}</div>`;
}

function openPizzaPreview(product, config, quantity, onChange, canUndoClear = false, canUndo = false) {
  previewReturnPosition = { top: window.scrollY, left: window.scrollX };
  previewReturnRoute = window.location.hash;
  previewEditor = { product, config: normalizeConfig(product, config), quantity, onChange, scope: 'whole', canUndoClear, canUndo };
  const selection = describe(product, config);
  const state = { ...pizzaState(product, config), scale: 1 };
  const groups = (product.optionGroups || []).filter((group) => group.type === 'multi' && group.placement);
  pizzaPreview.innerHTML = `<div class="pizza-preview__shell">
    <header class="pizza-preview__head"><h2 id="pizza-preview-title">${config.label ? `<bdi>${safe(config.label)}</bdi> · ` : ''}${safe(selection.title)}${quantity > 1 ? ` · ${quantity} יח׳` : ''}</h2><button type="button" class="icon-button" data-close-preview aria-label="סגירת תצוגת הפיצה">${icon('close')}</button></header>

    <div class="pizza-preview__art" data-scope="whole">${pizzaSVG(state, { label: `הדמיה מוגדלת של ${safe(product.name)} לפי הבחירות שלכם`, editable: groups.length > 0 })}
      ${groups.length ? `<div class="pizza-preview__hitareas"><button type="button" data-preview-scope="right" aria-label="עריכת חצי ימין" aria-pressed="false"></button><button type="button" data-preview-scope="left" aria-label="עריכת חצי שמאל" aria-pressed="false"></button></div>` : ''}
    </div>
    ${groups.length ? `<div class="pizza-preview__scope" role="group" aria-label="איזה חלק של הפיצה עורכים?">${Object.entries(PLACEMENTS).map(([key, value]) => `<button type="button" data-preview-scope="${key}" aria-label="${value.label}" aria-pressed="${key === 'whole'}">${placementIcon(key)}${key === 'whole' ? 'שלמה' : key === 'right' ? 'ימין' : 'שמאל'}</button>`).join('')}</div>
    <div class="pizza-preview__options"><div class="half-actions"><button type="button" data-copy-half>${icon('copy')}<span data-copy-half-label></span></button><button type="button" data-swap-halves>${icon('swap')}החלפת צדדים</button></div><div class="preview-clear"><button type="button" data-preview-clear>ניקוי תוספות</button><button type="button" data-preview-undo-clear hidden>${icon('undo')}החזרת התוספות</button><button type="button" data-preview-undo-change hidden>${icon('undo')}ביטול השינוי האחרון</button></div>${groups.map((group) => `<fieldset><legend class="visually-hidden">${safe(group.name)}</legend><div class="preview-choices">${group.choices.map((choice) => previewChoiceMarkup(group, choice)).join('')}</div></fieldset>`).join('')}<div class="preview-composition" data-preview-description></div></div>` : ''}
    <footer class="pizza-preview__foot">${groups.length ? '' : '<div data-preview-description></div>'}<details class="preview-price"><summary aria-label="פירוט מחיר הפיצה"><bdi data-preview-total></bdi><span>פירוט מחיר ${icon('down')}</span></summary><div data-preview-price></div></details><button type="button" class="button pizza-preview__return" data-close-preview>חזרה לבחירות ${icon('back')}</button></footer>
    <p class="visually-hidden" aria-live="polite" data-preview-status></p>
  </div>`;
  refreshPizzaPreview();
  pizzaPreview.showModal();
  pizzaPreview.querySelector('[data-close-preview]').focus({ preventScroll: true });
}

function refreshPizzaPreview() {
  if (!previewEditor) return;
  const { product, config, quantity, scope } = previewEditor;
  const selection = describe(product, config);
  pizzaPreview.querySelector('#pizza-preview-title').textContent = [config.label, selection.title, quantity > 1 ? `${quantity} יח׳` : ''].filter(Boolean).join(' · ');
  pizzaPreview.querySelector('[data-preview-description]').innerHTML = compositionMarkup(selection);
  pizzaPreview.querySelector('[data-preview-total]').textContent = money(unitPrice(product, config) * quantity);
  pizzaPreview.querySelector('[data-preview-price]').innerHTML = priceMarkup(product, config, quantity);
  pizzaPreview.querySelector('.pizza-preview__art').dataset.scope = scope;
  pizzaPreview.querySelectorAll('[data-preview-scope]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.previewScope === scope)));
  const copy = pizzaPreview.querySelector('[data-copy-half]');
  if (copy) {
    const from = scope === 'left' ? 'right' : 'left';
    const label = scope === 'whole' ? 'בחרו חצי להעתקה' : scope === 'left' ? 'כמו בחצי ימין' : 'כמו בחצי שמאל';
    copy.querySelector('[data-copy-half-label]').textContent = label;
    copy.disabled = scope === 'whole' || JSON.stringify(copyHalf(product, config, from).options) === JSON.stringify(config.options);
    copy.setAttribute('aria-label', scope === 'whole' ? label : scope === 'left' ? 'העתקת תוספות מימין לשמאל' : 'העתקת תוספות משמאל לימין');
    pizzaPreview.querySelector('[data-swap-halves]').disabled = JSON.stringify(swapHalves(product, config).options) === JSON.stringify(config.options);
    pizzaPreview.querySelector('[data-preview-clear]').disabled = !(product.optionGroups || []).some((group) => group.type === 'multi' && Object.keys(config.options[group.id] || {}).length);
    pizzaPreview.querySelector('[data-preview-undo-clear]').hidden = !previewEditor.canUndoClear;
    pizzaPreview.querySelector('[data-preview-undo-change]').hidden = !previewEditor.canUndo;
  }
  pizzaPreview.querySelectorAll('[data-preview-choice]').forEach((button) => {
    const group = product.optionGroups.find((item) => item.id === button.dataset.previewGroup);
    const choice = group.choices.find((item) => item.id === button.dataset.previewChoice);
    const placement = config.options[group.id]?.[choice.id];
    const selected = placement === 'whole' || placement === scope;
    const price = choicePrice(choice, placement || scope);
    button.setAttribute('aria-pressed', String(Boolean(selected)));
    button.setAttribute('aria-label', `${choice.name}, ${!isAvailable(choice) ? 'אזל להיום' : `${PLACEMENTS[scope].label}, ${selected ? 'נבחרה. הסרה מהחלק הזה' : 'הוספה לחלק הזה'}`}`);
    button.querySelector('[data-preview-detail]').textContent = !isAvailable(choice) ? 'אזל להיום' : placement ? `${PLACEMENTS[placement].label} · ${price ? money(price) : 'כלול'}` : price ? `+${money(price)}` : 'כלול';
  });
}

function applyPreviewChange(next, action = {}) {
  const { product, config, onChange } = previewEditor;
  const result = onChange(next, action);
  updatePizza(pizzaPreview.querySelector('.pizza'), { ...pizzaState(product, config), scale: 1 }, { ...pizzaState(product, result.config), scale: 1 });
  previewEditor.config = result.config;
  previewEditor.canUndoClear = result.canUndoClear;
  previewEditor.canUndo = result.canUndo;
  previewEditor.quantity = result.quantity;
  refreshPizzaPreview();
  pizzaPreview.querySelector('[data-preview-status]').textContent = `${action.type === 'clear' ? 'התוספות נוקו' : action.type === 'undo-clear' ? 'התוספות הוחזרו' : action.type === 'swap' ? 'התוספות החליפו צדדים' : action.type === 'copy' ? 'התוספות הועתקו לחצי הנבחר' : 'הבחירות עודכנו'}. סה״כ ${money(unitPrice(product, result.config) * previewEditor.quantity)}`;
}

pizzaPreview.addEventListener('click', (event) => {
  if (event.target === pizzaPreview || event.target.closest('[data-close-preview]')) { pizzaPreview.close(); return; }
  if (!previewEditor) return;
  const scopeButton = event.target.closest('[data-preview-scope]');
  if (scopeButton) { previewEditor.scope = scopeButton.dataset.previewScope; refreshPizzaPreview(); return; }
  const { product, scope, config } = previewEditor;
  if (event.target.closest('[data-copy-half]')) { applyPreviewChange(copyHalf(product, config, scope === 'left' ? 'right' : 'left'), { type: 'copy' }); return; }
  if (event.target.closest('[data-swap-halves]')) { applyPreviewChange(swapHalves(product, config), { type: 'swap' }); return; }
  if (event.target.closest('[data-preview-clear]')) { applyPreviewChange(config, { type: 'clear' }); pizzaPreview.querySelector('[data-preview-undo-clear]').focus({ preventScroll: true }); return; }
  if (event.target.closest('[data-preview-undo-clear]')) { applyPreviewChange(config, { type: 'undo-clear' }); pizzaPreview.querySelector('[data-preview-clear]').focus({ preventScroll: true }); return; }
  if (event.target.closest('[data-preview-undo-change]')) { applyPreviewChange(config, { type: 'undo-change' }); pizzaPreview.querySelector('[data-preview-clear]').focus({ preventScroll: true }); return; }
  const alternativeButton = event.target.closest('[data-preview-alternative]');
  if (alternativeButton) {
    const group = product.optionGroups.find((item) => item.id === alternativeButton.dataset.previewGroup);
    const choice = group?.choices.find((item) => item.id === alternativeButton.dataset.previewAlternative);
    if (!choice || !isAvailable(choice)) return;
    const next = replaceExtra(product, config, group.id, alternativeButton.dataset.previewFrom, choice.id, scope);
    applyPreviewChange(next);
    return;
  }
  const choiceButton = event.target.closest('[data-preview-choice]');
  if (!choiceButton || choiceButton.disabled) return;
  const next = normalizeConfig(product, config);
  const choices = next.options[choiceButton.dataset.previewGroup];
  const id = choiceButton.dataset.previewChoice;
  const current = choices[id];
  if (scope === 'whole') {
    if (current === 'whole') delete choices[id];
    else choices[id] = 'whole';
  } else if (current === 'whole') choices[id] = scope === 'right' ? 'left' : 'right';
  else if (current === scope) delete choices[id];
  else choices[id] = current ? 'whole' : scope;
  applyPreviewChange(next);
});
pizzaPreview.addEventListener('close', () => {
  previewEditor = null;
  if (!previewReturnPosition) return;
  const position = previewReturnPosition;
  previewReturnPosition = null;
  if (window.location.hash === previewReturnRoute) window.scrollTo({ ...position, behavior: 'instant' });
});

/* ---------- אישור הוספה ---------- */

const added = document.createElement('dialog');
added.className = 'add-confirm';
added.setAttribute('aria-labelledby', 'added-title');
document.body.append(added);
let addedProduct = null;

function openAdded(line, updated) {
  const product = findProduct(line.config.productId);
  const selection = describe(product, line.config);
  addedProduct = product;
  added.innerHTML = `<div class="add-confirm__panel"><header><span class="add-confirm__check">${icon('check')}</span><h2 id="added-title">${updated ? 'עודכן בסל' : 'נוסף לסל'}</h2><button type="button" class="icon-button" data-close-added aria-label="סגירת אישור ההוספה">${icon('close')}</button></header>
    <div class="add-confirm__product"><div class="add-confirm__art">${productArt(product, line.config)}</div><div>${itemLabelMarkup(line.config.label)}<h3>${safe(selection.title)}</h3>${compositionMarkup(selection)}<strong><bdi>${money(lineTotal(line, product))}</bdi><span> · ${line.qty} יח׳</span></strong></div></div>
    <div class="add-confirm__actions"><button type="button" class="button button--primary" data-added-cart>לסל ${icon('box')}</button><button type="button" class="button button--quiet" data-added-more>${product.visual === 'pizza' ? 'עוד פיצה' : 'עוד מוצר'} ${icon('plus')}</button></div>
  </div>`;
  added.showModal();
  added.querySelector('[data-added-cart]').focus({ preventScroll: true });
}

function freshProduct() {
  freshBuilder = true;
  const products = activeProducts();
  const route = getRoute();
  if (route.page === 'product') clearDraft(`product:${route.id}`);
  if (addedProduct) clearDraft(`product:${addedProduct.id}`);
  if (products.length === 1) clearDraft(`product:${products[0].id}`);
  const href = productHref();
  if (window.location.hash === href) navigate();
  else window.location.hash = href;
}

added.addEventListener('click', (event) => {
  if (event.target === added || event.target.closest('[data-close-added]')) { added.close(); return; }
  if (event.target.closest('[data-added-cart]')) { added.close(); openCart(); }
  if (event.target.closest('[data-added-more]')) { added.close(); freshProduct(); }
});

/* ---------- סל ---------- */

const sheet = document.createElement('dialog');
sheet.className = 'sheet';
sheet.setAttribute('aria-labelledby', 'cart-title');
document.body.append(sheet);

const cartExpanded = new Set();

function cartLineMarkup(line, compact = false) {
  const product = findProduct(line.config.productId);
  const info = describe(product, line.config);
  const extrasSummary = info.extras.length === 1 ? 'תוספת אחת' : `${info.extras.length} תוספות`;
  const issues = lineIssues(line);
  return `<li class="cart-line" data-line="${safe(line.id)}">
    <span class="cart-line__art">${productArt(product, line.config)}</span>
    <div class="cart-line__body">
      ${itemLabelMarkup(line.config.label)}<h3>${safe(info.title)}</h3>
      ${issues.length ? `<p class="cart-line__unavailable">צריך לעדכן: ${safe(issues.join(', '))}</p>` : ''}
    </div>
    <div class="cart-line__side"><bdi class="cart-line__price" data-line-price>${money(lineTotal(line, product))}</bdi>${stepper({ value: line.qty, label: `כמות: ${line.config.label || info.title}`, attr: 'data-line-qty', small: true })}</div>
    ${compact ? `<details class="cart-line__details cart-line__disclosure" data-cart-composition="${safe(line.id)}" ${cartExpanded.has(line.id) ? 'open' : ''}><summary aria-label="פירוט ההרכב: ${safe(line.config.label || info.title)}"><span>פירוט ההרכב${info.extras.length ? ` · ${extrasSummary}` : ''}${line.config.note ? ' והערה' : ''}</span>${icon('down')}</summary>` : '<div class="cart-line__details">'}${compositionMarkup(info)}${line.config.note ? `<p class="cart-line__note">הערה: <bdi>${safe(line.config.note)}</bdi></p>` : ''}${compact ? '</details>' : '</div>'}
    <div class="cart-line__actions"><a class="cart-action" href="#/product/${safe(product.id)}/edit/${safe(line.id)}" data-close-sheet aria-label="עריכת ${safe(line.config.label || info.title)}" title="עריכה">${icon('edit')}</a><a class="cart-action" href="#/product/${safe(product.id)}/copy/${safe(line.id)}" data-copy-line="${safe(line.id)}" data-close-sheet aria-label="שכפול ושינוי ${safe(line.config.label || info.title)}" title="שכפול ושינוי">${icon('copy')}</a><button type="button" class="cart-action cart-action--remove" data-remove aria-label="הסרת ${safe(line.config.label || info.title)} מהסל" title="הסרה">${icon('trash')}</button></div>
  </li>`;
}

function renderCart() {
  const cart = getCart();
  const count = cartCount();
  const removed = lastRemovedLine();
  const removedTitle = removed ? removed.config.label || describe(findProduct(removed.config.productId), removed.config).title : '';
  sheet.innerHTML = `<div class="sheet__panel">
    <header class="sheet__head"><h2 id="cart-title">הסל שלכם</h2><span class="sheet__count" data-sheet-count>${count ? itemsText(count) : ''}</span><button type="button" class="icon-button" data-close-sheet aria-label="סגירת הסל">${icon('close')}</button>${orderProgress('cart')}</header>
    ${removed ? `<div class="cart-undo" role="status"><span>הפריט הוסר <bdi>${safe(removedTitle)}</bdi></span><button type="button" class="link-button" data-undo-remove>${icon('undo')}החזרה</button></div>` : ''}
    ${cart.length ? `<ul class="cart-lines${cart.length >= 3 ? ' cart-lines--compact' : ''}">${cart.map((line) => cartLineMarkup(line, true)).join('')}</ul>
      <div data-cart-offer>${cartOfferMarkup()}</div>
      <footer class="sheet__foot">
        <div class="sheet__subtotal"><span>סכום ביניים</span><strong data-sheet-subtotal>${money(cartSubtotal())}</strong></div>
        ${checkout.mode === 'delivery' ? '<p class="sheet__hint">משלוח יחושב בקופה</p>' : ''}
        <a class="button button--primary" href="#/checkout" data-close-sheet><span>לפרטים ותשלום</span>${icon('forward')}</a>
        <a class="button button--quiet" href="${productHref()}" data-fresh-product>להוסיף עוד</a>
      </footer>`
    : `<div class="empty-state">
        <svg class="empty-state__art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 7"/><path d="M60 60 60 10A50 50 0 0 1 103.3 35Z" fill="currentColor" opacity=".18"/></svg>
        <p><strong>הסל ריק</strong></p>
        <a class="button button--primary" href="${productHref()}" data-close-sheet><span>מרכיבים פיצה</span>${icon('forward')}</a>
      </div>`}
  </div>`;
}

function cartOfferMarkup() {
  const offer = complementarySuggestion(getCart(), activeProducts());
  if (!offer) return '';
  return `<section class="cart-offer" aria-labelledby="cart-offer-title"><span class="cart-offer__art">${productArt(offer.product, offer.config)}</span><div><h3 id="cart-offer-title">להוסיף משהו ליד?</h3><p>${safe(offer.product.name)} · <bdi>${money(offer.price)}</bdi>${shop.demoOnly ? '<small>מחיר לדוגמה</small>' : ''}</p></div><button type="button" class="button button--quiet button--small" data-add-complement="${safe(offer.product.id)}" aria-label="הוספת ${safe(offer.product.name)} לסל ב־${money(offer.price)}">הוספה ${icon('plus')}</button></section>`;
}

function openCart() {
  renderCart();
  if (!sheet.open) sheet.showModal();
  sheet.querySelector('.sheet__foot .button, .empty-state .button')?.focus();
}

sheet.addEventListener('click', (event) => {
  const complement = event.target.closest('[data-add-complement]');
  if (complement) {
    const offer = complementarySuggestion(getCart(), activeProducts());
    if (!offer || offer.product.id !== complement.dataset.addComplement) { renderCart(); return; }
    complement.disabled = true;
    const line = addLine(offer.config, 1);
    sheet.querySelector(`[data-line="${CSS.escape(line.id)}"] .cart-line__actions a`)?.focus();
    return;
  }
  if (event.target.closest('[data-undo-remove]')) { undoRemoveLine(); return; }
  if (event.target.closest('[data-fresh-product]')) { event.preventDefault(); sheet.close(); freshProduct(); return; }
  const copy = event.target.closest('[data-copy-line]');
  if (copy) clearDraft(`copy:${copy.dataset.copyLine}`);
  if (event.target === sheet || event.target.closest('[data-close-sheet]')) { sheet.close(); return; }
  const lineNode = event.target.closest('[data-line]');
  if (!lineNode) return;
  const line = getLine(lineNode.dataset.line);
  if (event.target.closest('[data-remove]')) {
    if (lineNode.classList.contains('is-leaving')) return;
    lineNode.classList.add('is-leaving');
    setTimeout(() => removeLine(line.id), reducedMotion.matches ? 0 : 220);
    return;
  }
  const qtyButton = event.target.closest('[data-line-qty]');
  if (qtyButton) updateLine(line.id, { qty: line.qty + (qtyButton.dataset.lineQty === 'plus' ? 1 : -1) });
});

sheet.addEventListener('toggle', (event) => {
  const id = event.target.dataset?.cartComposition;
  if (id) event.target.open ? cartExpanded.add(id) : cartExpanded.delete(id);
}, true);

document.addEventListener('click', (event) => {
  const editFromCheckout = event.target.closest('[data-checkout-edit]');
  if (editFromCheckout) {
    checkout.returnFromEdit = { lineId: editFromCheckout.dataset.checkoutEdit, scroll: window.scrollY };
    checkout.updatedLine = null;
  }
  const heroContact = event.target.closest('[data-hero-contact]');
  if (heroContact) { toggleHeroContact(heroContact.dataset.heroContact); return; }
  if (event.target.closest('[data-hero-contact-close]')) {
    const kind = document.querySelector('.hero__contact-panel')?.dataset.kind;
    closeHeroContact();
    document.querySelector(`[data-hero-contact="${kind}"]`)?.focus();
    return;
  }
  if (!event.target.closest('.hero__utilities')) closeHeroContact();
  if (event.target.closest('[data-open-cart]')) openCart();
  if (event.target.closest('[data-open-info]')) openInfo();
  if (event.target.closest('[data-forget-repeat]')) updateRepeatPreference(false);
  if (event.target.closest('[data-open-favorites]')) openFavorites();
  const modeLink = event.target.closest('[data-mode]');
  if (modeLink) rememberMode(modeLink.dataset.mode);
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeHeroContact(); });
document.addEventListener('change', (event) => { if (event.target.matches('[data-remember-repeat]')) updateRepeatPreference(event.target.checked); });

/* ---------- מיקום ושעות ---------- */

const info = document.createElement('dialog');
info.className = 'sheet';
info.setAttribute('aria-labelledby', 'info-title');
document.body.append(info);

function weeklyHoursMarkup() {
  const today = businessNow().date;
  const exceptions = Object.entries(shop.hours.exceptions || {}).filter(([date]) => date >= today).sort(([a], [b]) => a.localeCompare(b));
  const ranges = (intervals) => intervals?.length ? intervals.map((period) => `<bdi dir="ltr">${safe(period.open)}–${safe(period.close)}</bdi>`).join(' · ') : 'סגור';
  return `<dl class="weekly-hours">${WEEKDAYS.map((day, index) => `<div${index === weekdayOf(today) ? ' class="is-today"' : ''}><dt>${day}</dt><dd>${ranges(shop.hours.weekly?.[index])}</dd></div>`).join('')}</dl>${exceptions.length ? `<details class="hours-exceptions"><summary>שינויים בתאריכים מיוחדים ${icon('down')}</summary><dl class="weekly-hours">${exceptions.map(([date, change]) => `<div><dt>${safe(dateLabel(date))}<small>${safe(change.note || '')}</small></dt><dd>${change.closed ? 'סגור' : ranges(change.intervals)}</dd></div>`).join('')}</dl></details>` : ''}`;
}

function openInfo() {
  const status = openingStatus();
  info.innerHTML = `<div class="sheet__panel sheet__panel--info">
    <header class="sheet__head"><h2 id="info-title">מיקום ושעות</h2><button type="button" class="icon-button" data-close-info aria-label="סגירה">${icon('close')}</button></header>
    <div class="info">
      <p class="info__row">${icon('pin')}<span><strong>${safe(shop.location.address)}</strong><small>כתובת לדוגמה</small></span></p>
      <p class="info__row">${icon('clock')}<span><strong>${safe(status.label)}</strong><small>${shop.demoOnly ? 'שעות לדוגמה' : 'שעות הפעילות'}</small></span></p>
      ${weeklyHoursMarkup()}
      <div class="info__actions">
        <a class="button button--primary" href="${wazeHref()}" target="_blank" rel="noopener">ניווט ב־Waze</a><a class="button button--quiet" href="${mapsHref()}" target="_blank" rel="noopener">Google Maps</a><a class="button button--quiet info__call" href="${phoneHref()}">${icon('phone')}<span>התקשרות · <bdi>${safe(shop.phone)}</bdi></span></a>
      </div>
    </div>
  </div>`;
  if (!info.open) info.showModal();
  info.querySelector('[data-close-info]').focus();
}

info.addEventListener('click', (event) => {
  if (event.target === info || event.target.closest('[data-close-info]')) info.close();
});

/* ---------- הרכבים שמורים במכשיר ---------- */

const favoritesDialog = document.createElement('dialog');
favoritesDialog.className = 'sheet favorites-sheet';
favoritesDialog.setAttribute('aria-labelledby', 'favorites-title');
document.body.append(favoritesDialog);

function renderFavorites() {
  const favorites = getFavorites();
  const available = activeProducts();
  favoritesDialog.innerHTML = `<div class="sheet__panel">
    <header class="sheet__head"><h2 id="favorites-title">המועדפים שלי</h2><button type="button" class="icon-button" data-close-favorites aria-label="סגירת המועדפים">${icon('close')}</button></header>
    <div class="sheet__body">${favoriteStorageIsPersistent() ? '' : '<p class="favorites-hint">האחסון חסום. השמירה זמינה עד סגירת העמוד.</p>'}
      ${favorites.length ? `<ul class="favorite-list">${favorites.map((favorite) => {
        const product = findProduct(favorite.config.productId);
        const info = describe(product, favorite.config);
        const active = available.some((item) => item.id === product.id);
        return `<li class="favorite-line"><span class="favorite-line__art">${productArt(product, favorite.config)}</span><div class="favorite-line__text"><h3>${safe(favorite.name)}</h3><p>${safe(info.title)}${favorite.qty > 1 ? ` · ${favorite.qty} יח׳` : ''}</p><strong><bdi>${money(unitPrice(product, favorite.config) * favorite.qty)}</bdi></strong>${active ? `<a class="button button--quiet favorite-line__choose" href="#/product/${safe(product.id)}/favorite/${safe(favorite.id)}" data-load-favorite="${safe(favorite.id)}">לפתיחה ועריכה ${icon('forward')}</a>` : '<span class="favorite-line__unavailable">המוצר אינו זמין כרגע</span>'}</div><button type="button" class="icon-button" data-remove-favorite="${safe(favorite.id)}" aria-label="מחיקת ${safe(favorite.name)} מהמועדפים">${icon('trash')}</button><details class="favorite-line__details"><summary>פירוט ההרכב ${icon('down')}</summary><p>${safe(detailText(info) || 'בלי תוספות')}</p>${favorite.config.note ? `<p>הערה: ${safe(favorite.config.note)}</p>` : ''}</details></li>`;
      }).join('')}</ul>` : `<div class="empty-state"><span class="favorites-empty" aria-hidden="true">${icon('heart')}</span><p><strong>אין הרכבים שמורים</strong></p><button type="button" class="button button--quiet" data-close-favorites>חזרה להרכבה</button></div>`}
    </div>
  </div>`;
}

function openFavorites() {
  closeHeroContact();
  renderFavorites();
  if (!favoritesDialog.open) favoritesDialog.showModal();
  favoritesDialog.querySelector('[data-load-favorite], [data-close-favorites]').focus({ preventScroll: true });
}

favoritesDialog.addEventListener('click', (event) => {
  if (event.target === favoritesDialog || event.target.closest('[data-close-favorites]')) favoritesDialog.close();
  const remove = event.target.closest('[data-remove-favorite]');
  if (remove) { removeFavorite(remove.dataset.removeFavorite); favoritesDialog.querySelector('[data-load-favorite], [data-close-favorites]').focus({ preventScroll: true }); }
  const load = event.target.closest('[data-load-favorite]');
  if (load) {
    clearDraft(`favorite:${load.dataset.loadFavorite}`);
    favoritesDialog.close();
    if (window.location.hash === load.getAttribute('href')) { event.preventDefault(); navigate(); }
  }
});
onFavoritesChange(() => { if (favoritesDialog.open) renderFavorites(); });

onCartChange((change) => {
  const count = cartCount();
  document.querySelectorAll('[data-order-progress]').forEach((nav) => {
    if (nav.dataset.hasCart !== String(Boolean(count))) nav.outerHTML = orderProgress(nav.dataset.orderProgress, nav.dataset.productId || undefined);
  });
  document.querySelectorAll('[data-cart-count]').forEach((node) => { node.textContent = count; node.hidden = count === 0; });
  document.querySelectorAll('[data-open-cart]').forEach((node) => { if (!node.closest('.order-progress')) node.setAttribute('aria-label', cartLabel(count)); });
  document.querySelectorAll('[data-hero-cart]').forEach((node) => { node.hidden = count === 0; });
  refreshMenuCart();
  if (sheet.open) {
    if (change.type === 'update') {
      const line = getLine(change.id);
      const node = sheet.querySelector(`[data-line="${CSS.escape(change.id)}"]`);
      if (line && node) {
        node.querySelector('[data-line-price]').textContent = money(lineTotal(line, findProduct(line.config.productId)));
        node.querySelector('output').textContent = line.qty;
        node.querySelector('[data-line-qty="minus"]').disabled = line.qty <= 1;
        node.querySelector('[data-line-qty="plus"]').disabled = line.qty >= 99;
      }
      sheet.querySelector('[data-sheet-subtotal]').textContent = money(cartSubtotal());
      sheet.querySelector('[data-sheet-count]').textContent = itemsText(count);
      sheet.querySelector('[data-cart-offer]').innerHTML = cartOfferMarkup();
    } else {
      renderCart();
      if (change.type === 'remove') sheet.querySelector('[data-undo-remove], .cart-line button, .sheet__foot .button, .empty-state .button')?.focus();
      if (change.type === 'restore') sheet.querySelector(`[data-line="${CSS.escape(change.id)}"] .cart-line__actions a`)?.focus();
    }
  }
  if (getRoute().page === 'checkout') checkoutPage();
});

/* ---------- קופה ---------- */

function rememberMode(mode) {
  checkout.mode = mode;
  saveMode(mode);
}

const rememberedCustomer = getCustomerDetails();
const checkout = {
  mode: getMode(),
  pickupTiming: 'asap',
  pickupDate: '',
  pickupSlotId: '',
  minimumRecovery: null,
  address: rememberedCustomer?.address || { query: '', place: null, city: '', street: '', number: '', apartment: '', floor: '', instructions: '' },
  contact: rememberedCustomer?.contact || { name: '', phone: '' },
  remember: Boolean(rememberedCustomer),
  hasRemembered: Boolean(rememberedCustomer),
  memoryMessage: rememberedCustomer ? 'הפרטים השמורים מולאו. כתובת למשלוח תיבדק מחדש.' : '',
  memoryError: false,
  check: { status: 'idle' },
  phoneTouched: false,
  errors: {},
  submitting: false,
  failure: false,
};

function customerPreferenceMarkup() {
  return `<label class="customer-memory__choice"><input type="checkbox" name="rememberDetails" ${checkout.remember ? 'checked' : ''} /><span><strong>לשמור פרטים להזמנה הבאה</strong><small>פרטי קשר וכתובת במכשיר הזה, רק לפי בחירתכם.</small></span></label>
    <button type="button" class="link-button" data-forget-customer ${checkout.hasRemembered ? '' : 'hidden'}>${icon('close')}מחיקת הפרטים השמורים</button>
    <p class="customer-memory__status${checkout.memoryError ? ' is-error' : ''}" data-memory-status role="status">${safe(checkout.memoryMessage)}</p>`;
}

function syncCustomerMemory(action = 'save') {
  if (action === 'forget') {
    const cleared = forgetCustomerDetails();
    checkout.remember = false;
    if (cleared) checkout.hasRemembered = false;
    checkout.memoryError = !cleared;
    checkout.memoryMessage = cleared ? 'הפרטים השמורים נמחקו. פרטי ההזמנה הנוכחית נשארו.' : 'לא הצלחנו למחוק את הפרטים השמורים. אפשר לנסות שוב.';
  } else if (checkout.remember) {
    const saved = saveCustomerDetails({ contact: checkout.contact, address: checkout.address });
    if (saved) checkout.hasRemembered = true;
    checkout.memoryError = !saved;
    checkout.memoryMessage = saved ? 'הפרטים נשמרו במכשיר. אפשר למחוק אותם בכל רגע.' : 'האחסון במכשיר חסום. הפרטים זמינים להזמנה הזו בלבד.';
  } else return;
  const preference = document.querySelector('[data-customer-preference]');
  if (!preference) return;
  preference.querySelector('input').checked = checkout.remember;
  preference.querySelector('[data-forget-customer]').hidden = !checkout.hasRemembered;
  const status = preference.querySelector('[data-memory-status]');
  if (status.textContent !== checkout.memoryMessage) status.textContent = checkout.memoryMessage;
  status.classList.toggle('is-error', checkout.memoryError);
}

function fulfillmentState() {
  const status = openingStatus();
  if (checkout.mode === 'pickup' && checkout.pickupTiming === 'scheduled') {
    const slot = selectedPickupSlot(checkout.pickupSlotId);
    return { valid: Boolean(slot), slot, label: slot ? pickupDescription(slot) : 'איסוף בשעה נבחרת', reason: checkout.pickupSlotId ? 'חלון האיסוף כבר לא זמין · בחרו שעה אחרת' : 'בחרו חלון איסוף' };
  }
  return { valid: status.open, slot: null, label: checkout.mode === 'pickup' ? 'איסוף בהקדם' : 'משלוח', reason: status.label };
}

function businessNoticeMarkup() {
  const status = openingStatus();
  if (status.open) return '';
  return `<div class="notice notice--warn" role="status">${icon('clock')}<span><strong>${safe(status.label)}.</strong> הסל והבחירות נשמרים.${shop.pickup.schedule?.enabled ? ' אפשר גם לבחור איסוף בשעה עתידית.' : ''}${shop.demoOnly ? ' שעות לדוגמה.' : ''}</span></div>`;
}

function pickupScheduleMarkup() {
  if (!shop.pickup.schedule?.enabled) return '';
  const status = openingStatus();
  const slots = pickupSlots();
  const dates = [...new Set(slots.map((slot) => slot.date))];
  if (!dates.includes(checkout.pickupDate)) checkout.pickupDate = dates[0] || '';
  const todaySlots = slots.filter((slot) => slot.date === checkout.pickupDate);
  const selected = slots.find((slot) => slot.id === checkout.pickupSlotId);
  const scheduled = checkout.pickupTiming === 'scheduled';
  return `<fieldset class="field-group pickup-schedule" id="pickup-schedule" tabindex="-1"><legend class="field-group__head"><span class="field-group__title">מתי לאסוף?</span></legend>
    <div class="tile-row tile-row--2 pickup-timing">
      <label class="tile"><input type="radio" id="pickup-timing-asap" name="pickupTiming" value="asap" ${scheduled ? '' : 'checked'} ${status.open ? '' : 'disabled'} /><span class="tile__surface"><strong>בהקדם</strong><small>${status.open ? 'בשעות הפעילות' : 'זמין כשהעסק פתוח'}</small></span></label>
      <label class="tile"><input type="radio" id="pickup-timing-scheduled" name="pickupTiming" value="scheduled" ${scheduled ? 'checked' : ''} ${slots.length ? '' : 'disabled'} /><span class="tile__surface"><strong>בחירת שעה</strong><small>ביום ובחלון שמתאימים לכם</small></span></label>
    </div>
    ${scheduled && slots.length ? `<div class="pickup-date-row" role="group" aria-label="יום האיסוף">${dates.map((date) => `<button type="button" data-pickup-date="${date}" aria-pressed="${checkout.pickupDate === date}">${safe(dateLabel(date))}</button>`).join('')}</div><label class="pickup-slot-label" for="pickup-slot">חלון האיסוף</label><select class="input" id="pickup-slot" name="pickupSlot" dir="ltr" aria-describedby="pickup-slot-hint"><option value="">בחרו שעה</option>${todaySlots.map((slot) => `<option value="${slot.id}" ${slot.id === checkout.pickupSlotId ? 'selected' : ''}>${slot.label}</option>`).join('')}</select><p id="pickup-slot-hint" class="pickup-schedule__hint${checkout.pickupSlotId && !selected ? ' is-error' : ''}" role="status">${checkout.pickupSlotId && !selected ? 'החלון שנבחר כבר לא זמין. בחרו שעה חדשה.' : selected ? safe(pickupDescription(selected)) : 'בחרו חלון איסוף כדי להמשיך.'}</p>` : !slots.length ? '<p class="pickup-schedule__hint">לא הוגדרו כרגע חלונות איסוף פנויים. אפשר לחזור בהמשך או לבחור בהקדם כשהעסק פתוח.</p>' : ''}
    ${shop.demoOnly ? '<p class="pickup-schedule__hint">חלונות וקיבולת לדוגמה. הבחירה אינה שומרת מקום במטבח אמיתי.</p>' : ''}
  </fieldset>`;
}

function refreshPickupSchedule() {
  const section = document.querySelector('[data-pickup-schedule]');
  if (!section) return;
  const focusId = section.contains(document.activeElement) ? document.activeElement.id : '';
  const markup = pickupScheduleMarkup();
  if (section.innerHTML === markup) return;
  section.innerHTML = markup;
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}

function minimumRecoveryMarkup() {
  const recovery = checkout.minimumRecovery;
  const line = recovery?.lineId ? getLine(recovery.lineId) : null;
  if (recovery?.lineId && (!line || line.qty !== recovery.qty || JSON.stringify(line.config) !== JSON.stringify(recovery.config))) { checkout.minimumRecovery = null; return ''; }
  return recovery ? `<div class="minimum-recovery" role="status"><span>עודכן בסל: ${safe(recovery.title)}</span><button type="button" class="link-button" data-undo-minimum>${icon('undo')}ביטול השינוי</button></div>` : '';
}

function minimumOffersMarkup(minimum) {
  if (getCart().some((line) => lineIssues(line).length)) return '';
  const offers = minimumSuggestions(getCart(), activeProducts(), minimum);
  return offers.length ? `<ul class="minimum-offers">${offers.map((offer) => `<li><div><strong>${safe(offer.title)}</strong><p>תוספת <bdi>${money(offer.delta)}</bdi> · סכום המוצרים יהיה <bdi>${money(offer.subtotal)}</bdi></p><small>${offer.shortBy ? `יישארו <bdi>${money(offer.shortBy)}</bdi> למינימום` : 'מינימום המשלוח יושג'}</small></div><button type="button" class="button button--quiet button--small" data-minimum-offer="${safe(offer.key)}">${offer.kind === 'size' ? 'הגדלה' : 'הוספה'} · <bdi>+${money(offer.delta)}</bdi></button></li>`).join('')}</ul>` : '';
}

function applyMinimumOffer(key) {
  if (checkout.submitting || checkout.mode !== 'delivery' || checkout.check.status !== 'ok' || getCart().some((line) => lineIssues(line).length)) return;
  const offer = minimumSuggestions(getCart(), activeProducts(), checkout.check.zone.minOrder).find((item) => item.key === key);
  if (!offer) { refreshCheckoutParts(); return; }
  const previous = offer.lineId ? structuredClone(getLine(offer.lineId)) : null;
  checkout.minimumRecovery = { previous, title: offer.title, config: structuredClone(offer.config), qty: offer.qty, lineId: offer.lineId };
  const position = window.scrollY;
  if (previous) updateLine(offer.lineId, { config: offer.config, qty: offer.qty });
  else {
    const line = addLine(offer.config, offer.qty);
    checkout.minimumRecovery.lineId = line.id;
  }
  refreshCheckoutParts();
  window.scrollTo({ top: position, behavior: 'instant' });
  document.querySelector('[data-undo-minimum]')?.focus({ preventScroll: true });
}

function undoMinimumOffer() {
  if (checkout.submitting) return;
  const recovery = checkout.minimumRecovery;
  checkout.minimumRecovery = null;
  const line = recovery && getLine(recovery.lineId);
  if (!line || line.qty !== recovery.qty || JSON.stringify(line.config) !== JSON.stringify(recovery.config)) { refreshCheckoutParts(); return; }
  const position = window.scrollY;
  if (recovery.previous) updateLine(line.id, { config: recovery.previous.config, qty: recovery.previous.qty });
  else removeLine(line.id);
  refreshCheckoutParts();
  window.scrollTo({ top: position, behavior: 'instant' });
  document.querySelector('[data-minimum-offer], [data-checkout-edit]')?.focus({ preventScroll: true });
}

function checkoutTotals() {
  const subtotal = cartSubtotal();
  const zone = checkout.check.status === 'ok' ? checkout.check.zone : null;
  const fee = checkout.mode === 'pickup' ? 0 : zone ? zone.fee : null;
  const shortBy = checkout.mode === 'delivery' && zone && subtotal < zone.minOrder ? zone.minOrder - subtotal : 0;
  return { subtotal, zone, fee, total: subtotal + (fee || 0), shortBy };
}

function field({ name, label, value, group, autocomplete = '', inputmode = '', wide = false, optional = false, type = 'text' }) {
  const error = checkout.errors[name];
  const phone = name === 'phone';
  const phoneValid = phone && checkout.phoneTouched && !error && validPhone(value);
  return `<div class="field field--${name}${wide ? ' field--wide' : ''}${error ? ' field--invalid' : ''}">
    <label for="f-${name}">${label}${optional ? ' <span class="field__optional">לא חובה</span>' : ''}</label>
    <input class="input" id="f-${name}" name="${name}" type="${type}" data-group="${group}" value="${safe(value)}" ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''} ${error ? 'aria-invalid="true"' : ''} ${error || phone ? `aria-describedby="e-${name}"` : ''} dir="${phone ? 'ltr' : 'auto'}" />
    ${phone ? `<p class="phone-feedback${error ? ' field__error' : phoneValid ? ' is-valid' : ''}" id="e-phone" role="status">${error ? safe(error) : phoneValid ? `${icon('check')}מבנה המספר תקין` : ''}</p>` : error ? `<p class="field__error" id="e-${name}">${safe(error)}</p>` : ''}
  </div>`;
}

function checkPhoneField(input, format = true) {
  checkout.phoneTouched = true;
  const error = phoneProblem(input.value);
  const wrapper = input.closest('.field');
  const feedback = wrapper.querySelector('.phone-feedback');
  wrapper.classList.toggle('field--invalid', Boolean(error));
  input.setAttribute('aria-invalid', String(Boolean(error)));
  feedback.classList.toggle('field__error', Boolean(error));
  feedback.classList.toggle('is-valid', !error);
  feedback.innerHTML = error ? safe(error) : `${icon('check')}מבנה המספר תקין`;
  if (error) checkout.errors.phone = error;
  else {
    delete checkout.errors.phone;
    if (format) input.value = formatPhone(input.value);
  }
  checkout.contact.phone = input.value;
  syncCustomerMemory();
}

function addressStatus() {
  const { status, zone } = checkout.check;
  if (status === 'checking') return `<div class="notice notice--pending"><span class="spinner" aria-hidden="true"></span><span>בודקים את הכתובת…</span></div>`;
  if (status === 'ok') {
    const { shortBy, subtotal } = checkoutTotals();
    const activeIds = new Set(activeProducts().map((product) => product.id));
    const editable = [...getCart()].reverse().find((line) => activeIds.has(line.config.productId));
    const href = editable ? `#/product/${editable.config.productId}/edit/${editable.id}?return=checkout` : productHref();
    return `<div class="notice notice--ok">${icon('check')}<span><strong>הכתובת בתוך אזור השירות לדוגמה.</strong> דמי משלוח <bdi>${money(zone.fee)}</bdi> · מינימום להזמנה <bdi>${money(zone.minOrder)}</bdi></span></div>
      ${minimumRecoveryMarkup()}${shortBy ? `<section class="delivery-minimum" data-delivery-minimum aria-label="מינימום הזמנה למשלוח"><strong>חסרים <bdi>${money(shortBy)}</bdi> למשלוח</strong><p>סכום המוצרים <bdi>${money(subtotal)}</bdi> · מינימום באזור <bdi>${money(zone.minOrder)}</bdi></p>${minimumOffersMarkup(zone.minOrder)}<div><a class="button button--quiet button--small" href="${safe(href)}" ${editable ? `data-checkout-edit="${safe(editable.id)}"` : ''}>חזרה להרכבה ${icon('back')}</a><button type="button" class="link-button" data-switch-pickup>מעבר לאיסוף עצמי</button></div></section>` : ''}`;
  }
  if (status === 'out') return `<div class="notice notice--warn">${icon('alert')}<span><strong>הכתובת מחוץ לאזור המשלוחים.</strong> אפשר להזמין ולאסוף בעצמכם.</span><button type="button" class="button button--small" id="switch-pickup" data-switch-pickup>מעבר לאיסוף עצמי</button></div>`;
  if (status === 'invalid') return `<div class="notice notice--warn">${icon('alert')}<span>לא הצלחנו לאמת כתובת מלאה. בחרו שוב כתובת עם מספר בית מהרשימה.</span><button type="button" class="button button--small" data-switch-pickup>מעבר לאיסוף עצמי</button></div>`;
  if (status === 'unavailable') return `<div class="notice notice--warn">${icon('alert')}<span>שירות הכתובות לא זמין כרגע. אפשר לנסות שוב או לבחור איסוף עצמי.</span><button type="button" class="button button--small" data-check-address>ניסיון נוסף</button><button type="button" class="button button--small" data-switch-pickup>איסוף עצמי</button></div>`;
  return checkout.address.place ? `<button type="button" class="button button--quiet button--small" data-check-address>${icon('pin')}<span>בדיקת אזור השירות</span></button>` : '';
}

function checkoutState() {
  const open = isOpen();
  const fulfillment = fulfillmentState();
  const totals = checkoutTotals();
  const out = checkout.mode === 'delivery' && checkout.check.status === 'out';
  const needsAddress = checkout.mode === 'delivery' && checkout.check.status !== 'ok';
  const unavailable = getCart().some((line) => lineIssues(line).length);
  const blocked = !fulfillment.valid || unavailable || totals.shortBy > 0 || needsAddress;
  const reason = unavailable ? 'עדכנו את הפריטים שאינם זמינים' : !fulfillment.valid ? fulfillment.reason : totals.shortBy ? `חסרים ${money(totals.shortBy)} למינימום` : out ? 'הכתובת מחוץ לאזור' : needsAddress ? checkout.check.status === 'checking' ? 'בודקים את הכתובת…' : 'בחרו כתובת למשלוח' : '';
  return { open, totals, blocked, reason, fulfillment };
}

function checkoutBarMarkup() {
  const { totals, blocked, reason } = checkoutState();
  return `${reason ? `<p class="checkout-action-reason" role="status">${safe(reason)}</p>` : ''}
    <button type="submit" form="checkout-form" class="button button--primary buybar__cta" ${blocked || checkout.submitting ? 'disabled' : ''}>
      ${checkout.submitting ? '<span class="spinner" aria-hidden="true"></span><span>מכינים אישור לדוגמה…</span>' : `<span>אישור לדוגמה · ${money(totals.total)}</span>${icon('forward')}`}
    </button>`;
}

// מעדכן רק את האזורים שתלויים בכתובת ובסכום, כדי לא לאבד פוקוס בטופס.
function refreshCheckoutParts() {
  const business = document.querySelector('[data-business-status]');
  if (business) business.innerHTML = businessNoticeMarkup();
  const check = document.querySelector('#address-check');
  const focusWasInCheck = check?.contains(document.activeElement);
  if (check) check.innerHTML = addressStatus();
  const summary = document.querySelector('#summary');
  if (summary) summary.innerHTML = summaryMarkup();
  const shortTotal = document.querySelector('[data-short-total]');
  if (shortTotal) shortTotal.textContent = money(checkoutTotals().total);
  const bar = document.querySelector('#checkout-bar');
  if (bar) bar.innerHTML = checkoutBarMarkup();
  if (focusWasInCheck) (check.querySelector('button, a') || check).focus({ preventScroll: true });
}

function checkoutCompositionMarkup(info) {
  if (info.components) return info.components.map((part) => `<div class="summary__component"><strong>${safe(part.name)} · ${safe(part.title)}</strong>${checkoutCompositionMarkup(part)}${part.note ? `<small>הערה: ${safe(part.note)}</small>` : ''}</div>`).join('');
  return `<small class="summary__composition-brief">${safe([...info.singles, ...info.extras.map((extra) => extra.text)].join(' · '))}</small>`;
}

function summaryMarkup() {
  const totals = checkoutTotals();
  return `<h2 class="summary__title">ההזמנה</h2>
    <ul class="summary__lines">${getCart().map((line) => {
      const product = findProduct(line.config.productId);
      const info = describe(product, line.config);
      const issues = lineIssues(line);
      return `<li><a class="summary__edit" href="#/product/${safe(product.id)}/edit/${safe(line.id)}?return=checkout" data-checkout-edit="${safe(line.id)}" aria-label="עריכת ${safe(line.config.label || info.title)} וחזרה לקופה"><span class="summary__art">${productArt(product, line.config)}</span><div class="summary__text">${itemLabelMarkup(line.config.label)}<strong>${line.qty > 1 ? `${line.qty} × ` : ''}${safe(info.title)}</strong>${issues.length ? `<small class="cart-line__unavailable">צריך לעדכן: ${safe(issues.join(', '))}</small>` : ''}${checkout.updatedLine === line.id ? '<small class="summary__updated" role="status">הפריט עודכן</small>' : ''}</div><span class="summary__line-side"><bdi>${money(lineTotal(line, product))}</bdi><small>עריכה ${icon('edit')}</small></span><div class="summary__composition">${checkoutCompositionMarkup(info)}</div></a></li>`;
    }).join('')}</ul>
    <button type="button" class="link-button" data-open-cart>עריכת הסל</button>
    ${checkout.mode === 'pickup' ? `<p class="summary__pickup">${icon('clock')}<span>${safe(fulfillmentState().label)}</span></p>` : ''}
    <dl class="summary__totals">
      <div><dt>סכום ביניים</dt><dd><bdi>${money(totals.subtotal)}</bdi></dd></div>
      <div><dt>${checkout.mode === 'pickup' ? 'איסוף עצמי' : 'משלוח'}</dt><dd>${checkout.mode === 'delivery' && checkout.check.status === 'out' ? 'לא זמין לכתובת' : totals.fee === null ? 'לפי הכתובת' : totals.fee === 0 ? 'ללא עלות' : `<bdi>${money(totals.fee)}</bdi>`}</dd></div>
      <div class="summary__grand"><dt>סה״כ לדוגמה</dt><dd><bdi>${money(totals.total)}</bdi></dd></div>
    </dl>`;
}

function checkoutPage(focusId) {
  stopAddressLookup();
  const cart = getCart();
  const focused = focusId || document.activeElement?.id;
  if (!cart.length) {
    app.innerHTML = `${topbar(productHref())}<main class="page"><div class="wrap"><div class="empty-state empty-state--page">
      <svg class="empty-state__art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 7"/></svg>
      <p><strong>הסל ריק</strong></p>
      <a class="button button--primary" href="${productHref()}"><span>מרכיבים פיצה</span>${icon('forward')}</a></div></div></main>`;
    return;
  }
  const { open } = checkoutState();
  const { address, contact } = checkout;
  if (checkout.phoneTouched) {
    const error = phoneProblem(contact.phone);
    if (error) checkout.errors.phone = error;
    else delete checkout.errors.phone;
  }

  app.innerHTML = `${topbar(productHref())}
    <main class="page checkout"><div class="wrap checkout__layout">
      <form class="checkout__form" id="checkout-form" novalidate>
        ${orderProgress('details')}
        <header class="page-head"><h1>פרטים ותשלום</h1></header>
        <div class="notice notice--warn checkout-demo" role="status">${icon('alert')}<span><strong>הדגמה · ללא הזמנה או חיוב.</strong></span></div>
        <div data-business-status>${businessNoticeMarkup()}</div>
        ${checkout.failure ? `<div class="notice notice--error" role="alert" tabindex="-1" id="failure">${icon('alert')}<span><strong>בהדגמה דימינו תשלום שנכשל.</strong> לא בוצע חיוב ואפשר לנסות שוב.</span></div>` : ''}
        <fieldset class="field-group">
          <legend class="field-group__head"><span class="field-group__title">קבלת ההזמנה</span></legend>
          <div class="tile-row tile-row--2">
            <label class="tile tile--mode"><input type="radio" id="mode-delivery" name="mode" value="delivery" ${checkout.mode === 'delivery' ? 'checked' : ''} /><span class="tile__surface">${icon('delivery', 'tile__icon')}<strong>משלוח</strong></span></label>
            <label class="tile tile--mode"><input type="radio" id="mode-pickup" name="mode" value="pickup" ${checkout.mode === 'pickup' ? 'checked' : ''} /><span class="tile__surface">${icon('pickup', 'tile__icon')}<strong>איסוף עצמי</strong></span></label>
          </div>
        </fieldset>
        ${checkout.mode === 'delivery' ? `<fieldset class="field-group">
          <legend class="field-group__head"><span class="field-group__title">כתובת למשלוח</span></legend>
          <div class="field address-search${checkout.errors.addressQuery ? ' field--invalid' : ''}">
            <label for="f-addressQuery">רחוב, מספר בית ועיר</label>
            <div class="address-search__input"><input class="input" id="f-addressQuery" name="addressQuery" value="${safe(address.query)}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="address-results" aria-describedby="address-search-hint${checkout.errors.addressQuery ? ' e-addressQuery' : ''}" ${checkout.errors.addressQuery ? 'aria-invalid="true"' : ''} dir="auto" autocomplete="off" spellcheck="false" enterkeyhint="search" maxlength="160" placeholder="למשל: רוטשילד 10, תל אביב" /><button type="button" class="icon-button address-search__clear" data-clear-address aria-label="מחיקת הכתובת" ${address.query ? '' : 'hidden'}>${icon('close')}</button></div>
            <ul class="address-results" id="address-results" role="listbox" aria-label="הצעות לכתובת" hidden></ul>
            <p class="address-search__message" data-address-message role="status"></p>
            ${checkout.errors.addressQuery ? `<p class="field__error" id="e-addressQuery">${safe(checkout.errors.addressQuery)}</p>` : ''}
          </div>
          <div class="address-selected" data-address-selected ${address.place ? '' : 'hidden'}>${selectedAddressMarkup()}</div>
          <details class="address-search__info"><summary id="address-search-hint">${icon('info')}<span>מידע על חיפוש הכתובת</span>${icon('down')}</summary><div><p>החיפוש משתמש ב־<a href="https://photon.komoot.io/" target="_blank" rel="noopener">Photon</a> ובנתוני <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>.</p><p>אזור המשלוח נקבע לפי מיקום הכתובת שאושרה. תחומי המשלוח באתר זה להמחשה.</p></div></details>
          <div class="address-check" id="address-check" tabindex="-1" aria-live="polite">${addressStatus()}</div>
          <div class="field-grid">
            ${field({ name: 'apartment', label: 'דירה', value: address.apartment, group: 'address', optional: true })}
            ${field({ name: 'floor', label: 'קומה', value: address.floor, group: 'address', inputmode: 'numeric', optional: true })}
            ${field({ name: 'instructions', label: 'הערות לשליח', value: address.instructions, group: 'address', optional: true, wide: true })}
          </div>
        </fieldset>` : `<section class="field-group pickup-card">
          ${icon('pin', 'pickup-card__icon')}<div><h2 class="field-group__title">איסוף מהפיצרייה</h2><p>${safe(shop.location.address)}</p><small>${safe(shop.pickup.readyHint)}</small>
            <div class="pickup-card__actions"><a class="button button--quiet button--small" href="${wazeHref()}" target="_blank" rel="noopener">ניווט ב־Waze</a><a class="button button--quiet button--small" href="${mapsHref()}" target="_blank" rel="noopener">Google Maps</a></div></div>
        </section><div data-pickup-schedule>${pickupScheduleMarkup()}</div>`}
        <fieldset class="field-group">
          <legend class="field-group__head"><span class="field-group__title">פרטי קשר</span></legend>
          <div class="field-grid">
            ${field({ name: 'name', label: 'שם', value: contact.name, group: 'contact', autocomplete: 'name' })}
            ${field({ name: 'phone', label: 'טלפון', value: contact.phone, group: 'contact', autocomplete: 'tel', inputmode: 'tel', type: 'tel' })}
          </div>
        </fieldset>
        <section class="customer-memory" data-customer-preference aria-label="שמירת פרטים במכשיר">${customerPreferenceMarkup()}</section>
        <section class="customer-memory" data-repeat-preference aria-label="שמירת הרכב לביקור הבא">${repeatPreferenceMarkup()}</section>
        <section class="field-group pay-note">
          ${icon('lock', 'pay-note__icon')}<div><h2 class="field-group__title">תשלום באשראי — טרם חובר</h2><p>לא מזינים פרטי כרטיס בהדגמה.</p></div>
        </section>
      </form>
      <aside class="summary" aria-label="סיכום ההזמנה"><details class="checkout-summary"><summary><span>סיכום · ${itemsText(cartCount())}</span><bdi data-short-total>${money(checkoutTotals().total)}</bdi>${icon('down')}</summary><div class="summary__panel" id="summary">${summaryMarkup()}</div></details></aside>
    </div></main>
    <div class="buybar buybar--checkout"><div class="buybar__inner" id="checkout-bar">${checkoutBarMarkup()}</div></div>`;

  const form = document.querySelector('#checkout-form');
  teardown.push(mountCheckoutFlow());
  form.addEventListener('focusout', (event) => { if (event.target.name === 'phone') checkPhoneField(event.target); });
  form.addEventListener('change', (event) => {
    if (event.target.name === 'rememberDetails') {
      checkout.remember = event.target.checked;
      syncCustomerMemory(checkout.remember ? 'save' : 'forget');
    }
    if (event.target.name === 'pickupTiming') { checkout.pickupTiming = event.target.value; refreshPickupSchedule(); refreshCheckoutParts(); }
    if (event.target.name === 'pickupSlot') { checkout.pickupSlotId = event.target.value; refreshCheckoutParts(); const hint = document.querySelector('#pickup-slot-hint'); if (hint) { hint.classList.remove('is-error'); hint.textContent = checkout.pickupSlotId ? pickupDescription(selectedPickupSlot(checkout.pickupSlotId)) : 'בחרו חלון איסוף כדי להמשיך.'; } }
    if (event.target.name === 'mode') {
      rememberMode(event.target.value);
      checkout.errors = {};
      checkoutPage();
    }
  });
  form.addEventListener('input', (event) => {
    const { name, value, dataset } = event.target;
    if (!dataset.group) return;
    checkout[dataset.group][name] = value;
    syncCustomerMemory();
    if (name === 'phone') {
      delete checkout.errors.phone;
      const wrapper = event.target.closest('.field');
      wrapper.classList.remove('field--invalid');
      event.target.removeAttribute('aria-invalid');
      wrapper.querySelector('.phone-feedback').className = 'phone-feedback';
      wrapper.querySelector('.phone-feedback').textContent = '';
      return;
    }
    if (checkout.errors[name]) {
      delete checkout.errors[name];
      const wrapper = event.target.closest('.field');
      wrapper.classList.remove('field--invalid');
      wrapper.querySelector('.field__error')?.remove();
      event.target.removeAttribute('aria-invalid');
    }
    if (['city', 'street', 'number'].includes(name) && checkout.check.status !== 'idle') {
      checkout.check = { status: 'idle' };
      refreshCheckoutParts();
    }
  });
  form.addEventListener('click', (event) => {
    const date = event.target.closest('[data-pickup-date]');
    if (date) { checkout.pickupDate = date.dataset.pickupDate; checkout.pickupSlotId = ''; refreshPickupSchedule(); refreshCheckoutParts(); document.querySelector('#pickup-slot')?.focus({ preventScroll: true }); }
    const offer = event.target.closest('[data-minimum-offer]');
    if (offer) applyMinimumOffer(offer.dataset.minimumOffer);
    if (event.target.closest('[data-undo-minimum]')) undoMinimumOffer();
    if (event.target.closest('[data-forget-customer]')) syncCustomerMemory('forget');
    if (event.target.closest('[data-check-address]')) runAddressCheck();
    if (event.target.closest('[data-switch-pickup]')) { rememberMode('pickup'); checkout.errors = {}; checkoutPage('mode-pickup'); }
  });
  form.addEventListener('submit', (event) => { event.preventDefault(); placeOrder(); });
  if (checkout.mode === 'delivery') bindAddressLookup(form);
  if (focused) document.getElementById(focused)?.focus();
}

function selectedAddressMarkup() {
  const place = checkout.address.place;
  return place ? `${icon('pin')}<span><strong>${safe(place.street)} ${safe(place.number)}</strong><small>${safe(place.city)}</small></span>` : '';
}

let addressCheckController;
let addressCheckRevision = 0;
const addressKey = () => JSON.stringify([checkout.mode, checkout.address.query, checkout.address.place?.id, checkout.address.city, checkout.address.street, checkout.address.number]);

function bindAddressLookup(form) {
  const input = form.querySelector('#f-addressQuery');
  const list = form.querySelector('#address-results');
  const message = form.querySelector('[data-address-message]');
  const chosen = form.querySelector('[data-address-selected]');
  const clear = form.querySelector('[data-clear-address]');
  let controller, timer, revision = 0, candidates = [], active = -1, disposed = false;
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
  const showSelection = () => { chosen.innerHTML = selectedAddressMarkup(); chosen.hidden = !checkout.address.place; clear.hidden = !input.value; };
  const select = (index) => {
    const place = candidates[index];
    if (!place) return;
    clearTimeout(timer); controller?.abort(); revision++;
    checkout.address = { ...checkout.address, query: place.label, place, city: place.city, street: place.street, number: place.number };
    syncCustomerMemory();
    input.value = place.label;
    message.textContent = '';
    close(); showSelection();
    delete checkout.errors.addressQuery;
    input.removeAttribute('aria-invalid');
    form.querySelector('#e-addressQuery')?.remove();
    input.closest('.field').classList.remove('field--invalid');
    runAddressCheck();
  };
  const mark = () => {
    list.querySelectorAll('[role="option"]').forEach((option, index) => option.setAttribute('aria-selected', String(index === active)));
    if (active >= 0) { input.setAttribute('aria-activedescendant', `address-option-${active}`); list.children[active]?.scrollIntoView({ block: 'nearest' }); }
  };
  const search = async () => {
    clearTimeout(timer); controller?.abort();
    const query = input.value.trim();
    const request = ++revision;
    close(); candidates = [];
    if (query.length < 4) { message.textContent = query ? 'הקלידו רחוב, מספר בית ועיר.' : ''; return; }
    controller = new AbortController();
    message.textContent = 'מחפשים כתובות…';
    try {
      const found = await searchAddresses(query, { signal: controller.signal });
      if (disposed || request !== revision || query !== input.value.trim()) return;
      candidates = found;
      list.innerHTML = found.map((place, index) => `<li id="address-option-${index}" role="option" aria-selected="false" data-address-option="${index}">${icon('pin')}<span><strong>${safe(place.street)} ${safe(place.number)}</strong><small>${safe(place.city)}</small></span>${zoneForAddress(place) ? '' : '<span class="address-results__outside">מחוץ לאזור לדוגמה</span>'}</li>`).join('');
      list.hidden = !found.length;
      input.setAttribute('aria-expanded', String(Boolean(found.length)));
      message.textContent = found.length ? `${found.length} כתובות נמצאו. בחרו את הכתובת המלאה.` : 'לא נמצאה כתובת מלאה. נסו שם רחוב אחר והוסיפו מספר בית ועיר, או בחרו איסוף עצמי.';
    } catch {
      if (disposed || request !== revision || controller.signal.aborted) return;
      message.innerHTML = 'שירות החיפוש לא זמין כרגע. <button type="button" class="link-button" data-retry-search>ניסיון נוסף</button> או <button type="button" class="link-button" data-switch-pickup>איסוף עצמי</button>.';
    }
  };
  const change = () => {
    controller?.abort(); clearTimeout(timer); revision++;
    addressCheckController?.abort(); addressCheckRevision++;
    checkout.address = { ...checkout.address, query: input.value, place: null, city: '', street: '', number: '' };
    syncCustomerMemory();
    checkout.check = { status: 'idle' };
    close(); showSelection(); refreshCheckoutParts();
    message.textContent = input.value.trim().length >= 4 ? 'מחפשים כתובות…' : input.value ? 'הקלידו רחוב, מספר בית ועיר.' : '';
    timer = setTimeout(search, 450);
  };
  input.addEventListener('input', change);
  input.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && candidates.length && !list.hidden) {
      event.preventDefault(); active = (active + (event.key === 'ArrowDown' ? 1 : -1) + candidates.length) % candidates.length; mark();
    } else if (event.key === 'Enter') { event.preventDefault(); if (!list.hidden && candidates.length) select(active < 0 ? 0 : active); else if (!checkout.address.place) search(); }
    else if (event.key === 'Escape' || event.key === 'Tab') close();
  });
  input.addEventListener('focus', () => { if (!checkout.address.place && candidates.length) { list.hidden = false; input.setAttribute('aria-expanded', 'true'); } });
  input.addEventListener('blur', close);
  list.addEventListener('pointerdown', (event) => { if (event.target.closest('[data-address-option]')) event.preventDefault(); });
  list.addEventListener('click', (event) => { const option = event.target.closest('[data-address-option]'); if (option) select(Number(option.dataset.addressOption)); });
  clear.addEventListener('click', () => { input.value = ''; change(); input.focus({ preventScroll: true }); });
  message.addEventListener('click', (event) => { if (event.target.closest('[data-retry-search]')) search(); });
  stopAddressLookup = () => {
    disposed = true; revision++; clearTimeout(timer); controller?.abort(); addressCheckController?.abort(); addressCheckRevision++;
    if (checkout.check.status === 'checking') checkout.check = { status: 'idle' };
    stopAddressLookup = () => {};
  };
}

async function runAddressCheck() {
  addressCheckController?.abort();
  const request = ++addressCheckRevision;
  addressCheckController = new AbortController();
  const key = addressKey();
  checkout.check = { status: 'checking' };
  refreshCheckoutParts();
  let result;
  try { result = await verifyAddress(checkout.address, { signal: addressCheckController.signal }); }
  catch { return 'stale'; }
  // אם הכתובת השתנתה בזמן הבדיקה, התוצאה כבר לא שייכת לה.
  if (request !== addressCheckRevision || key !== addressKey() || checkout.check.status !== 'checking') return 'stale';
  checkout.check = result.status === 'ok' ? { status: 'ok', zone: result.zone } : { status: result.status };
  if (getRoute().page === 'checkout') refreshCheckoutParts();
  return result.status;
}

async function placeOrder() {
  if (checkout.submitting) return;
  if (!fulfillmentState().valid || !getCart().length) { refreshPickupSchedule(); refreshCheckoutParts(); document.querySelector('#pickup-schedule')?.focus({ preventScroll: true }); return; }
  if (getCart().some((line) => lineIssues(line).length)) { refreshCheckoutParts(); document.querySelector('#summary')?.scrollIntoView({ block: 'start' }); return; }
  const errors = {};
  if (checkout.mode === 'delivery') {
    if (!checkout.address.place) errors.addressQuery = 'בחרו כתובת מלאה עם מספר בית מתוך הרשימה.';
  }
  if (!checkout.contact.name.trim()) errors.name = 'איך לפנות אליכם?';
  const phoneError = phoneProblem(checkout.contact.phone);
  if (phoneError) errors.phone = phoneError;
  checkout.errors = errors;
  checkout.failure = false;
  if (Object.keys(errors).length) {
    checkoutPage();
    document.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const showCheck = () => {
    const check = document.querySelector('#address-check');
    check?.scrollIntoView({ block: 'center' });
    check?.focus({ preventScroll: true });
  };
  if (checkout.mode === 'delivery' && checkout.check.status !== 'ok') {
    const status = await runAddressCheck();
    if (status !== 'ok') { showCheck(); return; }
  }
  if (checkout.mode === 'delivery' && checkoutTotals().shortBy) { showCheck(); return; }
  if (!fulfillmentState().valid) { refreshPickupSchedule(); refreshCheckoutParts(); return; }
  checkout.submitting = true;
  refreshCheckoutParts();
  const totals = checkoutTotals();
  const pickupSlot = checkout.mode === 'pickup' && checkout.pickupTiming === 'scheduled' ? selectedPickupSlot(checkout.pickupSlotId) : null;
  const snapshot = {
    pickup: checkout.mode === 'pickup' ? pickupSlot ? { timing: 'scheduled', id: pickupSlot.id, date: pickupSlot.date, time: pickupSlot.time, endTime: pickupSlot.endTime, label: pickupSlot.label } : { timing: 'asap' } : null,
    createdAt: new Date().toISOString(),
    mode: checkout.mode,
    address: checkout.mode === 'delivery' ? { ...checkout.address } : null,
    name: checkout.contact.name.trim(),
    lines: getCart().map((line) => {
      const product = findProduct(line.config.productId);
      const info = describe(product, line.config);
      return { title: info.title, label: line.config.label, singles: info.singles, extras: info.extras, components: info.components, details: detailText(info), note: line.config.note, qty: line.qty, total: lineTotal(line, product), config: line.config };
    }),
    subtotal: totals.subtotal,
    fee: totals.fee || 0,
    total: totals.total,
  };
  const result = await submitOrder(snapshot);
  checkout.submitting = false;
  if (!result.ok) {
    checkout.failure = true;
    checkoutPage();
    document.querySelector('#failure')?.focus();
    return;
  }
  const repeatSaved = saveLastOrder({ ...snapshot, reference: result.reference });
  if (remembersRepeatOrder()) { repeatMemoryError = !repeatSaved; repeatMemoryMessage = repeatSaved ? 'ההרכב נשמר במכשיר לביקור הבא.' : 'לא הצלחנו לשמור את ההרכב לביקור הבא. האישור זמין בביקור הנוכחי.'; }
  checkout.pickupSlotId = '';
  checkout.pickupTiming = 'asap';
  checkout.minimumRecovery = null;
  checkout.check = { status: 'idle' };
  // קודם מחליפים מסך, כדי שהסל שהתרוקן לא יצייר את הקופה הריקה לרגע.
  window.location.hash = '#/done';
  clearCart();
}

/* ---------- אישור ---------- */

function donePage() {
  const order = getLastOrder();
  if (!order) {
    app.innerHTML = `${topbar('#/')}<main class="page"><div class="wrap"><div class="empty-state empty-state--page">
      <p><strong>אין הזמנה להצגה</strong></p>
      <a class="button button--primary" href="#/"><span>לעמוד הפתיחה</span>${icon('forward')}</a></div></div></main>`;
    return;
  }
  const when = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.createdAt));
  const steps = order.mode === 'delivery' ? ['הפיצרייה מאשרת את ההזמנה', 'הבצק נפתח, התנור עובד', 'השליח בדרך אליכם'] : ['הפיצרייה מאשרת את ההזמנה', 'הבצק נפתח, התנור עובד', 'הודעה כשמוכן לאיסוף'];
  app.innerHTML = `${topbar('#/')}
    <main class="page done"><div class="wrap done__layout">
      <div class="done__intro"><p class="order-reference"><span>הזמנה לדוגמה</span><bdi>${safe(order.reference)}</bdi></p>
        <h1>כך ייראה אישור ההזמנה</h1>
        <div class="notice notice--warn">${icon('alert')}<span><strong>הדגמה · ההזמנה לא נשלחה ולא בוצע חיוב.</strong></span></div>
        <ol class="done__steps">${steps.map((step) => `<li>${step}</li>`).join('')}</ol>
        <a class="button button--primary" href="#/">לעמוד הפתיחה</a><div class="done__services"><a class="button button--quiet" href="${phoneHref()}">${icon('phone')}חיוג</a><a class="button button--quiet" href="${wazeHref()}" target="_blank" rel="noopener">${icon('pin')}ניווט</a></div>
        <a class="link-button done__repeat" href="#/repeat">${icon('undo')}להזמין שוב</a>
        <section class="customer-memory" data-repeat-preference aria-label="שמירת הרכב לביקור הבא">${repeatPreferenceMarkup()}</section>
      </div>
      <details class="order-receipt" ${window.matchMedia('(min-width: 900px)').matches ? 'open' : ''}><summary><span>פרטי ההזמנה</span><bdi>${money(order.total)}</bdi>${icon('down')}</summary><div class="ticket-wrap"><article class="ticket" aria-label="פרטי ההזמנה">
        <header class="ticket__head"><strong>${safe(shop.name)}</strong><span>הזמנה <bdi>${safe(order.reference)}</bdi></span><span><bdi>${when}</bdi></span></header>
        <ul class="ticket__lines">${order.lines.map((line) => `<li>
          <span class="ticket__qty"><bdi>${line.qty}×</bdi></span>
          <div class="ticket__item">${itemLabelMarkup(line.label)}<strong>${safe(line.title)}</strong>${line.extras ? compositionMarkup({ singles: line.singles || [], extras: line.extras, components: line.components }) : line.details ? `<small>${safe(line.details)}</small>` : ''}${line.note ? `<small>הערה: <bdi>${safe(line.note)}</bdi></small>` : ''}</div>
          <bdi class="ticket__price">${money(line.total)}</bdi>
        </li>`).join('')}</ul>
        <dl class="ticket__totals">
          <div><dt>סכום ביניים</dt><dd><bdi>${money(order.subtotal)}</bdi></dd></div>
          <div><dt>${order.mode === 'delivery' ? 'משלוח' : 'איסוף עצמי'}</dt><dd>${order.fee ? `<bdi>${money(order.fee)}</bdi>` : 'ללא עלות'}</dd></div>
          <div class="ticket__grand"><dt>סה״כ</dt><dd><bdi>${money(order.total)}</bdi></dd></div>
        </dl>
        <p class="ticket__to">${order.mode === 'delivery' ? `משלוח אל: ${safe(order.address.street)} ${safe(order.address.number)}${order.address.apartment ? `, דירה ${safe(order.address.apartment)}` : ''}, ${safe(order.address.city)}` : `איסוף עצמי: ${safe(shop.location.address)}`}</p>
        <p class="ticket__to">על שם: ${safe(order.name)}</p>
        ${order.mode === 'pickup' ? `<p class="ticket__to">${safe(order.pickup?.timing === 'scheduled' ? pickupDescription(order.pickup) : 'איסוף בהקדם')}</p>` : ''}
        <footer class="ticket__foot">אישור לדוגמה · לא בוצעה הזמנה</footer>
      </article></div></details>
    </div></main>`;
}

/* ---------- ניתוב ---------- */

function getRoute() {
  const [path, query = ''] = window.location.hash.split('?');
  const [, page = '', id, action, lineId] = path.split('/');
  return { page, id, action, lineId, returnToCheckout: new URLSearchParams(query).get('return') === 'checkout' };
}

function notFound() {
  app.innerHTML = `${topbar('#/')}<main class="page"><div class="wrap"><div class="empty-state empty-state--page">
    <p><strong>לא מצאנו את המוצר הזה</strong>אולי הוא הוסר מהתפריט.</p>
    <a class="button button--primary" href="${productHref()}"><span>לתפריט</span>${icon('forward')}</a></div></div></main>`;
}

function render() {
  teardown.forEach((cleanup) => cleanup());
  teardown = [];
  freshBuilder = false;
  if (sheet.open) sheet.close();
  if (info.open) info.close();
  if (pizzaPreview.open) pizzaPreview.close();
  if (added.open) added.close();
  if (favoritesDialog.open) favoritesDialog.close();
  stopAddressLookup();
  let restoreScroll = 0;
  const route = getRoute();
  // מסך הפתיחה כהה, שאר הזרימה בהירה: צבע סרגל הדפדפן בטלפון עוקב.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', route.page ? '#f7f6f2' : '#120e0c');
  const list = activeProducts();
  if (route.page === 'menu' && list.length > 1) menu();
  else if (route.page === 'product') {
    const product = list.find((item) => item.id === route.id);
    const source = ['edit', 'copy'].includes(route.action) ? getLine(route.lineId) : null;
    const favorite = route.action === 'favorite' ? getFavorite(route.lineId) : null;
    const shared = product && route.action === 'share' ? decodeConfiguration(product, route.lineId) : null;
    const incoming = favorite && product && favorite.config.productId === product.id ? { ...favorite, key: `favorite:${favorite.id}`, kind: 'favorite', label: `מהמועדפים: ${favorite.name}` } : shared ? { ...shared, key: `share:${product.id}:${route.lineId}`, kind: 'share', label: 'הרכב ששיתפו איתכם' } : null;
    const validSource = !route.action || ['edit', 'copy'].includes(route.action) && source?.config.productId === product?.id || ['favorite', 'share'].includes(route.action) && incoming;
    if (product && validSource) restoreScroll = productPage(product, route.action === 'edit' ? source : null, route.action === 'copy' ? source : null, incoming, route.returnToCheckout);
    else notFound();
  } else if (route.page === 'checkout') {
    restoreScroll = checkout.returnFromEdit?.scroll || 0;
    checkout.returnFromEdit = null;
    checkoutPage();
  }
  else if (route.page === 'repeat') repeatPage();
  else if (route.page === 'done') donePage();
  else home();
  const bar = document.querySelector('.buybar');
  if (bar) {
    const measure = () => document.documentElement.style.setProperty('--buybar-h', `${bar.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    teardown.push(() => observer.disconnect());
  } else document.documentElement.style.removeProperty('--buybar-h');
  window.scrollTo({ top: restoreScroll, behavior: 'instant' });
}

function navigate() {
  navigatePage(render, { pizza: Boolean(document.querySelector('.hero')) && ['menu', 'product'].includes(getRoute().page) });
}

function refreshOpeningState() {
  if (document.hidden || checkout.submitting) return;
  const status = openingStatus();
  const label = document.querySelector('[data-opening-label]');
  if (label) label.textContent = `${status.label}${shop.demoOnly ? ' · לדוגמה' : ''}`;
  const closed = document.querySelector('[data-hero-closed]');
  if (closed) closed.hidden = status.open;
  if (getRoute().page === 'checkout') { refreshPickupSchedule(); refreshCheckoutParts(); }
}
setInterval(refreshOpeningState, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshOpeningState(); });
window.addEventListener('hashchange', navigate);
history.scrollRestoration = 'manual';
const syncPageVisibility = () => document.documentElement.classList.toggle('is-page-hidden', document.hidden);
document.addEventListener('visibilitychange', syncPageVisibility);
syncPageVisibility();
render();
