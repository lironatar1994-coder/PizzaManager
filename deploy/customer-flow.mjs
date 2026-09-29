// Presentation only. Keep the incumbent catalog, cart, address and payment code.
const startMarker = '/* Customer flow: quiet, compact surfaces. */';
const endMarker = '/* End customer flow. */';

function section(source, start, end, transform) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  if (first < 0 || last < 0) throw Error(`Customer flow boundary changed: ${start}`);
  return source.slice(0, first) + transform(source.slice(first, last)) + source.slice(last);
}

function required(source, before, after) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw Error(`Customer flow markup changed: ${before.slice(0, 75)}`);
  return source.replace(before, after);
}

export function customerFlowApp(source, { platform = false } = {}) {
  source = source.replace(/\r\n/g, '\n');
  if (!source.includes("import { mountCheckoutFlow }")) source = "import { mountCheckoutFlow } from './customer-flow.js';\n" + source;
  source = section(source, 'function checkoutBarMarkup()', 'function refreshCheckoutParts()', (part) => {
    if (part.includes('checkout-action-reason')) return part;
    return part.replace(/<div class="buybar__total\$\{reason[^\r\n]+?<\/div>/, '${reason ? `<p class="checkout-action-reason" role="status">${safe(reason)}</p>` : \'\'}');
  });
  source = section(source, 'function checkoutPage(', 'const form = document.querySelector(\'#checkout-form\');', (part) => {
    part = part.replace('<h1>פרטי ההזמנה</h1>', '<h1>פרטים ותשלום</h1>');
    part = part.replace('<h1>קופה לדוגמה</h1>', '<h1>פרטים ותשלום</h1>');
    part = part.replace('<small>ללא דמי משלוח</small>', '');
    part = part.replace('<strong>סביבת בדיקה:</strong> הזמנות נשמרות במערכת. התשלום מדומה ואין חיוב כספי.', '<strong>הדגמה · ללא חיוב.</strong> הזמנות בדיקה נשמרות במערכת.');
    part = part.replace('<strong>הדגמה בלבד:</strong> אין הזמנה או חיוב. המחירים ואזורי המשלוח להמחשה.', '<strong>הדגמה · ללא הזמנה או חיוב.</strong>');
    part = part.replace('class="notice notice--warn" role="status"', 'class="notice notice--warn checkout-demo" role="status"');
    part = part.replace('דירה, קומה והערות לשליח · לא חובה', 'דירה והערות לשליח');
    part = part.replace('>הכתובת נשלחת לשירות חיפוש חיצוני<', '>מידע על חיפוש הכתובת<');
    if (!part.includes('class="checkout-summary"')) {
      part = required(part, '<aside class="summary" aria-label="סיכום ההזמנה"><div class="summary__panel" id="summary">${summaryMarkup()}</div></aside>', '<aside class="summary" aria-label="סיכום ההזמנה"><details class="checkout-summary"><summary><span>סיכום · ${itemsText(cartCount())}</span><bdi data-short-total>${money(checkoutTotals().total)}</bdi>${icon(\'down\')}</summary><div class="summary__panel" id="summary">${summaryMarkup()}</div></details></aside>');
    }
    part = part.replace('סיכום ההזמנה · ${itemsText(cartCount())}', 'סיכום · ${itemsText(cartCount())}');
    part = part.replace('<div class="buybar"><div class="buybar__inner" id="checkout-bar">', '<div class="buybar buybar--checkout"><div class="buybar__inner" id="checkout-bar">');
    return part;
  });
  source = required(source, "const form = document.querySelector('#checkout-form');\n", "const form = document.querySelector('#checkout-form');\n  teardown.push(mountCheckoutFlow());\n");
  if (!source.includes('function checkoutCompositionMarkup(')) {
    const brief = `function checkoutCompositionMarkup(info) {
  if (info.components) return info.components.map((part) => \`<div class="summary__component"><strong>\${safe(part.name)} · \${safe(part.title)}</strong>\${checkoutCompositionMarkup(part)}\${part.note ? \`<small>הערה: \${safe(part.note)}</small>\` : ''}</div>\`).join('');
  return \`<small class="summary__composition-brief">\${safe([...info.singles, ...info.extras.map((extra) => extra.text)].join(' · '))}</small>\`;
}

`;
    source = source.replace('function summaryMarkup()', brief + 'function summaryMarkup()');
  }
  source = section(source, 'function summaryMarkup()', 'function checkoutPage(', (part) => part.replaceAll('${compositionMarkup(info)}', '${checkoutCompositionMarkup(info)}'));
  source = section(source, 'function refreshCheckoutParts()', 'function checkoutCompositionMarkup(', (part) => {
    if (part.includes('[data-short-total]')) return part;
    return required(part, "const bar = document.querySelector('#checkout-bar');", "const shortTotal = document.querySelector('[data-short-total]');\n  if (shortTotal) shortTotal.textContent = money(checkoutTotals().total);\n  const bar = document.querySelector('#checkout-bar');");
  });
  // Native details keep the composition and kitchen note one tap away.
  source = section(source, 'function cartLineMarkup(', 'function openCart(', (part) => {
    part = part.replace('<span>המשך להזמנה</span>', '<span>לפרטים ותשלום</span>');
    if (platform && !part.includes('cart-line__disclosure')) {
      part = required(part, '<div class="cart-line__details">${compositionMarkup(info)}${line.config.note ? `<p class="cart-line__note">הערה: <bdi>${safe(line.config.note)}</bdi></p>` : \'\'}</div>', '<details class="cart-line__details cart-line__disclosure"><summary><span>פירוט ההרכב${line.config.note ? \' והערה\' : \'\'}</span>${icon(\'down\')}</summary>${compositionMarkup(info)}${line.config.note ? `<p class="cart-line__note">הערה: <bdi>${safe(line.config.note)}</bdi></p>` : \'\'}</details>');
    } else if (!platform) part = part.replace('cartLineMarkup(line, cart.length >= 3)', 'cartLineMarkup(line, true)');
    return part;
  });
  source = section(source, 'function openInfo()', 'function renderFavorites()', (part) => part.replace('class="button button--quiet" href="${wazeHref()}"', 'class="button button--primary" href="${wazeHref()}"'));
  source = section(source, 'function renderFavorites()', 'function openFavorites()', (part) => part.replace('class="link-button" href="#/product/', 'class="button button--quiet favorite-line__choose" href="#/product/').replace('בחירה ושינוי', 'לפתיחה ועריכה'));
  if (platform) {
    source = section(source, 'function statusPage(', '/* ---------- ניתוב', (part) => {
      if (part.includes('class="order-reference"')) return part;
      part = required(part, 'document.querySelector(\'#order-status\').innerHTML=`<div class="done__layout"><section><h1', 'const receiptOpen = document.querySelector(\'.order-receipt\')?.open ?? window.matchMedia(\'(min-width: 900px)\').matches;\n  document.querySelector(\'#order-status\').innerHTML=`<div class="done__layout"><section class="done__intro"><p class="order-reference"><span>הזמנה</span><bdi>${safe(o.reference)}</bdi></p><h1');
      part = required(part, '<p>הזמנה <bdi>${safe(o.reference)}</bdi> · ${safe(o.shopName)}</p>', '<p class="done__shop">${safe(o.shopName)}</p>');
      part = part.replace('class="button" id="copy-tracking">העתקת קישור המעקב', 'class="button button--quiet" id="copy-tracking">העתקת קישור');
      part = part.replace('<a class="button button--quiet" href="#/">לעמוד הפיצרייה</a>', '<a class="button ${paid ? \'button--primary\' : \'button--quiet\'}" href="#/">לעמוד הפיצרייה</a>');
      part = required(part, '<p id="tracking-copy-output" role="status"></p></section><article class="ticket">', '<p id="tracking-copy-output" role="status"></p><div class="done__services">${shop.phone ? `<a class="button button--quiet" href="${phoneHref()}">${icon(\'phone\')}<span>חיוג</span></a>` : \'\'}${shop.location?.address ? `<a class="button button--quiet" href="${wazeHref()}" target="_blank" rel="noopener">${icon(\'pin\')}<span>ניווט</span></a>` : \'\'}</div></section><details class="order-receipt" ${receiptOpen ? \'open\' : \'\'}><summary><span>פרטי ההזמנה</span><bdi>${money(order.total)}</bdi>${icon(\'down\')}</summary><article class="ticket">');
      part = required(part, '</p></article></div>`;', '</p></article></details></div>`;');
      part = part.replace('<div><dt>משלוח</dt><dd><bdi>${money(order.fee)}</bdi></dd></div>', '<div><dt>${order.mode === \'pickup\' ? \'איסוף עצמי\' : \'משלוח\'}</dt><dd>${order.fee ? `<bdi>${money(order.fee)}</bdi>` : \'ללא עלות\'}</dd></div>');
      return part;
    });
  } else {
    source = section(source, 'function donePage()', '/* ---------- ניתוב', (part) => {
      if (part.includes('class="order-reference"')) return part;
      part = required(part, '<div class="done__intro">', '<div class="done__intro"><p class="order-reference"><span>הזמנה לדוגמה</span><bdi>${safe(order.reference)}</bdi></p>');
      part = part.replace('<strong>הדגמה: ההזמנה לא נשלחה ולא בוצע חיוב.</strong> במערכת האמיתית המסך הזה יופיע רק אחרי שהפיצרייה קיבלה את ההזמנה והתשלום אושר.', '<strong>הדגמה · ההזמנה לא נשלחה ולא בוצע חיוב.</strong>');
      part = part.replace('<a class="button button--quiet" href="#/">לעמוד הפתיחה</a>', '<a class="button button--primary" href="#/">לעמוד הפתיחה</a><div class="done__services"><a class="button button--quiet" href="${phoneHref()}">${icon(\'phone\')}חיוג</a><a class="button button--quiet" href="${wazeHref()}" target="_blank" rel="noopener">${icon(\'pin\')}ניווט</a></div>');
      part = required(part, '<div class="ticket-wrap"><article class="ticket"', '<details class="order-receipt" ${window.matchMedia(\'(min-width: 900px)\').matches ? \'open\' : \'\'}><summary><span>פרטי ההזמנה</span><bdi>${money(order.total)}</bdi>${icon(\'down\')}</summary><div class="ticket-wrap"><article class="ticket"');
      part = required(part, '</article></div>', '</article></div></details>');
      return part;
    });
  }
  if (!source.includes('checkout-action-reason') || !source.includes('teardown.push(mountCheckoutFlow())')) throw Error('Customer checkout adapter incomplete');
  return source;
}

export function customerFlowStyles(source, styles) {
  const first = source.indexOf(startMarker);
  if (first >= 0) {
    const last = source.indexOf(endMarker, first);
    if (last < 0) throw Error('Customer flow stylesheet marker changed');
    source = source.slice(0, first) + source.slice(last + endMarker.length);
  }
  return source.trimEnd() + '\n\n' + startMarker + '\n' + styles.trim() + '\n' + endMarker + '\n';
}
