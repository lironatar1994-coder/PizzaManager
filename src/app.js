import { shop, activeProducts, findProduct } from './data.js?v=20260927-hero';
import { money, PLACEMENTS, variantsFor, defaultConfig, normalizeConfig, choicePrice, unitPrice, describe, lineTotal } from './order.js';
import { pizzaState, pizzaSVG, updatePizza, shapeIcon } from './pizza.js?v=20260927-ux4';
import { getCart, getLine, cartCount, cartSubtotal, onCartChange, addLine, updateLine, removeLine, clearCart, saveLastOrder, getLastOrder } from './store.js';
import { verifyAddress, isOpen, submitOrder } from './services.js';

const app = document.querySelector('#app');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
let teardown = [];

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
    <svg class="brand__mark" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 22c5-8 11-11 17-10-1 7-5 13-13 16l-4-6Z" fill="currentColor"/><circle cx="18" cy="20" r="1.4" fill="var(--tomato)"/><circle cx="22" cy="17" r="1.4" fill="var(--tomato)"/></svg>
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
  const action = list.length === 1 && list[0].visual === 'pizza' ? 'מרכיבים את הפיצה' : list.length === 1 ? 'מרכיבים את ההזמנה' : 'פותחים את התפריט';
  const closed = !isOpen();
  app.innerHTML = `<main class="hero" aria-labelledby="hero-title">
    <picture class="hero__media"><source media="(max-width: 700px)" srcset="./assets/pizza-hero-mobile.jpg" /><img src="./assets/pizza-hero-desktop.jpg" alt="פיצה להמחשה על רקע כהה" fetchpriority="high" /></picture>
    <div class="hero__shade" aria-hidden="true"></div>
    <header class="hero__top">${brand()}<div class="topbar__end"><span class="demo-pill demo-pill--hero">אתר הדגמה<span class="demo-pill__more"> · תמונות ומחירים להמחשה</span></span><span class="hero__cart" data-hero-cart ${cartCount() ? '' : 'hidden'}>${cartButton()}</span></div></header>
    <div class="hero__body">
      <h1 id="hero-title">${safe(title).replace(/\n/g, '<br />')}</h1>
      <p class="hero__lead">${safe(description)}</p>
      ${unavailable ? '' : `<a class="button button--primary hero__cta" href="${productHref()}"><span>${action}</span>${icon('forward')}</a>
      <p class="hero__support">משלוח או איסוף עצמי בוחרים בקופה</p>`}
      ${closed ? `<p class="hero__closed">${icon('alert')}<span>לפי שעות הדוגמה, הפיצרייה סגורה כרגע. ההזמנות נפתחות ב־${shop.hours.opensAt}.</span></p>` : ''}
    </div>
  </main>`;
}

/* ---------- תפריט ---------- */

function menu() {
  const list = activeProducts();
  app.innerHTML = `${topbar('#/')}
    <main class="page menu-page"><div class="wrap">
      <header class="page-head"><h1>מה מכינים היום?</h1><p>בוחרים מוצר, ואז מרכיבים אותו בדיוק כמו שאוהבים.</p></header>
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
        <strong>${safe(variant.name)}</strong>${variant.detail ? `<small>${safe(variant.detail)}</small>` : ''}<bdi>${money(variant.price)}</bdi>
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
        ${group.placement ? `<div class="placement" role="radiogroup" aria-label="איפה לשים ${safe(choice.name)}?">${Object.entries(PLACEMENTS).map(([key, info]) => `<label class="placement__option">
          <input type="radio" name="place-${safe(group.id)}-${safe(choice.id)}" value="${key}" aria-label="${info.label}" ${(placement || 'whole') === key ? 'checked' : ''} />
          <span aria-hidden="true">${placementIcon(key)}${key === 'whole' ? 'שלמה' : key === 'right' ? 'ימין' : 'שמאל'}</span>
        </label>`).join('')}</div>` : ''}
      </div>`;
    }).join('')}</div></fieldset>`;
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

function productPage(product, editLine) {
  const list = activeProducts();
  const back = list.length > 1 ? '#/menu' : '#/';
  let config = editLine ? normalizeConfig(product, editLine.config) : defaultConfig(product);
  let quantity = editLine?.qty ?? 1;
  const isPizza = product.visual === 'pizza';
  const variantScales = variantsFor(product).length > 1 ? variantsFor(product).map((variant) => variant.scale ?? 1) : [];

  app.innerHTML = `${topbar(back)}
    <main class="builder${isPizza ? '' : ' builder--flat'}">
      <section class="stage" aria-label="התצוגה של ${safe(product.name)}">
        <div class="stage__canvas"><div class="stage__pizza" id="stage-art">${isPizza ? pizzaSVG(pizzaState(product, config), { rings: variantScales, label: `הדמיה של ${product.name} לפי הבחירות שלכם` }) : productArt(product, config, product.name)}</div></div>
        <div class="stage__summary"><p class="stage__title" id="stage-title"></p><p class="stage__detail" id="stage-detail"></p></div>
      </section>
      <form class="builder__form" id="builder-form" novalidate>
        <header class="builder__intro"><h1>${safe(product.name)}</h1><p>${safe(product.description)}</p></header>
        ${variantSection(product, config)}
        ${(product.optionGroups || []).map((group) => (group.type === 'single' ? singleGroup(group, config.options[group.id]) : multiGroup(group, config.options[group.id]))).join('')}
        <div class="field-group">
          <label class="field-group__head" for="kitchen-note"><span class="field-group__title">משהו שחשוב שנדע?</span><span class="field-group__hint">הערה למטבח, לא חובה</span></label>
          <textarea class="input" id="kitchen-note" name="note" dir="auto" rows="2" maxlength="200" placeholder="למשל: לחתוך לריבועים">${safe(config.note)}</textarea>
        </div>
        <div class="field-group field-group--inline"><span class="field-group__title" id="qty-title">כמות</span>${stepper({ value: quantity, label: 'כמות' })}</div>
      </form>
    </main>
    <div class="buybar"><div class="buybar__inner">
      <div class="buybar__total"><span>סה״כ</span><strong id="bar-total"></strong></div>
      <button type="button" id="add-to-cart" class="button button--primary buybar__cta"><span id="add-label"></span>${icon('forward')}</button>
    </div></div>
    <p class="visually-hidden" aria-live="polite" id="builder-status"></p>`;

  const form = document.querySelector('#builder-form');
  const art = document.querySelector('#stage-art');
  const status = document.querySelector('#builder-status');
  let drawn = isPizza ? pizzaState(product, config) : null;

  const refresh = () => {
    const info = describe(product, config);
    const unit = unitPrice(product, config);
    const total = unit * quantity;
    document.querySelector('#stage-title').textContent = quantity > 1 ? `${info.title} · ${quantity} יח׳` : info.title;
    document.querySelector('#stage-detail').textContent = detailText(info) || 'בלי תוספות';
    document.querySelector('#bar-total').textContent = money(total);
    document.querySelector('#add-label').textContent = `${editLine ? 'עדכון בסל' : 'הוספה לסל'} · ${money(total)}`;
    form.querySelector('output').textContent = quantity;
    form.querySelector('[data-qty="minus"]').disabled = quantity <= 1;
    form.querySelector('[data-qty="plus"]').disabled = quantity >= 99;
    for (const group of product.optionGroups || []) {
      if (group.type !== 'multi') continue;
      for (const choice of group.choices) {
        const label = form.querySelector(`[data-price-for="${CSS.escape(choice.id)}"]`);
        if (label && choice.price) label.textContent = `+${money(choicePrice(choice, config.options[group.id]?.[choice.id] || 'whole'))}`;
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
      status.textContent = target.checked ? `נוסף: ${name}` : `הוסר: ${name}`;
    } else if (target.name?.startsWith('place-')) {
      status.textContent = `${target.closest('.topping').querySelector('.topping__name').textContent}: ${target.getAttribute('aria-label')}`;
    }
    if (previous.variantId !== config.variantId) pulse(art.querySelector('svg'));
    refresh();
  });
  form.addEventListener('input', (event) => {
    if (event.target.name === 'note') config = { ...config, note: event.target.value };
  });
  form.addEventListener('click', (event) => {
    const button = event.target.closest('[data-qty]');
    if (!button) return;
    quantity = Math.max(1, Math.min(99, quantity + (button.dataset.qty === 'plus' ? 1 : -1)));
    refresh();
  });

  document.querySelector('#add-to-cart').addEventListener('click', () => {
    config = readConfig(form, product);
    if (editLine) {
      updateLine(editLine.id, { config, qty: quantity });
      history.replaceState(null, '', `#/product/${product.id}`);
      editLine = null;
    } else addLine(config, quantity);
    flyToCart(art).then(() => openCart());
    refresh();
  });

  if (isPizza) teardown.push(setupStage(document.querySelector('.stage')));
  refresh();
}

function pulse(element) {
  if (reducedMotion.matches) return;
  element.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
}

// במובייל הפיצה מתכווצת לפינה בזמן גלילה, כדי שתישאר גלויה ליד הבחירות.
function setupStage(stage) {
  const pizza = stage.querySelector('.stage__pizza');
  const mobile = window.matchMedia('(max-width: 899px)');
  let metrics = null;
  let frame = 0;
  const measure = () => {
    pizza.style.transform = '';
    if (!mobile.matches) { metrics = null; stage.style.setProperty('--p', 0); return; }
    const band = parseFloat(getComputedStyle(stage).getPropertyValue('--band')) || 112;
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
  ], { duration: 720, easing: 'cubic-bezier(.55,0,.25,1)' });
  return flight.finished.then(() => {
    ghost.remove();
    return target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' }).finished;
  });
}

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
      ${details ? `<p>${safe(details)}</p>` : ''}
      ${line.config.note ? `<p class="cart-line__note">הערה: <bdi>${safe(line.config.note)}</bdi></p>` : ''}
      <div class="cart-line__actions"><a href="#/product/${safe(product.id)}/edit/${safe(line.id)}" data-close-sheet>עריכה</a><button type="button" data-remove>הסרה</button></div>
    </div>
    <div class="cart-line__side"><bdi class="cart-line__price" data-line-price>${money(lineTotal(line, product))}</bdi>${stepper({ value: line.qty, label: `כמות של ${info.title}`, attr: 'data-line-qty', small: true })}</div>
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
        <p class="sheet__hint">בשלב הבא בוחרים משלוח או איסוף עצמי.</p>
        <a class="button button--primary" href="#/checkout" data-close-sheet><span>להמשך ההזמנה</span>${icon('forward')}</a>
        <a class="button button--quiet" href="${productHref()}" data-close-sheet>להוסיף עוד</a>
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
  if (event.target.closest('[data-open-cart]')) openCart();
  if (event.target.closest('[data-open-info]')) openInfo();
});

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
}

const checkout = {
  mode: 'delivery',
  address: { city: '', street: '', number: '', apartment: '', floor: '', instructions: '' },
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
    return `<div class="notice notice--ok">${icon('check')}<span><strong>הכתובת באזור המשלוחים.</strong> דמי משלוח ${money(zone.fee)} · מינימום להזמנה ${money(zone.minOrder)}</span></div>
      ${shortBy ? `<div class="notice notice--warn">${icon('alert')}<span><strong>חסרים <bdi>${money(shortBy)}</bdi> למינימום המשלוח.</strong> אפשר להוסיף עוד או לבחור איסוף עצמי.</span><a class="button button--small" href="${productHref()}">להוסיף עוד</a></div>` : ''}`;
  }
  if (status === 'out') return `<div class="notice notice--warn">${icon('alert')}<span><strong>הכתובת מחוץ לאזור המשלוחים.</strong> אפשר להזמין ולאסוף בעצמכם.</span><button type="button" class="button button--small" id="switch-pickup" data-switch-pickup>מעבר לאיסוף עצמי</button></div>`;
  if (status === 'invalid') return `<div class="notice notice--warn">${icon('alert')}<span>כדי לבדוק צריך עיר, רחוב ומספר בית.</span></div>`;
  return `<button type="button" class="button button--quiet button--small" id="check-address" data-check-address>${icon('pin')}<span>בדיקה שהכתובת באזור המשלוחים</span></button>`;
}

function checkoutState() {
  const open = isOpen();
  const totals = checkoutTotals();
  const out = checkout.mode === 'delivery' && checkout.check.status === 'out';
  const blocked = !open || totals.shortBy > 0 || out;
  const reason = !open ? `סגור כרגע · נפתח ב־${shop.hours.opensAt}` : totals.shortBy ? `חסרים ${money(totals.shortBy)} למינימום` : out ? 'הכתובת מחוץ לאזור' : '';
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
        <header class="page-head"><h1>קופה לדוגמה</h1><p>בוחרים משלוח או איסוף, ואז ממלאים פרטי קשר.</p></header>
        <div class="notice notice--warn" role="status">${icon('alert')}<span><strong>הדגמה בלבד:</strong> הפרטים נשמרים בדפדפן. לא נשלחת הזמנה ולא מתבצע חיוב.</span></div>
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
          <legend class="field-group__head"><span class="field-group__title">לאן לשלוח?</span><span class="field-group__hint">בהדגמה: תל אביב, רמת גן או גבעתיים</span></legend>
          <div class="field-grid">
            ${field({ name: 'city', label: 'עיר', value: address.city, group: 'address', autocomplete: 'address-level2', wide: true })}
            ${field({ name: 'street', label: 'רחוב', value: address.street, group: 'address', autocomplete: 'address-line1' })}
            ${field({ name: 'number', label: 'מספר בית', value: address.number, group: 'address', inputmode: 'numeric' })}
          </div>
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
  if (focused) document.getElementById(focused)?.focus();
}

const addressKey = () => ['city', 'street', 'number'].map((key) => checkout.address[key].trim()).join('|');

async function runAddressCheck() {
  const key = addressKey();
  checkout.check = { status: 'checking' };
  refreshCheckoutParts();
  const result = await verifyAddress(checkout.address);
  // אם הכתובת השתנתה בזמן הבדיקה, התוצאה כבר לא שייכת לה.
  if (key !== addressKey() || checkout.check.status !== 'checking') return 'stale';
  checkout.check = result.status === 'ok' ? { status: 'ok', zone: result.zone } : { status: result.status };
  if (getRoute().page === 'checkout') refreshCheckoutParts();
  return result.status;
}

async function placeOrder() {
  if (checkout.submitting) return;
  const errors = {};
  if (checkout.mode === 'delivery') {
    if (!checkout.address.city.trim()) errors.city = 'איזו עיר?';
    if (!checkout.address.street.trim()) errors.street = 'איזה רחוב?';
    if (!checkout.address.number.trim()) errors.number = 'מה מספר הבית?';
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
  if (sheet.open) sheet.close();
  if (info.open) info.close();
  const route = getRoute();
  // מסך הפתיחה כהה, שאר הזרימה בהירה: צבע סרגל הדפדפן בטלפון עוקב.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', route.page ? '#f7f6f2' : '#120e0c');
  const list = activeProducts();
  if (route.page === 'menu' && list.length > 1) menu();
  else if (route.page === 'product') {
    const product = list.find((item) => item.id === route.id);
    const editLine = route.action === 'edit' ? getLine(route.lineId) : null;
    if (product) productPage(product, editLine);
    else notFound();
  } else if (route.page === 'checkout') checkoutPage();
  else if (route.page === 'done') donePage();
  else home();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function navigate() {
  if (document.startViewTransition && !reducedMotion.matches) document.startViewTransition(render);
  else render();
}

window.addEventListener('hashchange', navigate);
render();
