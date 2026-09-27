import { shop } from './data.js';

export const money = (amount) => `₪${new Intl.NumberFormat('he-IL').format(amount)}`;

export const PLACEMENTS = {
  right: { label: 'חצי ימין', short: 'בחצי הימני' },
  whole: { label: 'כל הפיצה', short: '' },
  left: { label: 'חצי שמאל', short: 'בחצי השמאלי' },
};

export function variantsFor(product) {
  return product.variants?.length ? product.variants : [{ id: 'default', name: '', detail: '', price: product.price ?? 0, scale: 1 }];
}

export function defaultConfig(product) {
  const options = {};
  for (const group of product.optionGroups || []) options[group.id] = group.type === 'single' ? group.choices[0]?.id : {};
  return { productId: product.id, variantId: variantsFor(product)[0].id, options, note: '' };
}

// שומר על תצורה תקינה גם אם המוצר השתנה מאז שנשמרה בסל.
export function normalizeConfig(product, config) {
  const base = defaultConfig(product);
  if (!config) return base;
  const variants = variantsFor(product);
  const variantId = variants.some((variant) => variant.id === config.variantId) ? config.variantId : base.variantId;
  const options = {};
  for (const group of product.optionGroups || []) {
    const saved = config.options?.[group.id];
    if (group.type === 'single') options[group.id] = group.choices.some((choice) => choice.id === saved) ? saved : base.options[group.id];
    else {
      options[group.id] = {};
      for (const choice of group.choices) {
        const placement = saved?.[choice.id];
        if (placement) options[group.id][choice.id] = group.placement && PLACEMENTS[placement] ? placement : 'whole';
      }
    }
  }
  return { productId: product.id, variantId, options, note: typeof config.note === 'string' ? config.note : '' };
}

export function choicePrice(choice, placement = 'whole') {
  if (!choice.price) return 0;
  return placement === 'whole' ? choice.price : Math.ceil(choice.price * shop.halfToppingFactor);
}

export function selectedVariant(product, config) {
  const variants = variantsFor(product);
  return variants.find((variant) => variant.id === config.variantId) || variants[0];
}

export function unitPrice(product, config) {
  let total = selectedVariant(product, config).price;
  for (const group of product.optionGroups || []) {
    const value = config.options[group.id];
    if (group.type === 'single') total += choicePrice(group.choices.find((choice) => choice.id === value) || { price: 0 });
    else for (const [choiceId, placement] of Object.entries(value || {})) {
      const choice = group.choices.find((item) => item.id === choiceId);
      if (choice) total += choicePrice(choice, placement);
    }
  }
  return total;
}

// שורות קריאות לסיכום, לסל ולכרטיס ההזמנה.
export function describe(product, config) {
  const variant = selectedVariant(product, config);
  const singles = [];
  const extras = [];
  for (const group of product.optionGroups || []) {
    const value = config.options[group.id];
    if (group.type === 'single') {
      const choice = group.choices.find((item) => item.id === value);
      if (choice && group.choices.length > 1) singles.push(group.visualRole === 'crust' ? `בצק ${choice.name}` : choice.name);
    } else {
      for (const choice of group.choices) {
        const placement = value?.[choice.id];
        if (!placement) continue;
        extras.push({ id: choice.id, name: choice.name, placement, text: PLACEMENTS[placement].short ? `${choice.name} ${PLACEMENTS[placement].short}` : choice.name });
      }
    }
  }
  const title = variant.name ? `${product.name} · ${variant.name}` : product.name;
  return { title, variant, singles, extras };
}

export function lineTotal(line, product) {
  return unitPrice(product, line.config) * line.qty;
}
