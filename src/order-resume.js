// Returning customers keep their work; this notice never blocks ordering.
export function createOrderResume({ products, getDraft, getCart, openCart, clearCart, render, onCartChange }) {
  const returningDrafts = new Set(products.filter(product => getDraft(`product:${product.id}`, product)).map(product => `product:${product.id}`));
  const entryHash = location.hash;
  const seenKeys = new Set();
  let returningCart = getCart().length > 0, activeBuilder = null, notice = null, hiddenAt = 0;
  const dismiss = () => { notice?.remove(); notice = null; };
  const show = ({ cart = false, reset, label = 'הפיצה שלכם' } = {}) => {
    dismiss();
    const node = document.createElement('section');
    node.className = `order-resume${activeBuilder ? ' order-resume--builder' : ''}`;
    node.setAttribute('aria-label', 'המשך הזמנה שמורה');
    node.innerHTML = '<div class="order-resume__copy" role="status"><strong></strong><span></span></div><button type="button" data-resume-close aria-label="סגירת הודעת השמירה"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button><div class="order-resume__actions"><button type="button" data-resume-continue></button><button type="button" data-resume-reset>מתחילים מחדש</button></div>';
    const title = node.querySelector('strong'), detail = node.querySelector('.order-resume__copy span');
    title.textContent = cart ? 'הסל שלכם נשמר' : `${label} נשמרה`;
    detail.textContent = 'ממשיכים מאיפה שעצרתם.';
    const proceed = node.querySelector('[data-resume-continue]'), restart = node.querySelector('[data-resume-reset]');
    proceed.textContent = cart ? 'לסל' : 'ממשיכים';
    let confirming = false;
    proceed.addEventListener('click', () => { dismiss(); if (cart) openCart(); });
    restart.addEventListener('click', () => {
      if (!confirming) {
        confirming = true;
        title.textContent = cart ? 'לרוקן את הסל?' : 'לאפס את ההרכבה?';
        detail.textContent = cart ? 'הפריטים השמורים יוסרו מהסל.' : 'הבחירות ששמרנו בהרכבה הזו יימחקו.';
        restart.textContent = cart ? 'ריקון הסל' : 'איפוס ההרכבה';
        proceed.textContent = 'שומרים וממשיכים';
        node.setAttribute('aria-label', 'אישור התחלה מחדש');
      } else { dismiss(); reset(); }
    });
    node.querySelector('[data-resume-close]').addEventListener('click', dismiss);
    document.body.append(node); notice = node;
  };
  const cartNotice = () => { if (getCart().length) show({ cart: true, reset: () => { clearCart(); render(); } }); };
  const returnToPage = () => {
    if (document.querySelector('dialog[open]')) return;
    if (activeBuilder?.saved()) show(activeBuilder);
    else if (!activeBuilder && !/#\/(done|status)/.test(location.hash)) cartNotice();
  };
  window.addEventListener('pageshow', event => { if (event.persisted) returnToPage(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 30000) { hiddenAt = 0; returnToPage(); }
  });
  onCartChange(dismiss);
  return {
    builder({ draft, key, product, form, reset }) {
      activeBuilder = { reset, label: product.visual === 'pizza' ? 'הפיצה שלכם' : 'ההרכבה שלכם', saved: () => Boolean(getDraft(key, product)) };
      // A draft created during this visit must not look like a restored order.
      if (draft && !seenKeys.has(key) && (returningDrafts.has(key) || location.hash === entryHash && /^(edit|copy):/.test(key))) {
        seenKeys.add(key);
        returningDrafts.delete(key); returningCart = false; show(activeBuilder);
      }
      const changed = () => dismiss();
      const clicked = event => { if (event.target.closest('[data-qty], [data-clear-group], #add-to-cart')) dismiss(); };
      form.addEventListener('change', changed); form.addEventListener('input', changed);
      document.addEventListener('click', clicked);
      return () => { activeBuilder = null; dismiss(); form.removeEventListener('change', changed); form.removeEventListener('input', changed); document.removeEventListener('click', clicked); };
    },
    page() {
      if (!returningCart) return;
      returningCart = false;
      if (!/#\/(done|status|checkout)/.test(location.hash)) cartNotice();
    },
    dismiss,
  };
}
