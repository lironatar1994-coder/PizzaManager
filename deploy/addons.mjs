// Guarded, repeatable integration for the static demo and managed storefront.
const marker = '// Add-ons integration v1.';
function required(source, before, after) {
  if (!source.includes(before)) throw Error(`Add-ons boundary changed: ${before.slice(0, 100)}`);
  return source.replace(before, after);
}
function availableVariantTiles(source) {
  const start = source.indexOf('function variantSection('), end = source.indexOf('function singleGroup(', start);
  if (start < 0 || end < 0) throw Error('Variant tiles boundary changed');
  let part = source.slice(start, end);
  if (part.includes('variant.available === false')) return source;
  part = required(part, "${variant.id === config.variantId ? 'checked' : ''} />", "${variant.id === config.variantId ? 'checked' : ''} ${variant.available === false ? 'disabled' : ''} />");
  part = required(part, '<strong>${safe(variant.name)}</strong>', '<strong>${safe(variant.name)}</strong>${variant.available === false ? \'<small>אזל כרגע</small>\' : \'\'}');
  return source.slice(0, start) + part + source.slice(end);
}
function unavailableCartNotice(source) {
  if (source.includes('data-unavailable-cart')) return source;
  return required(source, '<header class="page-head"><h1>פרטים ותשלום</h1></header>', '<header class="page-head"><h1>פרטים ותשלום</h1></header>${getCart().some(line => !configurationOrderable(findProduct(line.config.productId), line.config)) ? \'<div class="notice notice--warn" data-unavailable-cart role="alert"><span>יש פריט שאינו זמין כרגע. אפשר לערוך אותו בסל או לבדוק שוב את התפריט.</span><button type="button" class="button button--quiet button--small" data-reload-catalog>רענון התפריט</button></div>\' : \'\'}');
}
export function withAddonsApp(source, { platform = false } = {}) {
  let s = source.replace(/\r\n/g, '\n');
  if (s.includes(marker)) {
    if (!s.includes("onCheckout: () => { window.location.hash = '#/checkout'; }")) s = required(s, 'beforeOpen: () => { if (sheet.open) sheet.close(); }, openCart, onMore: () => freshProduct(),', "beforeOpen: () => { if (sheet.open) sheet.close(); }, openCart, onMore: () => freshProduct(),\n  onCheckout: () => { window.location.hash = '#/checkout'; },");
    if (!platform && !s.includes('lineIssues(line).length || !configurationOrderable')) s = required(s, 'const unavailable = getCart().some((line) => lineIssues(line).length);', 'const unavailable = getCart().some((line) => lineIssues(line).length || !configurationOrderable(findProduct(line.config.productId), line.config));');
    if (!s.includes('addon-unavailable-note')) s = required(s, '<div class="cart-line__actions">', '${!configurationOrderable(product, line.config) ? \'<p class="addon-unavailable-note">המוצר או הנפח אינם זמינים. יש לערוך או להסיר מהסל.</p>\' : \'\'}<div class="cart-line__actions">');
    if (platform && !s.includes('catalogProducts, refreshCatalog,')) {
      s = required(s, 'products as catalogProducts,', 'products as catalogProducts, refreshCatalog,');
      s = required(s, 'getProducts: () => catalogProducts,', 'refreshCatalog, getProducts: () => catalogProducts,');
    }
    return unavailableCartNotice(platform ? availableVariantTiles(s) : s);
  }
  s = `import { createAddonFlow, addonArt } from './addons.js';\nimport { primaryProducts, isAddon, containsPizza, configurationOrderable } from './addon-model.js';\n` + s;
  s = s.replace(/import \{([^}]+)\} from (['"]\.\/data\.js[^'"]*['"]);/, (_, names, path) => `import { products as catalogProducts,${platform ? ' refreshCatalog,' : ''}${names} } from ${path};`);
  if (!s.includes('products as catalogProducts')) throw Error('Managed catalog import changed');
  s = required(s, 'function productHref() {\n  const list = activeProducts();', 'function productHref() {\n  const list = primaryProducts(activeProducts());');
  if (!s.includes('const catalog = activeProducts(), list = primaryProducts(catalog);')) s = required(s, 'function home() {\n  const list = activeProducts();\n  const unavailable = list.length === 0;', 'function home() {\n  const catalog = activeProducts(), list = primaryProducts(catalog);\n  const unavailable = catalog.length === 0;');
  if (!s.includes('function menu() {\n  const list = primaryProducts(activeProducts());')) s = required(s, 'function menu() {\n  const list = activeProducts();', 'function menu() {\n  const list = primaryProducts(activeProducts());');
  if (!s.includes('${addonFlow.menuMarkup()}')) s = required(s, '<p class="menu-note">', '${addonFlow.menuMarkup()}<p class="addon-menu-status" data-addon-menu-status role="status"></p><p class="menu-note">');
  const fresh = s.indexOf('function freshProduct() {'), nextCart = s.indexOf('/* ---------- סל', fresh);
  if (fresh < 0 || nextCart < 0) throw Error('Fresh-product boundary changed');
  s = s.slice(0, fresh) + s.slice(fresh, nextCart).replace('const products = activeProducts();', 'const products = primaryProducts(activeProducts());') + s.slice(nextCart);
  const art = s.match(/function productArt\(product, config[^\n]*\) \{/);
  if (!art) throw Error('Product artwork boundary changed');
  s = s.replace(art[0], art[0] + `\n  if (isAddon(product)) return addonArt(product, variantsFor(product).find(item => item.id === config?.variantId) || variantsFor(product)[0], ${platform ? 'appUrl' : 'value => value'});`);
  s = required(s, 'function openAdded(line, updated) {', `function openAdded(line, updated) {\n  if (!updated && containsPizza(findProduct(line.config.productId), catalogProducts) && addonFlow.openStep({ line })) return;`);
  s = required(s, '<footer class="sheet__foot">', '<footer class="sheet__foot">${addonFlow.hasAvailable() ? \'<button type="button" class="link-button addon-cart-link" data-open-addons="drinks">שתייה ורטבים</button>\' : \'\'}');
  s = required(s, 'document.querySelector(\'#add-to-cart\').addEventListener(\'click\', async (event) => {', `document.querySelector('#add-to-cart').addEventListener('click', async (event) => {\n    if (!configurationOrderable(product, readConfig(form, product))) { status.textContent = 'המוצר או הגודל שבחרתם אינם זמינים כרגע.'; return; }`);
  if (platform) {
    const start = s.indexOf('function productPage('), refresh = s.indexOf('  const refresh = () => {', start);
    if (refresh < 0) throw Error('Builder refresh changed');
    s = s.slice(0, refresh) + s.slice(refresh).replace('  const refresh = () => {', "  const refresh = () => {\n    document.querySelector('#add-to-cart').disabled = !configurationOrderable(product, config);");
  } else s = required(s, ".disabled = isAdding || Boolean(issues.length);", ".disabled = isAdding || Boolean(issues.length) || !configurationOrderable(product, config);");
  s = required(s, "if (route.page === 'menu' && list.length > 1)", "if (route.page === 'menu' && list.length > 0)");
  s = required(s, '  if (sheet.open) sheet.close();\n', '  addonFlow.close();\n  if (sheet.open) sheet.close();\n');
  if (platform) {
    s = required(s, '  const blocked = !open', '  const unavailable = getCart().some(line => !configurationOrderable(findProduct(line.config.productId), line.config));\n  const blocked = unavailable || !open');
    s = required(s, '  const reason = !open ?', "  const reason = unavailable ? 'עדכנו את הפריטים שאינם זמינים' : !open ?");
    s = required(s, "if (!isOpen() || !getCart().length)", "if (!isOpen() || !getCart().length || getCart().some(line => !configurationOrderable(findProduct(line.config.productId), line.config)))");
    s = required(s, "}catch(error){checkout.failure=error.message", "}catch(error){checkout.catalogChanged=error.status===409;checkout.failure=error.message");
    s = required(s, "${safe(checkout.failure)}</span></div>", '${safe(checkout.failure)}</span>${checkout.catalogChanged ? \'<button type="button" class="button button--quiet button--small" data-reload-catalog>רענון התפריט</button>\' : \'\'}</div>');
  } else s = required(s, 'const unavailable = getCart().some((line) => lineIssues(line).length);', 'const unavailable = getCart().some((line) => lineIssues(line).length || !configurationOrderable(findProduct(line.config.productId), line.config));');
  s = required(s, '<div class="cart-line__actions">', '${!configurationOrderable(product, line.config) ? \'<p class="addon-unavailable-note">המוצר או הנפח אינם זמינים. יש לערוך או להסיר מהסל.</p>\' : \'\'}<div class="cart-line__actions">');
  const integration = `${marker}\nconst addonFlow = createAddonFlow({\n  ${platform ? 'refreshCatalog,' : ''} getProducts: () => catalogProducts, findProduct, getCart, defaultConfig, addLine, updateLine, removeLine, onCartChange, cartSubtotal, money,\n  assetUrl: ${platform ? 'appUrl' : 'value => value'}, demoOnly: shop.demoOnly,\n  beforeOpen: () => { if (sheet.open) sheet.close(); }, openCart, onMore: () => freshProduct(),\n  onCheckout: () => { window.location.hash = '#/checkout'; },\n  onProduct: id => { window.location.hash = \`#/product/\${id}\`; },\n});\ndocument.addEventListener('click', event => { if (event.target.closest('[data-reload-catalog]')) window.location.reload(); });\n\n`;
  s = required(s, 'function productHref() {', integration + 'function productHref() {');
  return unavailableCartNotice(platform ? availableVariantTiles(s) : s);
}

export function withAddonsOrder(source) {
  let s = source.replace(/\r\n/g, '\n');
  if (s.includes('// Keep unavailable add-on volumes explicit.')) return s;
  s = "import { isAddon } from './addon-model.js';\n" + s;
  const variant = s.match(/^  const variantId = (.+);$/m);
  if (!variant) throw Error('Configuration normalization changed');
  s = s.replace(variant[0], `  // Keep unavailable add-on volumes explicit. The customer chooses a replacement.\n  const variantId = isAddon(product) && typeof config.variantId === 'string' ? config.variantId : ${variant[1]};`);
  return s;
}
