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
  let category = 'drinks', origin = null, source = null, recommendations = [], selected = new Map(), menuSelected = new Map(), refreshing = false, refreshSequence = 0;
  const products = () => api.getProducts().filter(product => product.active && isAddon(product));
  const categories = () => ['drinks', 'sauces'].filter(value => products().some(product => categoryOf(product) === value));
  const chosen = (product, inDialog) => {
    const map = inDialog ? selected : menuSelected, variants = addonVariants(product);
    const saved = variants.find(variant => variant.id === map.get(product.id));
    const recommendation = inDialog && recommendations.find(item => item.productId === product.id);
    return saved || variants.find(variant => variant.id === recommendation?.variantId) || variants.find(variant => variant.available !== false) || variants[0];
  };
  function rows(value, inDialog) {
    return products().filter(product => categoryOf(product) === value).map(product => {
      const variant = chosen(product, inDialog), variants = addonVariants(product), qty = addonQuantity(api.getCart(), product.id, variant.id);
      const available = orderable(product) && variant.available !== false;
      const recommended = inDialog && recommendations.find(item => item.productId === product.id && item.variantId === variant.id);
      const complex = Boolean(product.optionGroups?.length);
      return `<li class="addon-card${available ? '' : ' addon-card--unavailable'}" data-addon-product="${escape(product.id)}">
        <div class="addon-card__art">${addonArt(product, variant, api.assetUrl)}</div><div class="addon-card__copy">
          <div class="addon-card__heading"><h3>${escape(product.name)}</h3>${recommended ? `<span class="addon-recommendation">${escape(recommended.reason)}</span>` : ''}</div>
          ${variants.length > 1 ? `<div class="addon-volumes" role="group" aria-label="נפח ${escape(product.name)}">${variants.map(item => `<button type="button" data-addon-volume="${escape(item.id)}" data-addon-product-id="${escape(product.id)}" aria-pressed="${item.id === variant.id}"${item.available === false ? ' aria-label="' + escape(item.name) + ', אזל כרגע"' : ''}>${escape(item.name)}${item.available === false ? '<span>אזל</span>' : ''}</button>`).join('')}</div>` : variant.name ? `<p class="addon-card__volume">${escape(variant.name)}</p>` : ''}
          <div class="addon-card__bottom"><span class="addon-card__price"><bdi>${api.money(variant.price)}</bdi><small>${available ? 'ליחידה' : 'אזל כרגע'}</small></span>
          ${complex ? `<button type="button" class="button button--quiet button--small" data-addon-custom="${escape(product.id)}"${available ? '' : ' disabled'}>לבחירה</button>` : `<div class="addon-qty" role="group" aria-label="כמות ${escape(product.name)}, ${escape(variant.name)}">
            <button type="button" data-addon-action="minus" data-addon-product-id="${escape(product.id)}" data-addon-variant="${escape(variant.id)}" aria-label="הסרת יחידה של ${escape(product.name)}, ${escape(variant.name)}"${qty ? '' : ' disabled'}>${glyph('minus')}</button>
            <span><bdi>${qty}</bdi><small>בסל</small></span>
            <button type="button" data-addon-action="plus" data-addon-product-id="${escape(product.id)}" data-addon-variant="${escape(variant.id)}" aria-label="הוספת ${escape(product.name)}, ${escape(variant.name)}, ${api.money(variant.price)}"${available && !(inDialog && refreshing) && qty < 99 && (qty > 0 || api.getCart().length < 40) ? '' : ' disabled'}>${glyph('plus')}</button>
          </div>`}</div>
        </div></li>`;
    }).join('');
  }
  function preserve(container, render) {
    const active = document.activeElement;
    const focus = container.contains(active) ? { action: active.dataset.addonAction, volume: active.dataset.addonVolume, product: active.dataset.addonProductId } : null;
    const scroll = container.scrollTop;
    render();
    container.scrollTop = scroll;
    if (focus?.product) {
      const selector = `[data-addon-product-id="${CSS.escape(focus.product)}"]${focus.action ? `[data-addon-action="${focus.action}"]` : `[data-addon-volume="${CSS.escape(focus.volume)}"]`}`;
      const target = container.querySelector(selector);
      (target && !target.disabled ? target : container.querySelector(`[data-addon-product-id="${CSS.escape(focus.product)}"][data-addon-action="plus"]`))?.focus({ preventScroll: true });
    }
  }
  function renderDialog() {
    if (!dialog.open) return;
    const content = dialog.querySelector('[data-addon-content]');
    preserve(content, () => { content.innerHTML = `<ul class="addon-list" aria-label="${labels[category]}">${rows(category, true)}</ul>`; });
    dialog.querySelectorAll('[data-addon-tab]').forEach(button => {
      const active = button.dataset.addonTab === category;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    content.setAttribute('aria-labelledby', `addon-tab-${category}`);
    dialog.querySelector('[data-addon-total]').textContent = api.money(api.cartSubtotal());
    dialog.querySelector('[data-addon-count]').textContent = `${api.getCart().reduce((sum, line) => sum + line.qty, 0)} פריטים בסל`;
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
      const availableCategories = categories().length ? categories() : ['drinks', 'sauces'];
      category = availableCategories.includes(initialCategory) ? initialCategory : recommendations[0] ? categoryOf(api.findProduct(recommendations[0].productId)) : availableCategories[0];
      api.beforeOpen?.();
      const product = line && api.findProduct(line.config.productId);
      dialog.innerHTML = `<div class="addon-flow__panel">
        <!-- THESIS: Complete the pizza order with optional drinks and side dips. OWN-WORLD: Existing white Heebo ordering surfaces and tomato actions. STORY: Pizza is saved; choose explicitly, then continue. FIRST VIEWPORT: Compact confirmation, two tabs, product rows and fixed basket action. FORM: One optional step after a new pizza. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->
        <header class="addon-flow__header"><div>${product ? `<p class="addon-flow__saved" role="status">${glyph('check')}נוסף לסל · ${escape(product.name)}${line.qty > 1 ? ` · ${line.qty} יח׳` : ''}</p>` : ''}<h2 id="addon-title" tabindex="-1">${product ? 'מה נוסיף להזמנה?' : 'שתייה ורטבים'}</h2><p>בוחרים מה שמתחשק. אפשר להמשיך גם בלי להוסיף.</p></div><button type="button" class="icon-button" data-addon-close aria-label="סגירת שתייה ורטבים">${glyph('close')}</button></header>
        <div class="addon-tabs" role="tablist" aria-label="בחירת קטגוריה">${availableCategories.map(value => `<button type="button" role="tab" id="addon-tab-${value}" data-addon-tab="${value}" aria-controls="addon-content">${labels[value]}</button>`).join('')}</div>
        <div class="addon-flow__content" id="addon-content" role="tabpanel" data-addon-content></div>
        <p class="addon-flow__status" data-addon-status role="status"></p>
        <footer class="addon-flow__footer"><div class="addon-flow__sum"><span>סכום מוצרים<small data-addon-count></small></span><strong data-addon-total></strong></div><button type="button" class="button button--primary" data-addon-cart>${glyph('cart')}המשך לסל</button>${product ? '<button type="button" class="link-button" data-addon-more>עוד פיצה</button>' : ''}${api.demoOnly ? '<small class="addon-flow__demo">מוצרים, תמונות ומחירים לדוגמה</small>' : ''}</footer>
      </div>`;
      if (!dialog.open) dialog.showModal();
      renderDialog();
      dialog.querySelector('#addon-title').focus({ preventScroll: true });
      if (productId) dialog.querySelector(`[data-addon-product="${CSS.escape(productId)}"]`)?.scrollIntoView({ block: 'nearest' });
      if (api.refreshCatalog) {
        const sequence = ++refreshSequence;
        refreshing = true;
        renderDialog();
        dialog.querySelector('[data-addon-status]').textContent = 'בודקים מחירים וזמינות…';
        Promise.resolve().then(api.refreshCatalog).then(changed => {
          if (!dialog.open || sequence !== refreshSequence) return;
          refreshing = false;
          if (!products().some(orderable)) { controller.close(); api.openCart(); return; }
          const availableCategories = categories();
          if (!availableCategories.includes(category)) category = availableCategories[0];
          recommendations = addonRecommendations(api.getCart(), api.getProducts());
          renderDialog(); refreshMenus();
          dialog.querySelector('[data-addon-status]').textContent = changed ? 'המחירים והזמינות עודכנו.' : '';
        }).catch(() => {
          if (!dialog.open || sequence !== refreshSequence) return;
          // Keep explicit additions blocked until current availability is checked.
          dialog.querySelector('[data-addon-status]').innerHTML = 'לא הצלחנו לעדכן את התפריט. אפשר להמשיך לסל או <button type="button" class="link-button" data-addon-retry>לנסות שוב</button>.';
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
    if (button.hasAttribute('data-addon-cart')) { controller.close(); api.openCart(); return; }
    if (button.hasAttribute('data-addon-more')) { controller.close(); api.onMore(); return; }
    if (button.hasAttribute('data-addon-retry')) { controller.openStep({ line: source, category }); return; }
    if (button.dataset.addonTab) { category = button.dataset.addonTab; dialog.querySelector('[data-addon-content]').scrollTop = 0; renderDialog(); return; }
    if (button.dataset.addonCustom) { controller.close(); api.onProduct(button.dataset.addonCustom); return; }
    if (button.dataset.addonVolume) {
      (inDialog ? selected : menuSelected).set(button.dataset.addonProductId, button.dataset.addonVolume);
      inDialog ? renderDialog() : refreshMenus();
      return;
    }
    if (button.dataset.addonAction) {
      try {
        changeAddonQuantity(api, button.dataset.addonProductId, button.dataset.addonVariant, button.dataset.addonAction === 'plus' ? 1 : -1);
        const status = inDialog ? dialog.querySelector('[data-addon-status]') : document.querySelector('[data-addon-menu-status]');
        if (status) status.textContent = `${api.findProduct(button.dataset.addonProductId).name} · ${addonQuantity(api.getCart(), button.dataset.addonProductId, button.dataset.addonVariant)} בסל`;
      } catch (error) {
        const status = inDialog ? dialog.querySelector('[data-addon-status]') : document.querySelector('[data-addon-menu-status]');
        if (status) status.textContent = error.message;
      }
    }
  }
  dialog.addEventListener('click', event => { if (event.target === dialog) controller.close(); else action(event); });
  dialog.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-addon-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...dialog.querySelectorAll('[data-addon-tab]')], index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowLeft' ? 1 : -1) + tabs.length) % tabs.length;
    category = tabs[next].dataset.addonTab; renderDialog(); tabs[next].focus();
  });
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
