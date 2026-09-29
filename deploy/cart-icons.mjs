// Icon actions retain the incumbent links, handlers and item-specific names.
export function cartIconActions(source) {
  if (!/^\s+trash:/m.test(source)) {
    source = source.replace('const ICONS = {', `const ICONS = {
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v6m4-6v6"/>',`);
  }
  if (!/^\s+edit:/m.test(source)) {
    source = source.replace('const ICONS = {', `const ICONS = {
  edit: '<path d="m15.5 4.5 4 4M4 20l4.5-1L20 7.5a2.8 2.8 0 0 0-4-4L4.5 15Z"/>',`);
  }
  const start = source.indexOf('function cartLineMarkup(');
  const end = source.indexOf('function renderCart()', start);
  if (start < 0 || end < 0) throw Error('Cart icon action boundary changed');
  let line = source.slice(start, end);
  if (!line.includes('class="cart-action"')) {
    const before = '<div class="cart-line__actions"><a href="#/product/${safe(product.id)}/edit/${safe(line.id)}" data-close-sheet>עריכה</a><a href="#/product/${safe(product.id)}/copy/${safe(line.id)}" data-copy-line="${safe(line.id)}" data-close-sheet>${icon(\'copy\')}שכפול ושינוי</a><button type="button" data-remove>הסרה</button></div>';
    const after = '<div class="cart-line__actions"><a class="cart-action" href="#/product/${safe(product.id)}/edit/${safe(line.id)}" data-close-sheet aria-label="עריכת ${safe(line.config.label || info.title)}" title="עריכה">${icon(\'edit\')}</a><a class="cart-action" href="#/product/${safe(product.id)}/copy/${safe(line.id)}" data-copy-line="${safe(line.id)}" data-close-sheet aria-label="שכפול ושינוי ${safe(line.config.label || info.title)}" title="שכפול ושינוי">${icon(\'copy\')}</a><button type="button" class="cart-action cart-action--remove" data-remove aria-label="הסרת ${safe(line.config.label || info.title)} מהסל" title="הסרה">${icon(\'trash\')}</button></div>';
    if (!line.includes(before)) throw Error('Cart action markup changed');
    line = line.replace(before, after);
  }
  source = source.slice(0, start) + line + source.slice(end);
  // Closing the sheet and deleting a saved item have different icon meanings.
  source = source.replace(/(data-remove-favorite="[^\n]+?\$\{icon\(')close('\)\}<\/button>)/g, '$1trash$2');
  if (!source.includes('cart-action--remove') || !source.includes("icon('trash')")) throw Error('Cart icon actions incomplete');
  return source;
}
