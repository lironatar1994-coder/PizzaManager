import { shop } from './data.js?v=20260928-family1';

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
  return { productId: product.id, variantId: variantsFor(product)[0].id, options, note: '', label: '' };
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
  return { productId: product.id, variantId, options, note: typeof config.note === 'string' ? config.note.slice(0, 200) : '', label: typeof config.label === 'string' ? config.label.replace(/\s+/g, ' ').trim().slice(0, 40) : '' };
}

// שינויי חצאים נשארים כלליים: גדלים, בצק, שם והערה אינם משתנים.
export function copyHalf(product, config, from) {
  const next = normalizeConfig(product, config);
  if (!['right', 'left'].includes(from)) return next;
  for (const group of product.optionGroups || []) {
    if (group.type !== 'multi' || !group.placement) continue;
    for (const choice of group.choices) {
      const placement = next.options[group.id][choice.id];
      if (placement === 'whole' || placement === from) next.options[group.id][choice.id] = 'whole';
      else delete next.options[group.id][choice.id];
    }
  }
  return next;
}

export function swapHalves(product, config) {
  const next = normalizeConfig(product, config);
  for (const group of product.optionGroups || []) {
    if (group.type !== 'multi' || !group.placement) continue;
    for (const [id, placement] of Object.entries(next.options[group.id])) {
      if (placement === 'right') next.options[group.id][id] = 'left';
      else if (placement === 'left') next.options[group.id][id] = 'right';
    }
  }
  return next;
}

export function clearExtras(product, config, groupId) {
  const next = normalizeConfig(product, config);
  for (const group of product.optionGroups || []) if (group.type === 'multi' && (!groupId || group.id === groupId)) next.options[group.id] = {};
  return next;
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
  return priceBreakdown(product, config).unit;
}

// אותו חישוב משמש את המחיר הכולל ואת הפירוט, כולל עיגול תוספות על חצי.
export function priceBreakdown(product, config, qty = 1) {
  const variant = selectedVariant(product, config);
  const rows = [{ name: variant.name ? `${product.name} · ${variant.name}` : product.name, amount: variant.price }];
  for (const group of product.optionGroups || []) {
    const value = config.options[group.id];
    if (group.type === 'single') {
      const choice = group.choices.find((item) => item.id === value);
      if (choice) rows.push({ name: group.visualRole === 'crust' ? `בצק ${choice.name}` : choice.name, amount: choicePrice(choice) });
    } else {
      for (const choice of group.choices) {
        const placement = value?.[choice.id];
        if (placement) rows.push({ name: PLACEMENTS[placement]?.short ? `${choice.name} ${PLACEMENTS[placement].short}` : choice.name, amount: choicePrice(choice, placement) });
      }
    }
  }
  const unit = rows.reduce((sum, row) => sum + row.amount, 0);
  return { rows, unit, qty, total: unit * qty };
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
        extras.push({ id: choice.id, name: choice.name, placement, divided: Boolean(group.placement), text: PLACEMENTS[placement].short ? `${choice.name} ${PLACEMENTS[placement].short}` : choice.name });
      }
    }
  }
  const title = variant.name ? `${product.name} · ${variant.name}` : product.name;
  return { title, variant, singles, extras, label: config.label || '' };
}

export function lineTotal(line, product) {
  return unitPrice(product, line.config) * line.qty;
}
