// Shared, deterministic catalog rules. No storage, network, or automatic additions.
export const categoryOf = product => ['drinks', 'sauces'].includes(product?.menuCategory) ? product.menuCategory : 'food';
export const isAddon = product => categoryOf(product) !== 'food';
export const primaryProducts = products => products.filter(product => !isAddon(product));
export const addonVariants = product => product.variants?.length ? product.variants : [{ id: 'default', name: '', price: product.price ?? 0 }];
export const orderable = product => Boolean(product?.active && product.available !== false && addonVariants(product).some(variant => variant.available !== false));
export const configurationOrderable = (product, config) => orderable(product) && addonVariants(product).some(variant => variant.id === config?.variantId && variant.available !== false);
export const cleanAddonLine = line => !line.config.note && !line.config.label && !line.config.items?.length && Object.values(line.config.options || {}).every(value => value && typeof value === 'object' && !Object.keys(value).length);
export const addonQuantity = (lines, productId, variantId) => lines.filter(line => line.config.productId === productId && line.config.variantId === variantId && cleanAddonLine(line)).reduce((sum, line) => sum + line.qty, 0);

export function containsPizza(product, products) {
  return product?.visual === 'pizza' || Boolean(product?.bundle?.some(part => products.find(child => child.id === part.productId)?.visual === 'pizza'));
}

export function addonRecommendations(lines, products) {
  const present = new Set();
  let pizzas = 0, sharing = false;
  const inspect = (product, config, qty) => {
    if (!product) return;
    present.add(categoryOf(product));
    if (product.visual === 'pizza') {
      pizzas += qty;
      const variant = addonVariants(product).find(item => item.id === config?.variantId);
      if (variant?.diameterCm >= 30) sharing = true;
    }
  };
  for (const line of lines) {
    const product = products.find(item => item.id === line.config.productId);
    inspect(product, line.config, line.qty);
    for (const part of product?.bundle || []) {
      const selected = line.config.items?.find(item => item.id === part.id)?.config || { variantId: part.variantId };
      inspect(products.find(item => item.id === part.productId), selected, line.qty);
    }
  }
  const family = sharing || pizzas >= 2;
  return ['drinks', 'sauces'].flatMap(category => {
    if (present.has(category)) return [];
    const candidates = products.filter(product => categoryOf(product) === category && orderable(product) && product.addonRecommendation !== 'off')
      .map((product, index) => ({ product, index })).sort((a, b) => Number(b.product.addonRecommendation === 'preferred') - Number(a.product.addonRecommendation === 'preferred') || a.index - b.index);
    if (!candidates.length) return [];
    const fits = item => family ? item.volumeMl >= 1000 : item.volumeMl > 0 && item.volumeMl <= 600;
    const product = category === 'drinks' ? (candidates.find(candidate => addonVariants(candidate.product).some(item => item.available !== false && fits(item))) || candidates[0]).product : candidates[0].product;
    const available = addonVariants(product).filter(variant => variant.available !== false);
    const variant = category === 'drinks' ? available.find(fits) || available[0] : available[0];
    return [{ productId: product.id, variantId: variant.id, reason: category === 'sauces' ? 'לצד הפיצה' : variant.volumeMl >= 1000 && family ? 'נפח משפחתי' : 'משהו לשתות' }];
  });
}

export function changeAddonQuantity(api, productId, variantId, delta) {
  const product = api.findProduct(productId), variant = product && addonVariants(product).find(item => item.id === variantId);
  if (!product || !isAddon(product) || !variant || ![1, -1].includes(delta)) throw Error('הבחירה אינה זמינה. חזרו לתפריט.');
  if (product.optionGroups?.length) throw Error('יש לבחור את אפשרויות המוצר לפני ההוספה.');
  const lines = api.getCart(), matches = lines.filter(line => line.config.productId === productId && line.config.variantId === variantId && cleanAddonLine(line));
  const qty = matches.reduce((sum, line) => sum + line.qty, 0);
  if (delta > 0) {
    if (!orderable(product) || variant.available === false) throw Error('המוצר או הנפח שבחרתם אזלו כרגע.');
    if (qty >= 99) throw Error('אפשר להזמין עד 99 יחידות מאותו מוצר ונפח.');
    const existing = matches.find(line => line.qty < 99);
    if (existing) return api.updateLine(existing.id, { qty: existing.qty + 1 });
    if (lines.length >= 40) throw Error('הסל כולל 40 שורות. אפשר לערוך או להסיר מוצר בסל.');
    return api.addLine({ ...api.defaultConfig(product), variantId }, 1);
  }
  const existing = matches.at(-1);
  if (!existing) return;
  if (existing.qty === 1) return api.removeLine(existing.id);
  return api.updateLine(existing.id, { qty: existing.qty - 1 });
}
