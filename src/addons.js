import { categoryOf, isAddon, addonVariants, orderable, addonRecommendations, addonQuantity, changeAddonQuantity } from './addon-model.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const labels = { drinks: 'שתייה', sauces: 'רטבים' };
const glyph = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${({ plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', close: 'M6 6l12 12M6 18 18 6', cart: 'M4 7h16l-1 14H5ZM8 7V5a4 4 0 0 1 8 0v2', check: 'M5 12l4 4L19 6' })[name]}"/></svg>`;

export function addonArt(product, variant = addonVariants(product)[0], assetUrl = value => value) {
  const photo = variant?.image || product.image;
  if (photo) return `<img class="addon-image" src="${escape(assetUrl(photo))}" alt="${escape(variant?.image ? variant.imageAlt || `${product.name}, ${variant.name}` : product.imageAlt || product.name)}" width="512" height="512" loading="lazy" decoding="async" />`;
  const sauce = categoryOf(product) === 'sauces';
  const can = !sauce && variant.volumeMl > 0 && variant.volumeMl <= 330;
  const shape = sauce
    ? '<path d="M19 47h58l-7 35H26Z" fill="#fffefd" stroke="#d7d1c9" stroke-width="2"/><ellipse cx="48" cy="47" rx="29" ry="9" fill="#e6aa6e"/><ellipse cx="48" cy="45" rx="24" ry="6" fill="#c8753c"/><path d="M28 60h40" stroke="#e5dfd7" stroke-width="2"/>'
    : can
      ? '<rect x="27" y="25" width="42" height="65" rx="10" fill="#eee9e2" stroke="#cec7be" stroke-width="2"/><path d="M28 41h40v30H28Z" fill="#c83125"/><ellipse cx="48" cy="27" rx="17" ry="4" fill="#f8f7f5" stroke="#cec7be"/><path d="M44 27h8" stroke="#908a82" stroke-width="2"/><path d="M40 55h16M42 61h12" stroke="#fff" stroke-width="2"/>'
      : '<path d="M39 25v12l-12 17v36q0 6 7 6h28q7 0 7-6V54L57 37V25Z" fill="#f2eee8" stroke="#d2ccc3" stroke-width="2"/><rect x="39" y="17" width="18" height="10" rx="3" fill="#5c716b"/><path d="M28 58h40v24H28Z" fill="#5c716b"/><path d="M40 67h16M43 74h10" stroke="#fff" stroke-width="2"/>';
  return `<span class="addon-art" aria-hidden="true"><svg viewBox="0 0 96 112">${shape}</svg></span>`;
}
export function createAddonFlow(api) {
  const dialog = document.createElement('dialog');
  dialog.className = 'addon-flow';
  dialog.setAttribute('aria-labelledby', 'addon-title');
  document.body.append(dialog);
  let origin = null, source = null, recommendations = [], selected = new Map(), menuSelected = new Map(), refreshing = false, refreshSequence = 0;
  const products = () => api.getProducts().filter(product => product.active && isAddon(product));
  const categories = () => ['drinks', 'sauces'].filter(value => products().some(product => categoryOf(product) === value));
  const chosen = (product, inDialog) => {
    const map = inDialog ? selected : menuSelected, variants = addonVariants(product);
    const saved = variants.find(variant => variant.id === map.get(product.id));
    const recommendation = inDialog && recommendations.find(item => item.productId === product.id);
    return saved || variants.find(variant => addonQuantity(api.getCart(), product.id, variant.id) > 0) || variants.find(variant => variant.id === recommendation?.variantId) || variants.find(variant => variant.available !== false) || variants[0];
  };
  function rows(value, inDialog) {
    return products().filter(product => categoryOf(product) === value).map(product => {
      const variant = chosen(product, inDialog), variants = addonVariants(product);
      const available = orderable(product);
      const complex = Boolean(product.optionGroups?.length);
      const heading = inDialog ? 'h4' : 'h3';
      return `<li class="addon-card${available ? '' : ' addon-card--unavailable'}" data-addon-product="${escape(product.id)}">
        <div class="addon-card__art">${addonArt(product, variant, api.assetUrl)}</div><div class="addon-card__copy">
          <div class="addon-card__heading"><${heading}>${escape(product.name)}</${heading}></div>
          ${complex ? `<button type="button" class="button button--quiet button--small" data-addon-custom="${escape(product.id)}"${available ? '' : ' disabled'}>בחירת אפשרויות</button>` : `<div class="addon-options">${variants.map(item => {
            const qty = addonQuantity(api.getCart(), product.id, item.id);
            const canAdd = available && item.available !== false && !(inDialog && refreshing) && qty < 99 && (qty > 0 || api.getCart().length < 40);
            const attrs = `data-addon-product-id="${escape(product.id)}" data-addon-variant="${escape(item.id)}"`;
            const soldOut = !available || item.available === false;
            return `<div class="addon-option${qty ? ' addon-option--added' : ''}" data-addon-choice="${escape(item.id)}"><div class="addon-option__label"><span>${escape(item.name || 'ליחידה')}</span><bdi>${api.money(item.price)}</bdi>${qty && soldOut ? '<small class="addon-option__stock">אזל כרגע</small>' : ''}</div>${qty ? `<div class="addon-qty" role="group" aria-label="כמות ${escape(product.name)}, ${escape(item.name)}"><button type="button" data-addon-action="minus" ${attrs} aria-label="הסרת יחידה של ${escape(product.name)}, ${escape(item.name)}">${glyph('minus')}</button><span><bdi>${qty}</bdi><small>בסל</small></span><button type="button" data-addon-action="plus" ${attrs} aria-label="הוספת ${escape(product.name)}, ${escape(item.name)}, ${api.money(item.price)}"${canAdd ? '' : ' disabled'}>${glyph('plus')}</button></div>` : `<button type="button" class="addon-add" data-addon-action="plus" ${attrs} aria-label="הוספת ${escape(product.name)}, ${escape(item.name)}, ${api.money(item.price)}"${canAdd ? '' : ' disabled'}>${glyph('plus')}<span>${soldOut ? 'אזל כרגע' : 'הוספה'}</span></button>`}</div>`;
          }).join('')}</div>`}
        </div></li>`;
    }).join('');
  }
  function preserve(container, render) {
    const active = document.activeElement;
    const focus = container.contains(active) ? { action: active.dataset.addonAction, variant: active.dataset.addonVariant, product: active.dataset.addonProductId } : null;
    const scroll = container.scrollTop;
    render();
    container.scrollTop = scroll;
    if (focus?.product) {
      const selector = `[data-addon-product-id="${CSS.escape(focus.product)}"][data-addon-variant="${CSS.escape(focus.variant)}"][data-addon-action="${focus.action}"]`;
      const target = container.querySelector(selector);
      (target && !target.disabled ? target : container.querySelector(`[data-addon-product-id="${CSS.escape(focus.product)}"][data-addon-variant="${CSS.escape(focus.variant)}"]:not(:disabled)`))?.focus({ preventScroll: true });
    }
  }
  function renderDialog() {
    if (!dialog.open) return;
    const content = dialog.querySelector('[data-addon-content]');
    preserve(content, () => { content.innerHTML = categories().map(value => `<section class="addon-category" aria-labelledby="addon-category-${value}"><h3 id="addon-category-${value}">${labels[value]}</h3><ul class="addon-list">${rows(value, true)}</ul></section>`).join(''); });
    dialog.querySelector('[data-addon-total]').textContent = api.money(api.cartSubtotal());
  }
  function refreshMenus() {
    document.querySelectorAll('[data-addon-menu-items]').forEach(node => preserve(node, () => { node.innerHTML = rows(node.dataset.addonMenuItems, false); }));
  }
  const controller = {
    get open() { return dialog.open; },
    hasAvailable: () => products().some(orderable) || Boolean(api.refreshCatalog && products().length),
    close() { refreshSequence++; refreshing = false; if (dialog.open) dialog.close(); },
    openStep({ line = null, category: initialCategory, productId } = {}) {
      if (!products().some(orderable) && !api.refreshCatalog) return false;
      origin = document.activeElement;
      source = line;
      recommendations = addonRecommendations(api.getCart(), api.getProducts());
      selected = new Map();
      api.beforeOpen?.();
      const product = line && api.findProduct(line.config.productId);
      dialog.innerHTML = `<div class="addon-flow__panel">
        <!-- Optional basket completion: explicit one-tap sizes, both categories, then checkout. -->
        <header class="addon-flow__header"><div><h2 id="addon-title" tabindex="-1">${product ? 'הפיצה נוספה לסל' : 'שתייה ורטבים'}</h2><p>${product ? 'רוצים גם שתייה או רוטב?' : 'אפשר להוסיף, או להמשיך להזמנה.'}</p></div><button type="button" class="icon-button" data-addon-close aria-label="סגירת שתייה ורטבים">${glyph('close')}</button></header>
        <div class="addon-flow__content" data-addon-content></div>
        <p class="addon-flow__status" data-addon-status role="status"></p>
        <footer class="addon-flow__footer"><div class="addon-flow__sum"><span>סכום המוצרים</span><strong data-addon-total></strong></div><button type="button" class="button button--primary" data-addon-checkout>להשלמת ההזמנה${glyph('cart')}</button>${product ? '<button type="button" class="link-button" data-addon-more>הוספת פיצה נוספת</button>' : ''}${api.demoOnly ? '<small class="addon-flow__demo">מוצרים, תמונות ומחירים לדוגמה</small>' : ''}</footer>
      </div>`;
      if (!dialog.open) dialog.showModal();
      renderDialog();
      dialog.querySelector('#addon-title').focus({ preventScroll: true });
      if (productId) dialog.querySelector(`[data-addon-product="${CSS.escape(productId)}"]`)?.scrollIntoView({ block: 'nearest' });
      else if (initialCategory) dialog.querySelector(`#addon-category-${CSS.escape(initialCategory)}`)?.scrollIntoView({ block: 'nearest' });
      if (api.refreshCatalog) {
        const sequence = ++refreshSequence;
        refreshing = true;
        renderDialog();
        dialog.querySelector('[data-addon-status]').textContent = 'בודקים מחירים וזמינות…';
        Promise.resolve().then(api.refreshCatalog).then(changed => {
          if (!dialog.open || sequence !== refreshSequence) return;
          refreshing = false;
          if (!products().some(orderable)) { controller.close(); api.openCart(); return; }
          recommendations = addonRecommendations(api.getCart(), api.getProducts());
          renderDialog(); refreshMenus();
          dialog.querySelector('[data-addon-status]').textContent = changed ? 'המחירים והזמינות עודכנו.' : '';
        }).catch(() => {
          if (!dialog.open || sequence !== refreshSequence) return;
          // Keep explicit additions blocked until current availability is checked.
          dialog.querySelector('[data-addon-status]').innerHTML = 'לא הצלחנו לבדוק זמינות. <button type="button" class="link-button" data-addon-retry>ניסיון נוסף</button>';
        });
      }
      return true;
    },
    menuMarkup() {
      return categories().map(value => `<section class="menu-section addon-menu" aria-labelledby="addon-menu-${value}"><h2 id="addon-menu-${value}">${labels[value]}</h2><ul class="addon-list" data-addon-menu-items="${value}">${rows(value, false)}</ul></section>`).join('');
    },
  };
  function action(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const inDialog = dialog.contains(button);
    if (button.hasAttribute('data-addon-close')) { controller.close(); return; }
    if (button.hasAttribute('data-addon-checkout')) { controller.close(); api.onCheckout(); return; }
    if (button.hasAttribute('data-addon-more')) { controller.close(); api.onMore(); return; }
    if (button.hasAttribute('data-addon-retry')) { controller.openStep({ line: source }); return; }
    if (button.dataset.addonCustom) { controller.close(); api.onProduct(button.dataset.addonCustom); return; }
    if (button.dataset.addonAction) {
      try {
        (inDialog ? selected : menuSelected).set(button.dataset.addonProductId, button.dataset.addonVariant);
        changeAddonQuantity(api, button.dataset.addonProductId, button.dataset.addonVariant, button.dataset.addonAction === 'plus' ? 1 : -1);
        const status = inDialog ? dialog.querySelector('[data-addon-status]') : document.querySelector('[data-addon-menu-status]');
        if (status) {
          const product = api.findProduct(button.dataset.addonProductId), variant = addonVariants(product).find(item => item.id === button.dataset.addonVariant), qty = addonQuantity(api.getCart(), product.id, variant.id);
          status.textContent = qty ? `${product.name}, ${variant.name} · ${qty} בסל` : `${product.name}, ${variant.name} הוסר מהסל`;
        }
      } catch (error) {
        const status = inDialog ? dialog.querySelector('[data-addon-status]') : document.querySelector('[data-addon-menu-status]');
        if (status) status.textContent = error.message;
      }
    }
  }
  dialog.addEventListener('click', event => { if (event.target === dialog) controller.close(); else action(event); });
  dialog.addEventListener('close', () => {
    refreshSequence++; refreshing = false;
    source = null;
    if (origin?.isConnected && (!origin.closest('dialog') || origin.closest('dialog').open)) origin.focus({ preventScroll: true });
  });
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open-addons]');
    if (opener) { event.preventDefault(); controller.openStep({ category: opener.dataset.openAddons }); return; }
    if (event.target.closest('.addon-menu')) action(event);
  });
  api.onCartChange(() => { renderDialog(); refreshMenus(); });
  return controller;
}
