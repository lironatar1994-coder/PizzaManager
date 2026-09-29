// Keep the same summary node and event handlers when the layout changes.
let activeCleanup;

export function mountCheckoutFlow() {
  activeCleanup?.();
  const form = document.querySelector('#checkout-form');
  const summary = document.querySelector('.checkout .summary');
  if (!form || !summary) return () => {};
  const anchor = document.createComment('checkout summary position');
  summary.before(anchor);
  const desktop = window.matchMedia('(min-width: 900px)');
  const receipt = summary.querySelector('.checkout-summary');
  const place = () => {
    if (desktop.matches) anchor.after(summary);
    else form.querySelector('.page-head').after(summary);
    if (receipt) receipt.open = desktop.matches;
  };
  place();
  desktop.addEventListener('change', place);
  const cleanup = () => {
    desktop.removeEventListener('change', place);
    if (anchor.isConnected && summary.isConnected) anchor.after(summary);
    anchor.remove();
    if (activeCleanup === cleanup) activeCleanup = null;
  };
  activeCleanup = cleanup;
  return cleanup;
}
