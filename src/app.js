import { shop, activeProducts, findProduct } from './data.js?v=20260928-flow2';
import { money, PLACEMENTS, variantsFor, defaultConfig, normalizeConfig, choicePrice, unitPrice, priceBreakdown, describe, lineTotal } from './order.js?v=20260928-flow2';
import { pizzaState, pizzaSVG, updatePizza, shapeIcon } from './pizza.js?v=20260928-flow2';
import { getCart, getLine, cartCount, cartSubtotal, onCartChange, addLine, updateLine, removeLine, clearCart, saveLastOrder, getLastOrder, getDraft, saveDraft, clearDraft, getMode, saveMode, getFavorites, getFavorite, matchingFavorite, saveFavorite, removeFavorite, onFavoritesChange, favoriteStorageIsPersistent } from './store.js?v=20260928-flow2';
import { verifyAddress, isOpen, submitOrder } from './services.js?v=20260928-flow2';
import { configurationLink, decodeConfiguration } from './config-links.js?v=20260928-flow2';
import { searchAddresses, zoneForAddress } from './address.js?v=20260928-flow2';

const app = document.querySelector('#app');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
let teardown = [];
let freshBuilder = false;
let stopAddressLookup = () => {};

/* ---------- אייקונים ---------- */

const ICONS = {
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
  return `<button class="cart-button" type="button" data-open-cart aria-label="${cartLabel(count)}">${icon('box')}<span class="cart-button__count" data-cart-count ${count ? '' : 'hidden'}>${count}</span></button>`;
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

const phoneHref = () => `tel:${shop.phone.replace(/[^\d+]/g, '')}`;
const wazeHref = () => `https://waze.com/ul?q=${encodeURIComponent(shop.location.address)}&navigate=yes`;
const mapsHref = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.location.address)}`;

function contactButtons(className) {
  return `<a class="${className}" href="${phoneHref()}" aria-label="התקשרות לפיצרייה">${icon('phone')}</a><button type="button" class="${className}" data-open-info aria-label="מיקום ושעות">${icon('pin')}</button>`;
}

function productArt(product, config, label = '') {
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

const detailText = (info) => [...info.singles, ...info.extras.map((extra) => extra.text)].join(' · ');

function priceMarkup(product, config, quantity) {
  const price = priceBreakdown(product, config, quantity);
  return `<dl class="price-rows">${price.rows.map((row) => `<div><dt>${safe(row.name)}</dt><dd><bdi>${row.amount ? money(row.amount) : 'כלול'}</bdi></dd></div>`).join('')}
    ${quantity > 1 ? `<div class="price-rows__unit"><dt>מחיר ליחידה</dt><dd><bdi>${money(price.unit)}</bdi></dd></div><div><dt>כמות</dt><dd><bdi>× ${quantity}</bdi></dd></div>` : ''}
    <div class="price-rows__total"><dt>סה״כ${quantity > 1 ? ` ל־${quantity} יח׳` : ''}</dt><dd><bdi>${money(price.total)}</bdi></dd></div></dl>`;
}

function productHref() {
  const list = activeProducts();
  return list.length === 1 ? `#/product/${list[0].id}` : '#/menu';
}

/* ---------- מסך פתיחה ---------- */

function home() {
  const list = activeProducts();
  const unavailable = list.length === 0;
  const title = unavailable ? 'אין מוצרים זמינים\nכרגע.' : list.length === 1 ? shop.heroTitle : shop.multiHeroTitle;
  const description = unavailable ? 'אפשר לחזור לכאן בהמשך.' : list.length === 1 ? shop.heroDescription : shop.multiHeroDescription;
  const closed = !isOpen();
  app.innerHTML = `<main class="hero" aria-labelledby="hero-title">
    <picture class="hero__media"><source media="(max-width: 700px)" srcset="${safe(shop.heroImages.mobile)}" /><img src="${safe(shop.heroImages.desktop)}" alt="${safe(shop.heroImages.alt)}" fetchpriority="high" /></picture>
    <div class="hero__shade" aria-hidden="true"></div>
    <div class="hero__heat" aria-hidden="true"></div>
    <header class="hero__top">${brand()}<div class="topbar__end"><span class="demo-pill demo-pill--hero">אתר הדגמה<span class="demo-pill__more"> · תמונות ומחירים להמחשה</span></span><span class="hero__cart" data-hero-cart ${cartCount() ? '' : 'hidden'}>${cartButton()}</span></div></header>
    <div class="hero__body">
      <h1 id="hero-title">${safe(title).replace(/\n/g, '<br />')}</h1>
      <p class="hero__lead">${safe(description)}</p>
      ${unavailable ? '' : `<div class="hero__actions" role="group" aria-label="איך תרצו לקבל את ההזמנה?">
        <a class="button button--primary hero__cta" href="${productHref()}" data-mode="delivery"><span>משלוח</span>${icon('delivery')}</a>
        <a class="button hero__cta hero__cta--pickup" href="${productHref()}" data-mode="pickup"><span>איסוף עצמי</span>${icon('pickup')}</a>
      </div>`}
      ${closed ? `<p class="hero__closed">${icon('alert')}<span>לפי שעות הדוגמה, הפיצרייה סגורה כרגע. ההזמנות נפתחות ב־${shop.hours.opensAt}.</span></p>` : ''}
      <div class="hero__utilities" role="group" aria-label="טלפון ומיקום">
        <button type="button" class="hero__utility" data-hero-contact="phone" aria-label="הצגת מספר הטלפון" aria-expanded="false" aria-controls="hero-contact-panel">${icon('phone')}</button>
        <button type="button" class="hero__utility" data-hero-contact="location" aria-label="הצגת הכתובת והניווט" aria-expanded="false" aria-controls="hero-contact-panel">${icon('pin')}</button>
        ${getFavorites().length ? `<button type="button" class="hero__utility" data-open-favorites aria-label="המועדפים שלי">${icon('heart')}</button>` : ''}
        <div class="hero__contact-panel" id="hero-contact-panel" aria-hidden="true" inert></div>
      </div>
    </div>
    <p class="hero__hours">${icon('clock')}<span>שעות לדוגמה <bdi>${safe(shop.hours.opensAt)}–${safe(shop.hours.closesAt)}</bdi></span></p>
  </main>`;
}

function heroContactContent(kind) {
  const heading = kind === 'phone' ? 'טלפון לדוגמה' : 'כתובת לדוגמה';
  const detail = kind === 'phone'
    ? `<a class="hero__contact-value" href="${phoneHref()}"><bdi>${safe(shop.phone)}</bdi>${icon('phone')}</a>`
    : `<p class="hero__contact-address">${safe(shop.location.address)}</p><a class="hero__contact-nav" href="${safe(wazeHref())}" target="_blank" rel="noopener">ניווט ב־Waze ${icon('forward')}</a>`;
  return `<div class="hero__contact-head"><span>${heading}</span><button type="button" data-hero-contact-close aria-label="סגירה">${icon('close')}</button></div>${detail}`;
}

function closeHeroContact() {
  const utilities = document.querySelector('.hero__utilities');
  if (!utilities) return;
  const panel = utilities.querySelector('.hero__contact-panel');
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
  const side = window.innerWidth >= 900 && utilityBox.left > panelBox.width + 28;
  panel.classList.toggle('is-side', side);
  panel.classList.toggle('is-up', !side && roomBelow < panelBox.height + 20);
  panel.style.setProperty('--hero-panel-shift', `${Math.min(0, window.innerHeight - utilityBox.top - panelBox.height - 16)}px`);
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  panel.inert = false;
  utilities.querySelectorAll('[data-hero-contact]').forEach((button) => button.setAttribute('aria-expanded', String(button.dataset.heroContact === kind)));
}

/* ---------- תפריט ---------- */

function menu() {
  const list = activeProducts();
  app.innerHTML = `${topbar('#/')}
    <main class="page menu-page"><div class="wrap">
      <header class="page-head"><h1>מה מכינים היום?</h1><p>בוחרים מוצר, ואז מרכיבים אותו בדיוק כמו שאוהבים.</p></header>
      ${getFavorites().length ? `<button type="button" class="link-button menu-favorites" data-open-favorites>${icon('heart')}המועדפים שלי</button>` : ''}
      <ul class="menu-list">${list.map((product) => {
        const price = Math.min(...variantsFor(product).map((variant) => variant.price));
        return `<li><a class="menu-item" href="#/product/${safe(product.id)}">
          <span class="menu-item__art">${productArt(product, { ...defaultConfig(product), variantId: variantsFor(product).at(-1).id })}</span>
          <span class="menu-item__text"><strong>${safe(product.name)}</strong><span>${safe(product.description)}</span></span>
          <span class="menu-item__price">החל מ־<bdi>${money(price)}</bdi></span>
          <span class="menu-item__go">${icon('forward')}</span>
        </a></li>`;
      }).join('')}</ul>
    </div></main>`;
}

/* ---------- מסך הרכבה ---------- */

function variantSection(product, config) {
  if (!product.variants?.length || product.variants.length < 2) return '';
  return `<fieldset class="field-group"><legend class="field-group__head"><span class="field-group__title">איזה גודל?</span></legend>
    <div class="tile-row tile-row--3">${product.variants.map((variant) => `<label class="tile tile--size">
      <input type="radio" name="variant" value="${safe(variant.id)}" ${variant.id === config.variantId ? 'checked' : ''} />
      <span class="tile__surface">
        ${product.visual === 'pizza' ? `<span class="size-disc" style="--s:${variant.scale ?? 1}" aria-hidden="true"></span>` : ''}
        <strong>${safe(variant.name)}</strong>${variant.detail ? `<small>${safe(variant.detail)}</small>` : ''}
        ${variant.diameterCm > 0 || variant.slices > 0 ? `<span class="tile__measure">${variant.diameterCm > 0 ? `<span><bdi>${safe(variant.diameterCm)}</bdi> ס״מ</span>` : ''}${variant.slices > 0 ? `<span><bdi>${safe(variant.slices)}</bdi> משולשים</span>` : ''}</span>` : ''}<bdi>${money(variant.price)}</bdi>
      </span>
    </label>`).join('')}</div></fieldset>`;
}

function singleGroup(group, value) {
  return `<fieldset class="field-group"><legend class="field-group__head"><span class="field-group__title">${safe(group.name)}</span></legend>
    <div class="tile-row tile-row--${Math.min(group.choices.length, 3)}">${group.choices.map((choice) => `<label class="tile tile--option">
      <input type="radio" name="opt-${safe(group.id)}" value="${safe(choice.id)}" ${choice.id === value ? 'checked' : ''} />
      <span class="tile__surface">
        ${choice.crust ? `<svg class="crust-icon" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="${choice.crust === 'thin' ? 15.5 : 14}" fill="none" stroke="currentColor" stroke-width="${choice.crust === 'thin' ? 2 : 5}"/></svg>` : ''}
        <strong>${safe(choice.name)}</strong>${choice.detail ? `<small>${safe(choice.detail)}</small>` : ''}<bdi>${choice.price ? `+${money(choice.price)}` : 'כלול'}</bdi>
      </span>
    </label>`).join('')}</div></fieldset>`;
}

function multiGroup(group, value) {
  return `<fieldset class="field-group"><legend class="field-group__head"><span class="field-group__title">${safe(group.name)}</span><span class="field-group__hint">${group.placement ? 'אפשר לבחור כמה, גם על חצי פיצה' : 'אפשר לבחור כמה'}</span></legend>
    <div class="topping-grid">${group.choices.map((choice) => {
      const placement = value?.[choice.id];
      return `<div class="topping" data-choice="${safe(choice.id)}">
        <label class="topping__main">
          <input type="checkbox" name="multi-${safe(group.id)}" value="${safe(choice.id)}" ${placement ? 'checked' : ''} />
          ${choice.shape ? `<span class="topping__art">${shapeIcon(choice.shape)}</span>` : ''}
          <span class="topping__name">${safe(choice.name)}</span>
          <span class="topping__price" data-price-for="${safe(choice.id)}">${choice.price ? `+${money(choicePrice(choice, placement || 'whole'))}` : 'כלול'}</span>
          <span class="topping__check">${icon('check')}</span>
        </label>
        ${group.placement ? `<button type="button" class="topping__placement-toggle" data-placement-toggle aria-expanded="false" aria-controls="placement-${safe(group.id)}-${safe(choice.id)}" aria-label="מיקום ${safe(choice.name)}: ${placementLabel(placement || 'whole')}. שינוי מיקום"><span data-placement-label>${placementLabel(placement || 'whole')}</span>${icon('down')}</button>
        <div class="placement" id="placement-${safe(group.id)}-${safe(choice.id)}" role="radiogroup" aria-label="איפה לשים ${safe(choice.name)}?">${Object.entries(PLACEMENTS).map(([key, info]) => `<label class="placement__option">
          <input type="radio" name="place-${safe(group.id)}-${safe(choice.id)}" value="${key}" aria-label="${info.label}" ${(placement || 'whole') === key ? 'checked' : ''} />
          <span aria-hidden="true">${placementIcon(key)}${key === 'whole' ? 'שלמה' : key === 'right' ? 'ימין' : 'שמאל'}</span>
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
  const config = { productId: product.id, variantId: form.elements.variant?.value || variantsFor(product)[0].id, options: {}, note: form.elements.note.value };
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

function productPage(product, editLine, copyLine, source) {
  const list = activeProducts();
  const back = list.length > 1 ? '#/menu' : '#/';
  let draftKey = source?.key || (editLine ? `edit:${editLine.id}` : copyLine ? `copy:${copyLine.id}` : `product:${product.id}`);
  const draft = getDraft(draftKey, product);
  let config = draft?.config || source?.config || (editLine || copyLine ? normalizeConfig(product, (editLine || copyLine).config) : defaultConfig(product));
  let quantity = draft?.qty ?? source?.qty ?? editLine?.qty ?? 1;
  let hasDraft = Boolean(draft);
  let savedScroll = draft?.scroll || 0;
  const isPizza = product.visual === 'pizza';
  const variantScales = variantsFor(product).length > 1 ? variantsFor(product).map((variant) => variant.scale ?? 1) : [];

  app.innerHTML = `${topbar(back)}
    <main class="builder${isPizza ? '' : ' builder--flat'}">
      <section class="stage" aria-label="התצוגה של ${safe(product.name)}">
        ${isPizza ? `<span class="stage__live"><span class="stage__live-dot" aria-hidden="true"></span>תצוגה חיה</span>` : ''}
        ${isPizza ? `<button type="button" class="stage__expand" data-expand-pizza aria-label="הגדלת תצוגת הפיצה ועריכת חצאים" aria-haspopup="dialog">${icon('expand')}</button>` : ''}
        <div class="stage__canvas">${isPizza ? '<span class="stage__flare" aria-hidden="true"></span>' : ''}<div class="stage__pizza" id="stage-art">${isPizza ? pizzaSVG(pizzaState(product, config), { rings: variantScales, label: `הדמיה של ${product.name} לפי הבחירות שלכם` }) : productArt(product, config, product.name)}</div></div>
        <div class="stage__summary"><p class="stage__title" id="stage-title"></p><p class="stage__detail" id="stage-detail"></p>${isPizza ? '<p class="stage__compact" id="stage-compact"></p>' : ''}</div>
      </section>
      <form class="builder__form" id="builder-form" novalidate>
        <header class="builder__intro"><h1>${safe(product.name)}</h1><p>${safe(product.description)}</p>${copyLine ? `<p class="builder__resume">${icon('copy')}<span>עותק חדש לעריכה · המקור נשאר בסל</span></p>` : ''}${source ? `<p class="builder__resume">${icon(source.kind === 'favorite' ? 'heart' : 'share')}<span>${safe(source.label)} · המחיר לפי התפריט הנוכחי</span></p>` : ''}</header>
        <section class="builder-tools" aria-label="שמירה ושיתוף של ההרכב">
          <div class="builder-tools__actions">
            <button type="button" data-save-toggle aria-expanded="false" aria-controls="favorite-editor">${icon('heart')}<span data-save-label>שמירה</span></button>
            <button type="button" data-open-favorites><span>המועדפים שלי</span><span class="builder-tools__count" data-favorite-count hidden></span></button>
            <button type="button" data-share-toggle aria-expanded="false" aria-controls="share-editor">${icon('share')}<span>שיתוף</span></button>
          </div>
          <div class="builder-tools__panel" id="favorite-editor" hidden>
            <label for="favorite-name">איך לקרוא להרכב הקבוע?</label>
            <div class="builder-tools__save"><input class="input" id="favorite-name" maxlength="40" dir="auto" value="${safe(source?.kind === 'favorite' ? source.name : 'הקבועה שלי')}" autocomplete="off" /><button type="button" class="button button--quiet button--small" data-save-favorite>שמירה</button></div>
            <p>שמור במכשיר הזה, בלי לפתוח חשבון.</p>
            <p class="builder-tools__status" data-favorite-status role="status"></p>
          </div>
          <div class="builder-tools__panel" id="share-editor" hidden>
            <label for="share-link">קישור להרכב שלכם</label>
            <input class="input share-link" id="share-link" dir="ltr" type="url" readonly aria-describedby="share-hint" />
            <div class="builder-tools__share"><button type="button" class="button button--quiet button--small" data-copy-link>${icon('copy')}העתקת קישור</button>${typeof navigator.share === 'function' ? `<button type="button" class="link-button" data-native-share>${icon('share')}שיתוף</button>` : ''}</div>
            <p id="share-hint">רק ההרכב והכמות. הערות ופרטים אישיים אינם בקישור.</p>
            <p class="builder-tools__status" data-share-status role="status"></p>
          </div>
        </section>
        ${variantSection(product, config)}
        ${(product.optionGroups || []).map((group) => (group.type === 'single' ? singleGroup(group, config.options[group.id]) : multiGroup(group, config.options[group.id]))).join('')}
        <div class="field-group">
          <label class="field-group__head" for="kitchen-note"><span class="field-group__title">משהו שחשוב שנדע?</span><span class="field-group__hint">הערה למטבח, לא חובה</span></label>
          <textarea class="input" id="kitchen-note" name="note" dir="auto" rows="2" maxlength="200" placeholder="למשל: לחתוך לריבועים">${safe(config.note)}</textarea>
          ${(product.notePresets || []).length ? `<div class="note-presets" role="group" aria-label="קיצורי הערות למטבח, אפשר לבחור קיצור אחד">${product.notePresets.map((note) => `<button type="button" data-note-preset="${safe(note)}" aria-pressed="false">${icon('plus')}<span>${safe(note)}</span></button>`).join('')}</div><p class="note-presets__status" data-note-status role="status"></p>` : ''}
        </div>
        <div class="field-group field-group--inline"><span class="field-group__title" id="qty-title">כמות</span>${stepper({ value: quantity, label: 'כמות' })}</div>
      </form>
    </main>
    <div class="buybar"><p class="buybar__recovery" data-edit-recovery role="status" hidden></p><div class="buybar__basket" data-builder-basket hidden><button type="button" data-open-cart><span data-basket-current></span>${icon('down')}</button><span data-basket-projected></span></div><div class="buybar__inner">
      <div class="price-panel" id="price-panel" hidden><header><h2 tabindex="-1">מה כלול במחיר?</h2><button type="button" class="icon-button" data-close-price aria-label="סגירת פירוט המחיר">${icon('close')}</button></header><div data-price-content></div><p>${shop.demoOnly ? 'מחירי הדגמה. ' : ''}דמי משלוח, אם נבחר, מחושבים בקופה.</p></div>
      <button type="button" class="buybar__total buybar__price" data-price-toggle aria-expanded="false" aria-controls="price-panel"><span>פירוט מחיר ${icon('down')}</span><strong id="bar-total"></strong></button>
      <button type="button" id="add-to-cart" class="button button--primary buybar__cta"><span id="add-label"></span>${icon('forward')}</button>
    </div></div>
    <p class="visually-hidden" aria-live="polite" id="builder-status"></p>`;

  const form = document.querySelector('#builder-form');
  // הגודל הוא הבחירה הראשונה. פעולות שמירה ושיתוף מצטרפות אחרי הבחירה הזו.
  if ((product.variants || []).length > 1) form.querySelector('fieldset').after(form.querySelector('.builder-tools'));
  const art = document.querySelector('#stage-art');
  const status = document.querySelector('#builder-status');
  const saveToggle = form.querySelector('[data-save-toggle]');
  const shareToggle = form.querySelector('[data-share-toggle]');
  const favoriteEditor = form.querySelector('#favorite-editor');
  const shareEditor = form.querySelector('#share-editor');
  const noteInput = form.elements.note;
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
    const count = getFavorites().length;
    const countNode = form.querySelector('[data-favorite-count]');
    countNode.textContent = count;
    countNode.hidden = !count;
  };
  const resolveEditedLine = () => {
    const original = editLine ? getLine(editLine.id) : null;
    if (editLine && !original) {
      editLine = null;
      clearDraft(draftKey);
      draftKey = `product:${product.id}`;
      hasDraft = true;
      saveDraft(draftKey, product, { config, qty: quantity, scroll: savedScroll });
      history.replaceState(null, '', `#/product/${product.id}`);
      const recovery = document.querySelector('[data-edit-recovery]');
      recovery.textContent = 'הפריט הוסר מהסל. הבחירות נשמרו להוספה מחדש.';
      recovery.hidden = false;
      document.querySelector('#add-label').textContent = 'הוספה לסל';
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
    if (hasDraft && !freshBuilder) saveDraft(draftKey, product, { config, qty: quantity, scroll: savedScroll });
  };
  const rememberSelection = () => { hasDraft = true; flushDraft(); };
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
    const unit = unitPrice(product, config);
    const total = unit * quantity;
    document.querySelector('#stage-title').textContent = quantity > 1 ? `${info.title} · ${quantity} יח׳` : info.title;
    const details = detailText(info);
    document.querySelector('#stage-detail').textContent = isPizza && !drawn.toppings.length
      ? `${details ? `${details} · ` : ''}תוספות שתבחרו יופיעו כאן`
      : details || 'בלי תוספות';
    if (isPizza) {
      const toppingCount = info.extras.length;
      const toppingSummary = toppingCount === 0 ? 'בלי תוספות' : toppingCount === 1 ? 'תוספת אחת' : `${toppingCount} תוספות`;
      document.querySelector('#stage-compact').textContent = [info.singles[0], toppingSummary].filter(Boolean).join(' · ');
    }
    document.querySelector('#bar-total').textContent = money(total);
    document.querySelector('#add-label').textContent = editLine ? 'עדכון בסל' : 'הוספה לסל';
    document.querySelector('[data-price-toggle]').setAttribute('aria-label', `פירוט המחיר, ${money(total)}`);
    document.querySelector('[data-price-content]').innerHTML = priceMarkup(product, config, quantity);
    syncSaved();
    syncNotePresets();
    syncBasket();
    form.querySelector('#share-link').value = configurationLink(window.location.href, product, config, quantity, !product.active);
    form.querySelector('output').textContent = quantity;
    form.querySelector('[data-qty="minus"]').disabled = quantity <= 1;
    form.querySelector('[data-qty="plus"]').disabled = quantity >= 99;
    for (const group of product.optionGroups || []) {
      if (group.type !== 'multi') continue;
      for (const choice of group.choices) {
        const label = form.querySelector(`[data-price-for="${CSS.escape(choice.id)}"]`);
        if (label && choice.price) label.textContent = `+${money(choicePrice(choice, config.options[group.id]?.[choice.id] || 'whole'))}`;
        const topping = label?.closest('.topping');
        const placement = config.options[group.id]?.[choice.id] || 'whole';
        const toggle = topping?.querySelector('[data-placement-toggle]');
        if (toggle) {
          toggle.querySelector('[data-placement-label]').textContent = placementLabel(placement);
          toggle.setAttribute('aria-label', `מיקום ${choice.name}: ${placementLabel(placement)}. שינוי מיקום`);
        }
      }
    }
  };

  form.addEventListener('change', (event) => {
    const previous = config;
    config = readConfig(form, product);
    if (isPizza) {
      const next = pizzaState(product, config);
      updatePizza(art.querySelector('svg'), drawn, next);
      drawn = next;
    }
    const target = event.target;
    if (target.name?.startsWith('multi-')) {
      const name = target.closest('.topping').querySelector('.topping__name').textContent;
      closePlacement(target.closest('.topping'));
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
    if (event.target.name === 'note') { config = { ...config, note: event.target.value }; syncNotePresets(); syncSaved(); rememberSelection(); }
  });
  form.addEventListener('click', (event) => {
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
    const button = event.target.closest('[data-qty]');
    if (!button) return;
    quantity = Math.max(1, Math.min(99, quantity + (button.dataset.qty === 'plus' ? 1 : -1)));
    refresh();
    rememberSelection();
    status.textContent = `כמות: ${quantity}`;
    reactToChoice(art, false);
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
    if (event.key === 'Enter' && event.target.id === 'favorite-name') { event.preventDefault(); form.querySelector('[data-save-favorite]').click(); }
    if (event.key === 'Escape' && (!favoriteEditor.hidden || !shareEditor.hidden)) { const toggle = favoriteEditor.hidden ? shareToggle : saveToggle; favoriteEditor.hidden = true; shareEditor.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus({ preventScroll: true }); }
  });
  form.addEventListener('submit', (event) => event.preventDefault());

  const setPreviewConfig = (nextConfig) => {
    config = normalizeConfig(product, nextConfig);
    for (const group of product.optionGroups || []) {
      if (group.type !== 'multi') continue;
      for (const choice of group.choices) {
        const checkbox = form.querySelector(`input[name="multi-${CSS.escape(group.id)}"][value="${CSS.escape(choice.id)}"]`);
        checkbox.checked = Boolean(config.options[group.id]?.[choice.id]);
        const placement = config.options[group.id]?.[choice.id] || 'whole';
        const radio = form.querySelector(`input[name="place-${CSS.escape(group.id)}-${CSS.escape(choice.id)}"][value="${placement}"]`);
        if (radio) radio.checked = true;
        closePlacement(checkbox.closest('.topping'));
      }
    }
    const next = pizzaState(product, config);
    updatePizza(art.querySelector('svg'), drawn, next);
    drawn = next;
    refresh();
    rememberSelection();
    status.textContent = `הפיצה עודכנה, סה״כ ${money(unitPrice(product, config) * quantity)}`;
  };
  document.querySelector('[data-expand-pizza]')?.addEventListener('click', () => openPizzaPreview(product, config, quantity, setPreviewConfig));

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
    const button = event.currentTarget;
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
    if (!line) { button.disabled = false; refresh(); return; }
    document.querySelector('[data-edit-recovery]').hidden = true;
    clearDraft(draftKey);
    draftKey = `product:${product.id}`;
    hasDraft = false;
    history.replaceState(null, '', `#/product/${product.id}`);
    refresh();
    const route = window.location.hash;
    try { await flyToCart(art); } finally { button.disabled = false; }
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
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--ember').trim();
  for (const element of [total, label]) {
    element.getAnimations().forEach((animation) => animation.cancel());
    element.animate([
      { color: accent, transform: 'translateY(3px)', opacity: .72 },
      { color: getComputedStyle(element).color, transform: 'translateY(0)', opacity: 1 },
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

// במובייל הפיצה מתכווצת לפינה בזמן גלילה, כדי שתישאר גלויה ליד הבחירות.
function setupStage(stage) {
  const pizza = stage.querySelector('.stage__pizza');
  const mobile = window.matchMedia('(max-width: 899px)');
  let metrics = null;
  let frame = 0;
  const measure = () => {
    pizza.style.transform = '';
    if (!mobile.matches) { metrics = null; stage.classList.remove('is-compact'); stage.style.setProperty('--p', 0); return; }
    const band = parseFloat(getComputedStyle(stage).getPropertyValue('--band')) || 72;
    const height = stage.offsetHeight;
    const width = stage.clientWidth;
    const size = pizza.offsetWidth;
    const small = band - 24;
    const top = pizza.offsetTop;
    metrics = { travel: height - band, dx: 16 - pizza.offsetLeft, dy: height - band + 12 - top, k: small / size };
  };
  const update = () => {
    frame = 0;
    if (!metrics) return;
    const p = Math.min(1, Math.max(0, window.scrollY / metrics.travel));
    stage.style.setProperty('--p', p.toFixed(3));
    stage.classList.toggle('is-compact', p >= .92);
    pizza.style.transform = `translate(${(metrics.dx * p).toFixed(1)}px, ${(metrics.dy * p).toFixed(1)}px) scale(${(1 - (1 - metrics.k) * p).toFixed(3)})`;
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  const onResize = () => { measure(); update(); };
  measure();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    cancelAnimationFrame(frame);
  };
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

function openPizzaPreview(product, config, quantity, onChange) {
  previewReturnPosition = { top: window.scrollY, left: window.scrollX };
  previewReturnRoute = window.location.hash;
  previewEditor = { product, config: normalizeConfig(product, config), quantity, onChange, scope: 'whole' };
  const selection = describe(product, config);
  const state = { ...pizzaState(product, config), scale: 1 };
  const groups = (product.optionGroups || []).filter((group) => group.type === 'multi' && group.placement);
  pizzaPreview.innerHTML = `<div class="pizza-preview__shell">
    <header class="pizza-preview__head"><h2 id="pizza-preview-title">${safe(selection.title)}${quantity > 1 ? ` · ${quantity} יח׳` : ''}</h2><button type="button" class="icon-button" data-close-preview aria-label="סגירת תצוגת הפיצה">${icon('close')}</button></header>
    ${groups.length ? '<p class="pizza-preview__hint">נוגעים בחצי שרוצים לערוך</p>' : ''}
    <div class="pizza-preview__art" data-scope="whole">${pizzaSVG(state, { label: `הדמיה מוגדלת של ${safe(product.name)} לפי הבחירות שלכם`, editable: groups.length > 0 })}
      ${groups.length ? `<div class="pizza-preview__hitareas"><button type="button" data-preview-scope="right" aria-label="עריכת חצי ימין" aria-pressed="false"></button><button type="button" data-preview-scope="left" aria-label="עריכת חצי שמאל" aria-pressed="false"></button></div>` : ''}
    </div>
    ${groups.length ? `<div class="pizza-preview__scope" role="group" aria-label="איזה חלק של הפיצה עורכים?">${Object.entries(PLACEMENTS).map(([key, value]) => `<button type="button" data-preview-scope="${key}" aria-label="${value.label}" aria-pressed="${key === 'whole'}">${placementIcon(key)}${key === 'whole' ? 'שלמה' : key === 'right' ? 'ימין' : 'שמאל'}</button>`).join('')}</div>
    <div class="pizza-preview__options">${groups.map((group) => `<fieldset><legend class="visually-hidden">${safe(group.name)}</legend><div class="preview-choices">${group.choices.map((choice) => `<button type="button" class="preview-choice" data-preview-group="${safe(group.id)}" data-preview-choice="${safe(choice.id)}" aria-pressed="false">${choice.shape ? `<span class="preview-choice__art">${shapeIcon(choice.shape)}</span>` : ''}<span class="preview-choice__text"><strong>${safe(choice.name)}</strong><small data-preview-detail></small></span><span class="preview-choice__check">${icon('check')}</span></button>`).join('')}</div></fieldset>`).join('')}</div>` : ''}
    <footer class="pizza-preview__foot"><p data-preview-description></p><details class="preview-price"><summary aria-label="פירוט מחיר הפיצה"><bdi data-preview-total></bdi><span>פירוט מחיר ${icon('down')}</span></summary><div data-preview-price></div></details><button type="button" class="button pizza-preview__return" data-close-preview>חזרה לבחירות ${icon('back')}</button></footer>
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
  pizzaPreview.querySelector('[data-preview-description]').textContent = detailText(selection) || 'בלי תוספות';
  pizzaPreview.querySelector('[data-preview-total]').textContent = money(unitPrice(product, config) * quantity);
  pizzaPreview.querySelector('[data-preview-price]').innerHTML = priceMarkup(product, config, quantity);
  pizzaPreview.querySelector('.pizza-preview__art').dataset.scope = scope;
  pizzaPreview.querySelectorAll('[data-preview-scope]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.previewScope === scope)));
  pizzaPreview.querySelectorAll('[data-preview-choice]').forEach((button) => {
    const group = product.optionGroups.find((item) => item.id === button.dataset.previewGroup);
    const choice = group.choices.find((item) => item.id === button.dataset.previewChoice);
    const placement = config.options[group.id]?.[choice.id];
    const selected = placement === 'whole' || placement === scope;
    const price = choicePrice(choice, placement || scope);
    button.setAttribute('aria-pressed', String(Boolean(selected)));
    button.setAttribute('aria-label', `${choice.name}, ${PLACEMENTS[scope].label}, ${selected ? 'נבחרה. הסרה מהחלק הזה' : 'הוספה לחלק הזה'}`);
    button.querySelector('[data-preview-detail]').textContent = placement ? `${PLACEMENTS[placement].label} · ${price ? money(price) : 'כלול'}` : price ? `+${money(price)}` : 'כלול';
  });
}

pizzaPreview.addEventListener('click', (event) => {
  if (event.target === pizzaPreview || event.target.closest('[data-close-preview]')) { pizzaPreview.close(); return; }
  if (!previewEditor) return;
  const scopeButton = event.target.closest('[data-preview-scope]');
  if (scopeButton) { previewEditor.scope = scopeButton.dataset.previewScope; refreshPizzaPreview(); return; }
  const choiceButton = event.target.closest('[data-preview-choice]');
  if (!choiceButton) return;
  const { product, scope, config, onChange } = previewEditor;
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
  updatePizza(pizzaPreview.querySelector('.pizza'), { ...pizzaState(product, config), scale: 1 }, { ...pizzaState(product, next), scale: 1 });
  previewEditor.config = next;
  onChange(next);
  refreshPizzaPreview();
  pizzaPreview.querySelector('[data-preview-status]').textContent = `הבחירות עודכנו. סה״כ ${money(unitPrice(product, next) * previewEditor.quantity)}`;
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
    <div class="add-confirm__product"><div class="add-confirm__art">${productArt(product, line.config)}</div><div><h3>${safe(selection.title)}</h3><p>${safe(detailText(selection) || 'בלי תוספות')}</p><strong><bdi>${money(lineTotal(line, product))}</bdi><span> · ${line.qty} יח׳</span></strong></div></div>
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

function cartLineMarkup(line) {
  const product = findProduct(line.config.productId);
  const info = describe(product, line.config);
  const details = detailText(info);
  return `<li class="cart-line" data-line="${safe(line.id)}">
    <span class="cart-line__art">${productArt(product, line.config)}</span>
    <div class="cart-line__body">
      <h3>${safe(info.title)}</h3>
    </div>
    <div class="cart-line__side"><bdi class="cart-line__price" data-line-price>${money(lineTotal(line, product))}</bdi>${stepper({ value: line.qty, label: `כמות של ${info.title}`, attr: 'data-line-qty', small: true })}</div>
    <div class="cart-line__details">${details ? `<p>${safe(details)}</p>` : ''}${line.config.note ? `<p class="cart-line__note">הערה: <bdi>${safe(line.config.note)}</bdi></p>` : ''}</div>
    <div class="cart-line__actions"><a href="#/product/${safe(product.id)}/edit/${safe(line.id)}" data-close-sheet>עריכה</a><a href="#/product/${safe(product.id)}/copy/${safe(line.id)}" data-copy-line="${safe(line.id)}" data-close-sheet>${icon('copy')}שכפול ושינוי</a><button type="button" data-remove>הסרה</button></div>
  </li>`;
}

function renderCart() {
  const cart = getCart();
  const count = cartCount();
  sheet.innerHTML = `<div class="sheet__panel">
    <header class="sheet__head"><h2 id="cart-title">הסל שלכם</h2><span class="sheet__count" data-sheet-count>${count ? itemsText(count) : ''}</span><button type="button" class="icon-button" data-close-sheet aria-label="סגירת הסל">${icon('close')}</button></header>
    ${cart.length ? `<ul class="cart-lines">${cart.map(cartLineMarkup).join('')}</ul>
      <footer class="sheet__foot">
        <div class="sheet__subtotal"><span>סכום ביניים</span><strong data-sheet-subtotal>${money(cartSubtotal())}</strong></div>
        <p class="sheet__hint">${checkout.mode === 'pickup' ? 'איסוף עצמי נבחר. אפשר לשנות בקופה.' : 'משלוח נבחר. דמי המשלוח ייקבעו לפי הכתובת בקופה.'}</p>
        <a class="button button--primary" href="#/checkout" data-close-sheet><span>להמשך ההזמנה</span>${icon('forward')}</a>
        <a class="button button--quiet" href="${productHref()}" data-fresh-product>להוסיף עוד</a>
      </footer>`
    : `<div class="empty-state">
        <svg class="empty-state__art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 7"/><path d="M60 60 60 10A50 50 0 0 1 103.3 35Z" fill="currentColor" opacity=".18"/></svg>
        <p><strong>הסל עדיין ריק</strong>כל פיצה שתרכיבו תחכה כאן.</p>
        <a class="button button--primary" href="${productHref()}" data-close-sheet><span>מרכיבים פיצה</span>${icon('forward')}</a>
      </div>`}
  </div>`;
}

function openCart() {
  renderCart();
  if (!sheet.open) sheet.showModal();
  sheet.querySelector('.sheet__foot .button, .empty-state .button')?.focus();
}

sheet.addEventListener('click', (event) => {
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

document.addEventListener('click', (event) => {
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
  if (event.target.closest('[data-open-favorites]')) openFavorites();
  const modeLink = event.target.closest('[data-mode]');
  if (modeLink) rememberMode(modeLink.dataset.mode);
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeHeroContact(); });

/* ---------- מיקום ושעות ---------- */

const info = document.createElement('dialog');
info.className = 'sheet';
info.setAttribute('aria-labelledby', 'info-title');
document.body.append(info);

function openInfo() {
  const closed = !isOpen();
  info.innerHTML = `<div class="sheet__panel sheet__panel--info">
    <header class="sheet__head"><h2 id="info-title">מיקום ושעות</h2><button type="button" class="icon-button" data-close-info aria-label="סגירה">${icon('close')}</button></header>
    <div class="info">
      <p class="info__row">${icon('pin')}<span><strong>${safe(shop.location.address)}</strong><small>כתובת לדוגמה</small></span></p>
      <p class="info__row">${icon('clock')}<span><strong>${closed ? 'סגור עכשיו' : 'פתוח היום'} · <bdi>${shop.hours.opensAt}–${shop.hours.closesAt}</bdi></strong><small>שעות לדוגמה</small></span></p>
      <div class="info__actions">
        <a class="button button--quiet" href="${wazeHref()}" target="_blank" rel="noopener">ניווט ב־Waze</a><a class="button button--quiet" href="${mapsHref()}" target="_blank" rel="noopener">Google Maps</a><a class="button button--quiet info__call" href="${phoneHref()}">${icon('phone')}<span>התקשרות · <bdi>${safe(shop.phone)}</bdi></span></a>
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
    <div class="sheet__body"><p class="favorites-hint">${favoriteStorageIsPersistent() ? 'ההרכבים שמורים במכשיר הזה. המחיר מתעדכן לפי התפריט הנוכחי.' : 'האחסון במכשיר חסום. ההרכבים זמינים רק כל עוד העמוד פתוח.'}</p>
      ${favorites.length ? `<ul class="favorite-list">${favorites.map((favorite) => {
        const product = findProduct(favorite.config.productId);
        const info = describe(product, favorite.config);
        const active = available.some((item) => item.id === product.id);
        return `<li class="favorite-line"><span class="favorite-line__art">${productArt(product, favorite.config)}</span><div class="favorite-line__text"><h3>${safe(favorite.name)}</h3><p>${safe(info.title)}${favorite.qty > 1 ? ` · ${favorite.qty} יח׳` : ''}</p><strong><bdi>${money(unitPrice(product, favorite.config) * favorite.qty)}</bdi></strong>${active ? `<a class="link-button" href="#/product/${safe(product.id)}/favorite/${safe(favorite.id)}" data-load-favorite="${safe(favorite.id)}">בחירה ושינוי ${icon('forward')}</a>` : '<span class="favorite-line__unavailable">המוצר אינו זמין כרגע</span>'}</div><button type="button" class="icon-button" data-remove-favorite="${safe(favorite.id)}" aria-label="מחיקת ${safe(favorite.name)} מהמועדפים">${icon('close')}</button><details class="favorite-line__details"><summary>פירוט ההרכב ${icon('down')}</summary><p>${safe(detailText(info) || 'בלי תוספות')}</p>${favorite.config.note ? `<p>הערה: ${safe(favorite.config.note)}</p>` : ''}</details></li>`;
      }).join('')}</ul>` : `<div class="empty-state"><span class="favorites-empty" aria-hidden="true">${icon('heart')}</span><p><strong>ההרכב הקבוע מתחיל כאן</strong>מרכיבים בדיוק כמו שאוהבים ולוחצים על „שמירה”.</p><button type="button" class="button button--quiet" data-close-favorites>חזרה להרכבה</button></div>`}
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
  document.querySelectorAll('[data-cart-count]').forEach((node) => { node.textContent = count; node.hidden = count === 0; });
  document.querySelectorAll('[data-open-cart]').forEach((node) => node.setAttribute('aria-label', cartLabel(count)));
  document.querySelectorAll('[data-hero-cart]').forEach((node) => { node.hidden = count === 0; });
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
    } else {
      renderCart();
      if (change.type === 'remove') sheet.querySelector('.cart-line button, .sheet__foot .button, .empty-state .button')?.focus();
    }
  }
  if (getRoute().page === 'checkout') checkoutPage();
});

/* ---------- קופה ---------- */

function rememberMode(mode) {
  checkout.mode = mode;
  saveMode(mode);
}

const checkout = {
  mode: getMode(),
  address: { query: '', place: null, city: '', street: '', number: '', apartment: '', floor: '', instructions: '' },
  contact: { name: '', phone: '' },
  check: { status: 'idle' },
  errors: {},
  submitting: false,
  failure: false,
};

const validPhone = (value) => /^0(5\d{8}|[2-489]\d{7}|7\d{8})$/.test(value.replace(/[\s-]/g, ''));

function checkoutTotals() {
  const subtotal = cartSubtotal();
  const zone = checkout.check.status === 'ok' ? checkout.check.zone : null;
  const fee = checkout.mode === 'pickup' ? 0 : zone ? zone.fee : null;
  const shortBy = checkout.mode === 'delivery' && zone && subtotal < zone.minOrder ? zone.minOrder - subtotal : 0;
  return { subtotal, zone, fee, total: subtotal + (fee || 0), shortBy };
}

function field({ name, label, value, group, autocomplete = '', inputmode = '', wide = false, optional = false, type = 'text' }) {
  const error = checkout.errors[name];
  return `<div class="field field--${name}${wide ? ' field--wide' : ''}${error ? ' field--invalid' : ''}">
    <label for="f-${name}">${label}${optional ? ' <span class="field__optional">לא חובה</span>' : ''}</label>
    <input class="input" id="f-${name}" name="${name}" type="${type}" data-group="${group}" value="${safe(value)}" ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''} ${error ? `aria-invalid="true" aria-describedby="e-${name}"` : ''} dir="auto" />
    ${error ? `<p class="field__error" id="e-${name}">${error}</p>` : ''}
  </div>`;
}

function addressStatus() {
  const { status, zone } = checkout.check;
  if (status === 'checking') return `<div class="notice notice--pending"><span class="spinner" aria-hidden="true"></span><span>בודקים את הכתובת…</span></div>`;
  if (status === 'ok') {
    const { shortBy } = checkoutTotals();
    return `<div class="notice notice--ok">${icon('check')}<span><strong>הכתובת בתוך אזור השירות לדוגמה.</strong> דמי משלוח <bdi>${money(zone.fee)}</bdi> · מינימום להזמנה <bdi>${money(zone.minOrder)}</bdi></span></div>
      ${shortBy ? `<div class="notice notice--warn">${icon('alert')}<span><strong>חסרים <bdi>${money(shortBy)}</bdi> למינימום המשלוח.</strong> אפשר להוסיף עוד או לבחור איסוף עצמי.</span><a class="button button--small" href="${productHref()}">להוסיף עוד</a></div>` : ''}`;
  }
  if (status === 'out') return `<div class="notice notice--warn">${icon('alert')}<span><strong>הכתובת מחוץ לאזור המשלוחים.</strong> אפשר להזמין ולאסוף בעצמכם.</span><button type="button" class="button button--small" id="switch-pickup" data-switch-pickup>מעבר לאיסוף עצמי</button></div>`;
  if (status === 'invalid') return `<div class="notice notice--warn">${icon('alert')}<span>לא הצלחנו לאמת כתובת מלאה. בחרו שוב כתובת עם מספר בית מהרשימה.</span><button type="button" class="button button--small" data-switch-pickup>מעבר לאיסוף עצמי</button></div>`;
  if (status === 'unavailable') return `<div class="notice notice--warn">${icon('alert')}<span>שירות הכתובות לא זמין כרגע. אפשר לנסות שוב או לבחור איסוף עצמי.</span><button type="button" class="button button--small" data-check-address>ניסיון נוסף</button><button type="button" class="button button--small" data-switch-pickup>איסוף עצמי</button></div>`;
  return checkout.address.place ? `<button type="button" class="button button--quiet button--small" data-check-address>${icon('pin')}<span>בדיקת אזור השירות</span></button>` : '<p class="address-check__hint">בחרו כתובת מלאה מהרשימה כדי לחשב משלוח.</p>';
}

function checkoutState() {
  const open = isOpen();
  const totals = checkoutTotals();
  const out = checkout.mode === 'delivery' && checkout.check.status === 'out';
  const needsAddress = checkout.mode === 'delivery' && checkout.check.status !== 'ok';
  const blocked = !open || totals.shortBy > 0 || needsAddress;
  const reason = !open ? `סגור כרגע · נפתח ב־${shop.hours.opensAt}` : totals.shortBy ? `חסרים ${money(totals.shortBy)} למינימום` : out ? 'הכתובת מחוץ לאזור' : needsAddress ? checkout.check.status === 'checking' ? 'בודקים את הכתובת…' : 'בחרו כתובת למשלוח' : '';
  return { open, totals, blocked, reason };
}

function checkoutBarMarkup() {
  const { totals, blocked, reason } = checkoutState();
  return `<div class="buybar__total${reason ? ' buybar__total--reason' : ''}"><span>${reason || 'סכום לדוגמה'}</span><strong>${money(totals.total)}</strong></div>
    <button type="submit" form="checkout-form" class="button button--primary buybar__cta" ${blocked || checkout.submitting ? 'disabled' : ''}>
      ${checkout.submitting ? '<span class="spinner" aria-hidden="true"></span><span>מכינים אישור לדוגמה…</span>' : `<span>אישור לדוגמה · ${money(totals.total)}</span>${icon('forward')}`}
    </button>`;
}

// מעדכן רק את האזורים שתלויים בכתובת ובסכום, כדי לא לאבד פוקוס בטופס.
function refreshCheckoutParts() {
  const check = document.querySelector('#address-check');
  const focusWasInCheck = check?.contains(document.activeElement);
  if (check) check.innerHTML = addressStatus();
  const summary = document.querySelector('#summary');
  if (summary) summary.innerHTML = summaryMarkup();
  const bar = document.querySelector('#checkout-bar');
  if (bar) bar.innerHTML = checkoutBarMarkup();
  if (focusWasInCheck) (check.querySelector('button, a') || check).focus({ preventScroll: true });
}

function summaryMarkup() {
  const totals = checkoutTotals();
  return `<h2 class="summary__title">ההזמנה</h2>
    <ul class="summary__lines">${getCart().map((line) => {
      const product = findProduct(line.config.productId);
      const info = describe(product, line.config);
      return `<li><span class="summary__art">${productArt(product, line.config)}</span><span class="summary__text"><strong>${line.qty > 1 ? `${line.qty} × ` : ''}${safe(info.title)}</strong><small>${safe(detailText(info) || 'בלי תוספות')}</small></span><bdi>${money(lineTotal(line, product))}</bdi></li>`;
    }).join('')}</ul>
    <button type="button" class="link-button" data-open-cart>עריכת הסל</button>
    <dl class="summary__totals">
      <div><dt>סכום ביניים</dt><dd><bdi>${money(totals.subtotal)}</bdi></dd></div>
      <div><dt>${checkout.mode === 'pickup' ? 'איסוף עצמי' : 'משלוח'}</dt><dd>${checkout.mode === 'delivery' && checkout.check.status === 'out' ? 'לא זמין לכתובת' : totals.fee === null ? 'לפי הכתובת' : totals.fee === 0 ? 'ללא עלות' : `<bdi>${money(totals.fee)}</bdi>`}</dd></div>
      <div class="summary__grand"><dt>סה״כ לדוגמה</dt><dd><bdi>${money(totals.total)}</bdi></dd></div>
    </dl>
    ${totals.shortBy ? `<p class="summary__short">${icon('alert')}<span>חסרים <bdi>${money(totals.shortBy)}</bdi> למינימום המשלוח באזור שלכם. <a href="${productHref()}">להוסיף עוד</a></span></p>` : ''}`;
}

function checkoutPage(focusId) {
  stopAddressLookup();
  const cart = getCart();
  const focused = focusId || document.activeElement?.id;
  if (!cart.length) {
    app.innerHTML = `${topbar(productHref())}<main class="page"><div class="wrap"><div class="empty-state empty-state--page">
      <svg class="empty-state__art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 7"/></svg>
      <p><strong>אין עדיין מה להזמין</strong>מרכיבים פיצה, ואז חוזרים לכאן.</p>
      <a class="button button--primary" href="${productHref()}"><span>מרכיבים פיצה</span>${icon('forward')}</a></div></div></main>`;
    return;
  }
  const { open } = checkoutState();
  const { address, contact } = checkout;

  app.innerHTML = `${topbar(productHref())}
    <main class="page checkout"><div class="wrap checkout__layout">
      <form class="checkout__form" id="checkout-form" novalidate>
        <header class="page-head"><h1>קופה לדוגמה</h1><p>אפשר לשנות כאן את אופן הקבלה ולמלא פרטי קשר.</p></header>
        <div class="notice notice--warn" role="status">${icon('alert')}<span><strong>הדגמה בלבד:</strong> לא נשלחת הזמנה ולא מתבצע חיוב. אזורי השירות והמחירים הם דוגמאות.</span></div>
        ${!open ? `<div class="notice notice--warn" role="alert">${icon('alert')}<span><strong>הפיצרייה סגורה כרגע.</strong> ההזמנות נפתחות ב־${shop.hours.opensAt} (שעות לדוגמה). הסל נשמר בינתיים.</span></div>` : ''}
        ${checkout.failure ? `<div class="notice notice--error" role="alert" tabindex="-1" id="failure">${icon('alert')}<span><strong>בהדגמה דימינו תשלום שנכשל.</strong> לא בוצע חיוב ואפשר לנסות שוב.</span></div>` : ''}
        <fieldset class="field-group">
          <legend class="field-group__head"><span class="field-group__title">איך מקבלים את ההזמנה?</span></legend>
          <div class="tile-row tile-row--2">
            <label class="tile tile--mode"><input type="radio" id="mode-delivery" name="mode" value="delivery" ${checkout.mode === 'delivery' ? 'checked' : ''} /><span class="tile__surface">${icon('delivery', 'tile__icon')}<strong>משלוח</strong><small>עד הדלת, לפי אזור</small></span></label>
            <label class="tile tile--mode"><input type="radio" id="mode-pickup" name="mode" value="pickup" ${checkout.mode === 'pickup' ? 'checked' : ''} /><span class="tile__surface">${icon('pickup', 'tile__icon')}<strong>איסוף עצמי</strong><small>ללא דמי משלוח</small></span></label>
          </div>
        </fieldset>
        ${checkout.mode === 'delivery' ? `<fieldset class="field-group">
          <legend class="field-group__head"><span class="field-group__title">לאן לשלוח?</span><span class="field-group__hint">האזור והמחיר נקבעים לפי הכתובת</span></legend>
          <div class="field address-search${checkout.errors.addressQuery ? ' field--invalid' : ''}">
            <label for="f-addressQuery">רחוב, מספר בית ועיר</label>
            <div class="address-search__input"><input class="input" id="f-addressQuery" name="addressQuery" value="${safe(address.query)}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="address-results" aria-describedby="address-search-hint${checkout.errors.addressQuery ? ' e-addressQuery' : ''}" ${checkout.errors.addressQuery ? 'aria-invalid="true"' : ''} dir="auto" autocomplete="off" spellcheck="false" enterkeyhint="search" maxlength="160" placeholder="למשל: רוטשילד 10, תל אביב" /><button type="button" class="icon-button address-search__clear" data-clear-address aria-label="מחיקת הכתובת" ${address.query ? '' : 'hidden'}>${icon('close')}</button></div>
            <ul class="address-results" id="address-results" role="listbox" aria-label="הצעות לכתובת" hidden></ul>
            <p class="address-search__message" data-address-message role="status"></p>
            ${checkout.errors.addressQuery ? `<p class="field__error" id="e-addressQuery">${safe(checkout.errors.addressQuery)}</p>` : ''}
          </div>
          <div class="address-selected" data-address-selected ${address.place ? '' : 'hidden'}>${selectedAddressMarkup()}</div>
          <p class="address-search__hint" id="address-search-hint">חיפוש באמצעות <a href="https://photon.komoot.io/" target="_blank" rel="noopener">Photon</a> ו־<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>. הכתובת נשלחת לשירות החיפוש. תחומי המשלוח להמחשה בלבד.</p>
          <div class="address-check" id="address-check" tabindex="-1" aria-live="polite">${addressStatus()}</div>
          <div class="field-grid">
            ${field({ name: 'apartment', label: 'דירה', value: address.apartment, group: 'address', optional: true })}
            ${field({ name: 'floor', label: 'קומה', value: address.floor, group: 'address', inputmode: 'numeric', optional: true })}
            ${field({ name: 'instructions', label: 'הערות לשליח', value: address.instructions, group: 'address', optional: true, wide: true })}
          </div>
        </fieldset>` : `<section class="field-group pickup-card">
          ${icon('pin', 'pickup-card__icon')}<div><h2 class="field-group__title">איסוף מהפיצרייה</h2><p>${safe(shop.location.address)}</p><small>${safe(shop.pickup.readyHint)}</small>
            <div class="pickup-card__actions"><a class="button button--quiet button--small" href="${wazeHref()}" target="_blank" rel="noopener">ניווט ב־Waze</a><a class="button button--quiet button--small" href="${mapsHref()}" target="_blank" rel="noopener">Google Maps</a></div></div>
        </section>`}
        <fieldset class="field-group">
          <legend class="field-group__head"><span class="field-group__title">איך נשיג אתכם?</span></legend>
          <div class="field-grid">
            ${field({ name: 'name', label: 'שם', value: contact.name, group: 'contact', autocomplete: 'name' })}
            ${field({ name: 'phone', label: 'טלפון', value: contact.phone, group: 'contact', autocomplete: 'tel', inputmode: 'tel', type: 'tel' })}
          </div>
        </fieldset>
        <section class="field-group pay-note">
          ${icon('lock', 'pay-note__icon')}<div><h2 class="field-group__title">תשלום באשראי — טרם חובר</h2><p>בהדגמה לא מזינים פרטי כרטיס ולא מתבצע חיוב.</p></div>
        </section>
      </form>
      <aside class="summary" aria-label="סיכום ההזמנה"><div class="summary__panel" id="summary">${summaryMarkup()}</div></aside>
    </div></main>
    <div class="buybar"><div class="buybar__inner" id="checkout-bar">${checkoutBarMarkup()}</div></div>`;

  const form = document.querySelector('#checkout-form');
  form.addEventListener('change', (event) => {
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
    if (event.target.closest('[data-check-address]')) runAddressCheck();
    if (event.target.closest('[data-switch-pickup]')) { rememberMode('pickup'); checkout.errors = {}; checkoutPage('mode-pickup'); }
  });
  form.addEventListener('submit', (event) => { event.preventDefault(); placeOrder(); });
  if (checkout.mode === 'delivery') bindAddressLookup(form);
  if (focused) document.getElementById(focused)?.focus();
}

function selectedAddressMarkup() {
  const place = checkout.address.place;
  return place ? `${icon('pin')}<span><strong>${safe(place.street)} ${safe(place.number)}</strong><small>${safe(place.city)} · כתובת שנבחרה מהמפה</small></span>` : '';
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
  if (!isOpen() || !getCart().length) { refreshCheckoutParts(); return; }
  const errors = {};
  if (checkout.mode === 'delivery') {
    if (!checkout.address.place) errors.addressQuery = 'בחרו כתובת מלאה עם מספר בית מתוך הרשימה.';
  }
  if (!checkout.contact.name.trim()) errors.name = 'איך לפנות אליכם?';
  if (!checkout.contact.phone.trim()) errors.phone = 'צריך טלפון כדי לעדכן על ההזמנה.';
  else if (!validPhone(checkout.contact.phone)) errors.phone = 'המספר לא נראה תקין. למשל: 050-1234567';
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
  checkout.submitting = true;
  refreshCheckoutParts();
  const totals = checkoutTotals();
  const snapshot = {
    createdAt: new Date().toISOString(),
    mode: checkout.mode,
    address: checkout.mode === 'delivery' ? { ...checkout.address } : null,
    name: checkout.contact.name.trim(),
    lines: getCart().map((line) => {
      const product = findProduct(line.config.productId);
      const info = describe(product, line.config);
      return { title: info.title, details: detailText(info), note: line.config.note, qty: line.qty, total: lineTotal(line, product), config: line.config };
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
  saveLastOrder({ ...snapshot, reference: result.reference });
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
      <p><strong>אין הזמנה להצגה</strong>ההזמנה האחרונה מוצגת כאן רק בחלון שבו בוצעה.</p>
      <a class="button button--primary" href="#/"><span>לעמוד הפתיחה</span>${icon('forward')}</a></div></div></main>`;
    return;
  }
  const when = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.createdAt));
  const steps = order.mode === 'delivery' ? ['הפיצרייה מאשרת את ההזמנה', 'הבצק נפתח, התנור עובד', 'השליח בדרך אליכם'] : ['הפיצרייה מאשרת את ההזמנה', 'הבצק נפתח, התנור עובד', 'הודעה כשמוכן לאיסוף'];
  app.innerHTML = `${topbar('#/')}
    <main class="page done"><div class="wrap done__layout">
      <div class="done__intro">
        <h1>כך ייראה אישור ההזמנה</h1>
        <div class="notice notice--warn">${icon('alert')}<span><strong>הדגמה: ההזמנה לא נשלחה ולא בוצע חיוב.</strong> במערכת האמיתית המסך הזה יופיע רק אחרי שהפיצרייה קיבלה את ההזמנה והתשלום אושר.</span></div>
        <ol class="done__steps">${steps.map((step) => `<li>${step}</li>`).join('')}</ol>
        <a class="button button--quiet" href="#/">לעמוד הפתיחה</a>
      </div>
      <div class="ticket-wrap"><article class="ticket" aria-label="פרטי ההזמנה">
        <header class="ticket__head"><strong>${safe(shop.name)}</strong><span>הזמנה <bdi>${safe(order.reference)}</bdi></span><span><bdi>${when}</bdi></span></header>
        <ul class="ticket__lines">${order.lines.map((line) => `<li>
          <span class="ticket__qty"><bdi>${line.qty}×</bdi></span>
          <span class="ticket__item"><strong>${safe(line.title)}</strong>${line.details ? `<small>${safe(line.details)}</small>` : ''}${line.note ? `<small>הערה: ${safe(line.note)}</small>` : ''}</span>
          <bdi class="ticket__price">${money(line.total)}</bdi>
        </li>`).join('')}</ul>
        <dl class="ticket__totals">
          <div><dt>סכום ביניים</dt><dd><bdi>${money(order.subtotal)}</bdi></dd></div>
          <div><dt>${order.mode === 'delivery' ? 'משלוח' : 'איסוף עצמי'}</dt><dd>${order.fee ? `<bdi>${money(order.fee)}</bdi>` : 'ללא עלות'}</dd></div>
          <div class="ticket__grand"><dt>סה״כ</dt><dd><bdi>${money(order.total)}</bdi></dd></div>
        </dl>
        <p class="ticket__to">${order.mode === 'delivery' ? `משלוח אל: ${safe(order.address.street)} ${safe(order.address.number)}${order.address.apartment ? `, דירה ${safe(order.address.apartment)}` : ''}, ${safe(order.address.city)}` : `איסוף עצמי: ${safe(shop.location.address)}`}</p>
        <p class="ticket__to">על שם: ${safe(order.name)}</p>
        <footer class="ticket__foot">אישור לדוגמה · לא בוצעה הזמנה</footer>
      </article></div>
    </div></main>`;
}

/* ---------- ניתוב ---------- */

function getRoute() {
  const [, page = '', id, action, lineId] = window.location.hash.split('/');
  return { page, id, action, lineId };
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
    if (product && validSource) restoreScroll = productPage(product, route.action === 'edit' ? source : null, route.action === 'copy' ? source : null, incoming);
    else notFound();
  } else if (route.page === 'checkout') checkoutPage();
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
  if (document.startViewTransition && !reducedMotion.matches) document.startViewTransition(render);
  else render();
}

window.addEventListener('hashchange', navigate);
history.scrollRestoration = 'manual';
const syncPageVisibility = () => document.documentElement.classList.toggle('is-page-hidden', document.hidden);
document.addEventListener('visibilitychange', syncPageVisibility);
syncPageVisibility();
render();
