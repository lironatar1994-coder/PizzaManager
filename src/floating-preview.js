// A single live pizza moves between the desktop column and the mobile action dock.
// Its SVG, configuration and existing full-preview editor stay attached to the DOM.
let collapsedByCustomer = false;

export function setupFloatingPreview(stage) {
  const builder = stage.closest('.builder');
  const bar = document.querySelector('.buybar--builder');
  const collapse = stage.querySelector('[data-preview-collapse]');
  const view = stage.querySelector('[data-preview-open]');
  const expand = stage.querySelector('[data-expand-pizza]');
  if (!builder || !bar || !collapse || !view || !expand) return () => {};

  const origin = document.createComment('desktop pizza preview');
  stage.before(origin);
  const mobile = window.matchMedia('(max-width: 899px)');
  const viewport = window.visualViewport;
  let fullHeight = window.innerHeight;
  let keyboardOpen = false;
  let frame = 0;

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
      if (stage.parentElement !== bar) bar.querySelector('.buybar__inner').before(stage);
    } else if (stage.parentElement !== builder) {
      origin.after(stage);
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
    if (origin.isConnected) origin.after(stage);
    origin.remove();
  };
}
