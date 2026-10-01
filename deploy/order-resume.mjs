// Only these named hooks extend the incumbent customer flow.
const start = '/* Saved-order hooks. */', end = '/* End saved-order hooks. */';
const block = text => `${start}\n${text}\n${end}\n`;
export function withoutOrderResume(app) {
  return app.replace(/\/\* Saved-order hooks\. \*\/[\s\S]*?\/\* End saved-order hooks\. \*\/\n/g, '');
}
export function orderResumeApp(app, tag) {
  let result = withoutOrderResume(app);
  const insert = (anchor, replacement) => {
    if (result.split(anchor).length !== 2) throw Error(`Saved-order hook boundary changed: ${anchor}`);
    result = result.replace(anchor, replacement);
  };
  result = block(`import { createOrderResume } from './order-resume.js?v=${tag}';`) + result;
  const entry = "const app = document.querySelector('#app');\n";
  insert(entry, entry + block('const orderResume = createOrderResume({ products: activeProducts(), getDraft, getCart, openCart, clearCart, render, onCartChange });'));
  const builder = '  return savedScroll;\n';
  insert(builder, block(`  teardown.push(orderResume.builder({ draft, key: draftKey, product, form, reset: () => { hasDraft = false; clearDraft(draftKey); freshBuilder = true; render(); } }));`) + builder);
  const render = 'function render() {\n';
  insert(render, render + block('  orderResume.dismiss();'));
  const scroll = "  window.scrollTo({ top: restoreScroll, behavior: 'instant' });\n";
  insert(scroll, scroll + block('  orderResume.page();'));
  if (withoutOrderResume(result) !== withoutOrderResume(app)) throw Error('Saved-order hooks changed other app behavior');
  return result;
}
