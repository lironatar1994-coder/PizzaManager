// Keep one reactive pizza and the original quantity/price controls attached.
let collapsedByCustomer = false;
export function setupFloatingPreview(stage) {
  const builder = stage.closest('.builder'), bar = document.querySelector('.buybar--builder');
  const inner = bar?.querySelector('.buybar__inner');
  const collapse = stage.querySelector('[data-preview-collapse]'), view = stage.querySelector('[data-preview-open]'), expand = stage.querySelector('[data-expand-pizza]');
  const quantity = builder?.querySelector('[data-builder-quantity]'), price = inner?.querySelector('[data-price-toggle]');
  if (!builder || !inner || !collapse || !view || !expand) return () => {};
  const spacer = document.createElement('div');
  spacer.className = 'preview-spacer'; spacer.setAttribute('aria-hidden', 'true'); stage.before(spacer);
  const quantityOrigin = document.createComment('quantity origin'), priceOrigin = document.createComment('price origin');
  quantity?.before(quantityOrigin); price?.before(priceOrigin);
  const caption = document.createElement('div'); caption.className = 'stage__caption';
  caption.innerHTML = '<h2>הפיצה שלכם</h2><p>בדיוק כמו שאתם אוהבים</p><span aria-hidden="true"></span>';
  stage.append(caption);
  const basePhoto = stage.querySelector('image')?.getAttribute('href');
  if (basePhoto) stage.style.setProperty('--builder-tabletop', `url("${new URL('builder-tabletop-v1.webp', new URL(basePhoto, window.location.href)).href}")`);
  const dock = document.createElement('div'); dock.className = 'pizza-dock';
  const mobile = window.matchMedia('(max-width: 899px)'), viewport = window.visualViewport;
  let fullHeight = window.innerHeight, keyboardOpen = false, frame = 0, layoutFrame = 0, expandedHeight = 180, headerHeight = 64;
  const measureDock = () => {
    const height = Math.ceil(inner.getBoundingClientRect().height);
    if (height) builder.style.setProperty('--dock-action-height', `${height}px`);
  };
  const observer = new ResizeObserver(measureDock); observer.observe(inner);
  const paint = () => {
    const pinned = mobile.matches && spacer.getBoundingClientRect().top + expandedHeight < headerHeight + 24;
    const minimized = collapsedByCustomer || keyboardOpen || pinned;
    spacer.style.height = pinned ? `${expandedHeight}px` : '0px';
    stage.classList.toggle('is-pinned', pinned);
    stage.classList.toggle('is-minimized', mobile.matches && minimized);
    stage.classList.toggle('is-keyboard-hidden', mobile.matches && keyboardOpen);
    collapse.setAttribute('aria-expanded', String(!minimized));
    collapse.setAttribute('aria-label', minimized ? 'הגדלת הפיצה ועריכת חצאים' : 'צמצום תצוגת הפיצה');
    frame = 0;
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
  const keyboard = () => {
    const editing = document.activeElement?.matches('input:not([type="radio"]):not([type="checkbox"]), textarea, select');
    const height = viewport?.height || window.innerHeight;
    if (!editing) fullHeight = Math.max(window.innerHeight, height);
    keyboardOpen = mobile.matches && editing && height < fullHeight - 150;
    schedule();
  };
  const measureLayout = () => {
    headerHeight = document.querySelector('.topbar')?.getBoundingClientRect().height || 64;
    expandedHeight = Math.max(160, Math.min(210, window.innerWidth * .45));
    stage.style.setProperty('--preview-expanded-height', `${expandedHeight}px`);
    stage.style.setProperty('--preview-header-height', `${headerHeight}px`);
    measureDock(); keyboard();
  };
  const mount = () => {
    builder.classList.toggle('builder--floating-preview', mobile.matches);
    bar.classList.toggle('has-floating-preview', mobile.matches);
    stage.classList.toggle('stage--floating', mobile.matches);
    stage.classList.remove('is-compact'); stage.style.setProperty('--p', '0');
    stage.querySelector('.stage__pizza').style.transform = '';
    collapse.hidden = !mobile.matches; view.hidden = !mobile.matches;
    if (mobile.matches) {
      if (!dock.isConnected) inner.before(dock);
      dock.append(inner); if (quantity) inner.prepend(quantity); if (price) stage.append(price);
    } else {
      if (quantity) quantityOrigin.after(quantity); if (price) priceOrigin.after(price);
      if (inner.parentElement === dock) dock.before(inner);
      dock.remove(); spacer.style.height = '0px'; stage.classList.remove('is-pinned', 'is-minimized', 'is-keyboard-hidden');
    }
    measureLayout();
  };
  const toggle = () => {
    if (stage.classList.contains('is-pinned')) { expand.click(); return; }
    collapsedByCustomer = !collapsedByCustomer; paint();
  };
  const open = () => expand.click();
  collapse.addEventListener('click', toggle); view.addEventListener('click', open);
  mobile.addEventListener('change', mount); window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measureLayout); viewport?.addEventListener('resize', keyboard);
  document.addEventListener('focusin', keyboard); document.addEventListener('focusout', keyboard);
  mount(); layoutFrame = requestAnimationFrame(measureLayout);
  return () => {
    collapse.removeEventListener('click', toggle); view.removeEventListener('click', open);
    mobile.removeEventListener('change', mount); window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', measureLayout); viewport?.removeEventListener('resize', keyboard);
    document.removeEventListener('focusin', keyboard); document.removeEventListener('focusout', keyboard);
    cancelAnimationFrame(frame); cancelAnimationFrame(layoutFrame); observer.disconnect();
    if (quantity) quantityOrigin.after(quantity); if (price) priceOrigin.after(price);
    if (inner.parentElement === dock) dock.before(inner);
    dock.remove(); caption.remove(); spacer.remove(); quantityOrigin.remove(); priceOrigin.remove();
  };
}
