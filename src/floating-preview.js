// Keep one reactive pizza and the original quantity/price controls attached.
let collapsedByCustomer = false;
export function setupFloatingPreview(stage) {
  const builder = stage.closest('.builder'), bar = document.querySelector('.buybar--builder');
  const inner = bar?.querySelector('.buybar__inner');
  const collapse = stage.querySelector('[data-preview-collapse]'), view = stage.querySelector('[data-preview-open]'), expand = stage.querySelector('[data-expand-pizza]');
  const quantity = builder?.querySelector('[data-builder-quantity]'), price = inner?.querySelector('[data-price-toggle]');
  if (!builder || !inner || !collapse || !view || !expand) return () => {};
  const stageOrigin = document.createComment('pizza preview origin'); stage.before(stageOrigin);
  const quantityOrigin = document.createComment('quantity origin'), priceOrigin = document.createComment('price origin');
  quantity?.before(quantityOrigin); price?.before(priceOrigin);
  const dock = document.createElement('div'); dock.className = 'pizza-dock';
  const mobile = window.matchMedia('(max-width: 899px)'), viewport = window.visualViewport;
  let fullHeight = window.innerHeight, keyboardOpen = false, frame = 0, layoutFrame = 0;
  const measureDock = () => {
    if (!mobile.matches || !dock.isConnected) return;
    const height = Math.ceil(dock.getBoundingClientRect().height);
    if (height) builder.style.setProperty('--dock-height', `${height}px`);
  };
  const observer = new ResizeObserver(measureDock); observer.observe(stage); observer.observe(inner);
  const paint = () => {
    const minimized = collapsedByCustomer || keyboardOpen;
    stage.classList.toggle('is-minimized', mobile.matches && minimized);
    stage.classList.toggle('is-keyboard-hidden', mobile.matches && keyboardOpen);
    collapse.setAttribute('aria-expanded', String(!minimized));
    collapse.setAttribute('aria-label', minimized ? 'הגדלת תצוגת הפיצה' : 'צמצום תצוגת הפיצה');
    measureDock(); frame = 0;
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
  const keyboard = () => {
    const editing = document.activeElement?.matches('input:not([type="radio"]):not([type="checkbox"]), textarea, select');
    const height = viewport?.height || window.innerHeight;
    if (!editing) fullHeight = Math.max(window.innerHeight, height);
    keyboardOpen = mobile.matches && editing && height < fullHeight - 150;
    schedule();
  };
  const mount = () => {
    builder.classList.toggle('builder--floating-preview', mobile.matches);
    bar.classList.toggle('has-floating-preview', mobile.matches);
    stage.classList.toggle('stage--floating', mobile.matches);
    stage.classList.remove('is-compact', 'is-pinned'); stage.style.setProperty('--p', '0');
    stage.querySelector('.stage__pizza').style.transform = '';
    collapse.hidden = !mobile.matches; view.hidden = !mobile.matches;
    if (mobile.matches) {
      if (!dock.isConnected) inner.before(dock);
      dock.append(stage, inner); if (quantity) inner.prepend(quantity); if (price) stage.append(price);
    } else {
      stageOrigin.after(stage);
      if (quantity) quantityOrigin.after(quantity); if (price) priceOrigin.after(price);
      if (inner.parentElement === dock) dock.before(inner);
      dock.remove(); stage.classList.remove('is-minimized', 'is-keyboard-hidden');
    }
    keyboard(); measureDock();
  };
  const toggle = () => { collapsedByCustomer = !collapsedByCustomer; paint(); };
  const open = () => expand.click();
  collapse.addEventListener('click', toggle); view.addEventListener('click', open);
  mobile.addEventListener('change', mount); window.addEventListener('resize', keyboard); viewport?.addEventListener('resize', keyboard);
  document.addEventListener('focusin', keyboard); document.addEventListener('focusout', keyboard);
  mount(); layoutFrame = requestAnimationFrame(measureDock);
  return () => {
    collapse.removeEventListener('click', toggle); view.removeEventListener('click', open);
    mobile.removeEventListener('change', mount); window.removeEventListener('resize', keyboard); viewport?.removeEventListener('resize', keyboard);
    document.removeEventListener('focusin', keyboard); document.removeEventListener('focusout', keyboard);
    cancelAnimationFrame(frame); cancelAnimationFrame(layoutFrame); observer.disconnect();
    stageOrigin.after(stage); if (quantity) quantityOrigin.after(quantity); if (price) priceOrigin.after(price);
    if (inner.parentElement === dock) dock.before(inner);
    dock.remove(); stageOrigin.remove(); quantityOrigin.remove(); priceOrigin.remove();
  };
}
