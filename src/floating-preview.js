// A single live pizza moves between the desktop column and the mobile action dock.
// Its SVG, configuration and existing full-preview editor stay attached to the DOM.
let collapsedByCustomer = false;

export function setupFloatingPreview(stage) {
  const builder = stage.closest('.builder');
  const bar = document.querySelector('.buybar--builder');
  const inner = bar?.querySelector('.buybar__inner');
  const collapse = stage.querySelector('[data-preview-collapse]');
  const view = stage.querySelector('[data-preview-open]');
  const expand = stage.querySelector('[data-expand-pizza]');
  const quantity = builder?.querySelector('[data-builder-quantity]');
  const price = inner?.querySelector('[data-price-toggle]');
  if (!builder || !bar || !inner || !collapse || !view || !expand) return () => {};

  const origin = document.createComment('desktop pizza preview');
  stage.before(origin);
  const quantityOrigin = document.createComment('builder quantity');
  const priceOrigin = document.createComment('builder price disclosure');
  quantity?.before(quantityOrigin);
  price?.before(priceOrigin);
  const dock = document.createElement('div');
  dock.className = 'pizza-dock';
  const mobile = window.matchMedia('(max-width: 899px)');
  const viewport = window.visualViewport;
  let fullHeight = window.innerHeight;
  let keyboardOpen = false;
  let frame = 0;

  const measureDock = () => {
    const actionHeight = Math.ceil(inner.getBoundingClientRect().height);
    if (actionHeight) dock.style.setProperty('--dock-action-height', `${actionHeight}px`);
  };
  const sizeObserver = new ResizeObserver(measureDock);
  sizeObserver.observe(inner);

  const paint = () => {
    const minimized = collapsedByCustomer || keyboardOpen;
    stage.classList.toggle('is-minimized', mobile.matches && minimized);
    collapse.setAttribute('aria-expanded', String(!minimized));
    collapse.setAttribute('aria-label', minimized ? 'פתיחת תצוגת הפיצה' : 'צמצום תצוגת הפיצה');
  };
  const measureKeyboard = () => {
    frame = 0;
    const editing = document.activeElement?.matches('input:not([type="radio"]):not([type="checkbox"]), textarea, select');
    const height = viewport?.height || window.innerHeight;
    if (!editing) fullHeight = Math.max(window.innerHeight, height);
    keyboardOpen = mobile.matches && editing && height < fullHeight - 150;
    paint();
  };
  const scheduleKeyboard = () => {
    if (!frame) frame = requestAnimationFrame(measureKeyboard);
  };
  const undock = () => {
    if (inner.parentElement === dock) dock.before(inner);
    dock.remove();
  };
  const mount = () => {
    stage.classList.remove('is-compact');
    stage.style.setProperty('--p', '0');
    stage.querySelector('.stage__pizza').style.transform = '';
    builder.classList.toggle('builder--floating-preview', mobile.matches);
    bar.classList.toggle('has-floating-preview', mobile.matches);
    stage.classList.toggle('stage--floating', mobile.matches);
    collapse.hidden = !mobile.matches;
    view.hidden = !mobile.matches;
    if (mobile.matches) {
      if (!dock.isConnected) inner.before(dock);
      if (stage.parentElement !== dock) dock.append(stage);
      if (inner.parentElement !== dock) dock.append(inner);
      // Move the existing controls, retaining their quantity and price listeners.
      if (quantity && quantity.parentElement !== inner) inner.prepend(quantity);
      if (price && price.parentElement !== stage) stage.append(price);
      measureDock();
    } else {
      if (quantityOrigin.isConnected) quantityOrigin.after(quantity);
      if (priceOrigin.isConnected) priceOrigin.after(price);
      if (stage.parentElement !== builder) origin.after(stage);
      undock();
    }
    measureKeyboard();
  };
  const toggle = () => {
    collapsedByCustomer = !(collapsedByCustomer || keyboardOpen);
    keyboardOpen = false;
    paint();
  };
  const open = () => expand.click();
  collapse.addEventListener('click', toggle);
  view.addEventListener('click', open);
  mobile.addEventListener('change', mount);
  window.addEventListener('resize', scheduleKeyboard);
  viewport?.addEventListener('resize', scheduleKeyboard);
  document.addEventListener('focusin', scheduleKeyboard);
  document.addEventListener('focusout', scheduleKeyboard);
  mount();

  return () => {
    collapse.removeEventListener('click', toggle);
    view.removeEventListener('click', open);
    mobile.removeEventListener('change', mount);
    window.removeEventListener('resize', scheduleKeyboard);
    viewport?.removeEventListener('resize', scheduleKeyboard);
    document.removeEventListener('focusin', scheduleKeyboard);
    document.removeEventListener('focusout', scheduleKeyboard);
    cancelAnimationFrame(frame);
    sizeObserver.disconnect();
    if (quantityOrigin.isConnected) quantityOrigin.after(quantity);
    if (priceOrigin.isConnected) priceOrigin.after(price);
    if (origin.isConnected) origin.after(stage);
    undock();
    origin.remove();
    quantityOrigin.remove();
    priceOrigin.remove();
  };
}
