import { shop, isAvailable, findProduct, demoFlags } from './data.js?v=20260929-menu4';

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
  for (const group of product.optionGroups || []) options[group.id] = group.type === 'single' ? (group.choices.find(isAvailable) || group.choices[0])?.id : {};
  const config = { productId: product.id, variantId: (variantsFor(product).find(isAvailable) || variantsFor(product)[0]).id, options, note: '', label: '' };
  if (product.bundle) config.items = product.bundle.flatMap((part) => {
    const child = findProduct(part.productId);
    if (!child || child.bundle) return [];
    const included = defaultConfig(child);
    if (part.variantId) included.variantId = part.variantId;
    return [{ id: part.id, config: included }];
  });
  return config;
}

// הרכב הקומבו נגזר מהתפריט: אי אפשר להזריק רכיב, כמות או מחיר מתוך הסל השמור.
export function bundleParts(product, config) {
  return (product.bundle || []).map((part) => {
    const child = findProduct(part.productId);
    if (!child || child.bundle) return { ...part, product: null };
    const included = defaultConfig(child);
    if (part.variantId) included.variantId = part.variantId;
    const saved = Array.isArray(config?.items) ? config.items.find((item) => item?.id === part.id && item.config?.productId === child.id) : null;
    const selected = normalizeConfig(child, saved?.config || included);
    const allowed = part.variantIds || variantsFor(child).map((variant) => variant.id);
    if (!allowed.includes(selected.variantId)) selected.variantId = included.variantId;
    return { ...part, product: child, config: selected, included };
  });
}

// שומר תוספת שאזלה בהרכב קיים כדי להציג את הבעיה, במקום להסיר אותה בשקט.
export function configurationIssues(product, config) {
  const issues = [];
  if (product.bundle) {
    for (const part of bundleParts(product, config)) {
      if (!part.product || !isAvailable(part.product) || (!part.product.active && !demoFlags().multiple)) issues.push({ name: `${part.name}: המוצר אינו זמין`, kind: 'bundle' });
      else for (const issue of configurationIssues(part.product, part.config)) issues.push({ ...issue, name: `${part.name}: ${issue.name}`, kind: 'bundle' });
    }
  }
  const variant = selectedVariant(product, config);
  if (!isAvailable(variant)) issues.push({ name: variant.name || product.name, kind: 'variant' });
  for (const group of product.optionGroups || []) {
    const value = config.options?.[group.id];
    for (const choice of group.choices) {
      if ((group.type === 'single' ? choice.id === value : value?.[choice.id]) && !isAvailable(choice)) issues.push({ name: choice.name, groupId: group.id, choiceId: choice.id, kind: 'choice' });
    }
  }
  return issues;
}

export function availableConfig(product, config) {
  const next = normalizeConfig(product, config);
  if (product.bundle) next.items = bundleParts(product, next).filter((part) => part.product).map((part) => {
    const selected = availableConfig(part.product, part.config);
    const allowed = part.variantIds || variantsFor(part.product).map((variant) => variant.id);
    if (!allowed.includes(selected.variantId)) selected.variantId = allowed.find((id) => isAvailable(variantsFor(part.product).find((variant) => variant.id === id))) || part.included.variantId;
    return { id: part.id, config: selected };
  });
  if (!isAvailable(selectedVariant(product, next))) next.variantId = (variantsFor(product).find(isAvailable) || variantsFor(product)[0]).id;
  for (const group of product.optionGroups || []) {
    if (group.type === 'single') {
      if (!isAvailable(group.choices.find((choice) => choice.id === next.options[group.id]))) next.options[group.id] = (group.choices.find(isAvailable) || group.choices[0])?.id;
    } else for (const choice of group.choices) if (!isAvailable(choice)) delete next.options[group.id][choice.id];
  }
  return next;
}

// שחזור ההרכב בלבד. כתובת, טלפון, מחיר היסטורי ואישור תשלום אינם מקור להזמנה חדשה.
export function prepareRepeatOrder(order, products) {
  const lines = [];
  const notices = [];
  for (const saved of Array.isArray(order?.lines) ? order.lines.slice(0, 50) : []) {
    const product = products.find((item) => item.id === saved.config?.productId);
    const title = String(saved.label || saved.title || 'פריט מההזמנה הקודמת').slice(0, 100);
    if (!product || !isAvailable(product)) { notices.push(`${title}: המוצר אינו זמין בתפריט הנוכחי.`); continue; }
    const normalized = normalizeConfig(product, saved.config);
    const issues = configurationIssues(product, normalized);
    const config = availableConfig(product, normalized);
    if (configurationIssues(product, config).length) { notices.push(`${title}: אין כרגע אפשרויות זמינות להרכבה.`); continue; }
    for (const issue of issues) notices.push(`${title}: ${issue.name} אינו זמין היום; ההרכב עודכן.`);
    if (JSON.stringify(compositionOnly(saved.config)) !== JSON.stringify(compositionOnly(normalized))) notices.push(`${title}: אפשרויות שהוסרו מהתפריט הותאמו להרכב הנוכחי.`);
    const qty = Math.max(1, Math.min(99, Math.floor(Number(saved.qty) || 1)));
    lines.push({ config, qty, title: describe(product, config).title, total: unitPrice(product, config) * qty });
  }
  return { lines, notices, total: lines.reduce((sum, line) => sum + line.total, 0) };
}

export function configurationChanges(product, before, after, beforeQty = 1, afterQty = 1) {
  const changes = [];
  if (product.bundle) {
    const previous = bundleParts(product, before);
    for (const part of bundleParts(product, after)) {
      const old = previous.find((item) => item.id === part.id);
      if (part.product && old?.config) changes.push(...configurationChanges(part.product, old.config, part.config).changes.map((change) => `${part.name}: ${change}`));
    }
  }
  if (before.variantId !== after.variantId) changes.push(`גודל: מ${selectedVariant(product, before).name || 'הגודל הקודם'} ל${selectedVariant(product, after).name || 'הגודל החדש'}`);
  for (const group of product.optionGroups || []) {
    if (group.type === 'single') {
      if (before.options[group.id] !== after.options[group.id]) changes.push(`בחירה: ${group.choices.find((choice) => choice.id === after.options[group.id])?.name || group.name}`);
    } else for (const choice of group.choices) {
      const previous = before.options[group.id]?.[choice.id];
      const next = after.options[group.id]?.[choice.id];
      if (previous === next) continue;
      if (!next) changes.push(`הוסר: ${choice.name}`);
      else changes.push(`${previous ? 'מיקום עודכן' : 'נוסף'}: ${choice.name}${group.placement ? ` · ${PLACEMENTS[next].label}` : ''}`);
    }
  }
  if (beforeQty !== afterQty) changes.push(`כמות: מ־${beforeQty} ל־${afterQty}`);
  if (before.label !== after.label) changes.push(after.label ? `שם הפריט: ${after.label}` : 'שם הפריט הוסר');
  if (before.note !== after.note) changes.push(after.note ? 'ההוראות למטבח עודכנו' : 'ההוראות למטבח הוסרו');
  const previousTotal = unitPrice(product, before) * beforeQty;
  const total = unitPrice(product, after) * afterQty;
  return { changes, previousTotal, total, delta: total - previousTotal };
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
  const normalized = { productId: product.id, variantId, options, note: typeof config.note === 'string' ? config.note.slice(0, 200) : '', label: typeof config.label === 'string' ? config.label.replace(/\s+/g, ' ').trim().slice(0, 40) : '' };
  if (product.bundle) normalized.items = bundleParts(product, config).filter((part) => part.product).map((part) => ({ id: part.id, config: part.config }));
  return normalized;
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

// חלופה מחליפה את התוספת במקום המקורי; כיסוי בשני חצאים מתאחד לפיצה שלמה.
export function replaceExtra(product, config, groupId, from, to, fallbackPlacement = 'whole') {
  const next = normalizeConfig(product, config);
  const group = product.optionGroups?.find((item) => item.id === groupId);
  if (!group || group.type !== 'multi' || from === to || !group.choices.some((choice) => choice.id === from) || !isAvailable(group.choices.find((choice) => choice.id === to))) return next;
  const choices = next.options[groupId];
  const placement = choices[from] || (group.placement && PLACEMENTS[fallbackPlacement] ? fallbackPlacement : 'whole');
  const existing = choices[to];
  delete choices[from];
  choices[to] = existing && existing !== placement ? 'whole' : placement;
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
  if (product.bundle) {
    const rows = [{ name: `${product.name} · מחיר הקומבו`, amount: product.price }];
    for (const part of bundleParts(product, config)) {
      if (!part.product) continue;
      const delta = Math.max(0, unitPrice(part.product, part.config) - unitPrice(part.product, part.included));
      rows.push({ name: `${part.name} · ${describe(part.product, part.config).title}${delta ? ' · שדרוגים ותוספות' : ' · כלול'}`, amount: delta });
    }
    const unit = rows.reduce((sum, row) => sum + row.amount, 0);
    return { rows, unit, qty, total: unit * qty };
  }
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
  if (product.bundle) return { title: product.name, variant: selectedVariant(product, config), singles: [], extras: [], label: config.label || '', components: bundleParts(product, config).filter((part) => part.product).map((part) => ({ name: part.name, ...describe(part.product, part.config), note: part.config.note })) };
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

export function complementarySuggestion(lines, products, offers = shop.complementaryOffers || []) {
  const included = new Set();
  for (const line of lines) {
    const product = products.find((item) => item.id === line.config.productId);
    if (!product || configurationIssues(product, line.config).length) continue;
    included.add(product.id);
    for (const part of bundleParts(product, line.config)) if (part.product) included.add(part.product.id);
  }
  for (const rule of offers) {
    if (!rule.whenProductIds.some((id) => included.has(id)) || included.has(rule.productId)) continue;
    const product = products.find((item) => item.id === rule.productId && isAvailable(item));
    if (!product) continue;
    const config = defaultConfig(product);
    if (!configurationIssues(product, config).length) return { product, config, price: unitPrice(product, config) };
  }
  return null;
}

export function bundleSavings(product, config) {
  if (!product.bundle) return 0;
  const separate = bundleParts(product, config).reduce((sum, part) => sum + (part.product ? unitPrice(part.product, part.config) : 0), 0);
  return Math.max(0, separate - unitPrice(product, config));
}

export function compositionOnly(config) {
  const clean = { productId: config.productId, variantId: config.variantId, options: structuredClone(config.options), note: '', label: '' };
  if (Array.isArray(config.items)) clean.items = config.items.map((item) => ({ id: item.id, config: compositionOnly(item.config) }));
  return clean;
}

// כל הצעה היא שינוי יחיד מפורש, מחושב לפי אותו מחירון של הסל.
export function minimumSuggestions(lines, products, minimum) {
  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line, products.find((product) => product.id === line.config.productId) || findProduct(line.config.productId)), 0);
  if (subtotal >= minimum) return [];
  const candidates = [];
  const offer = (candidate) => {
    if (candidate.delta <= 0) return;
    candidates.push({ ...candidate, subtotal: subtotal + candidate.delta, shortBy: Math.max(0, minimum - subtotal - candidate.delta) });
  };
  for (const line of lines) {
    const product = products.find((item) => item.id === line.config.productId);
    if (!product || !isAvailable(product) || configurationIssues(product, line.config).length) continue;
    const current = selectedVariant(product, line.config);
    const label = line.config.label || product.name;
    for (const variant of variantsFor(product).filter((item) => isAvailable(item) && item.price > current.price)) {
      const config = { ...line.config, variantId: variant.id };
      offer({ key: `size:${line.id}:${variant.id}`, kind: 'size', lineId: line.id, config, qty: line.qty, title: `הגדלת ${label} ל${variant.name}${line.qty > 1 ? ` · ${line.qty} יח׳` : ''}`, delta: lineTotal({ config, qty: line.qty }, product) - lineTotal(line, product) });
    }
    if (line.qty < 99) offer({ key: `qty:${line.id}`, kind: 'quantity', lineId: line.id, config: line.config, qty: line.qty + 1, title: `עוד יחידה של ${label} · באותו הרכב`, delta: unitPrice(product, line.config) });
  }
  for (const product of products.filter(isAvailable)) {
    if (lines.some((line) => line.config.productId === product.id)) continue;
    const config = defaultConfig(product);
    if (configurationIssues(product, config).length) continue;
    offer({ key: `product:${product.id}`, kind: 'product', config, qty: 1, title: `צירוף ${product.name} · ההרכב הבסיסי`, delta: unitPrice(product, config) });
  }
  const complete = candidates.filter((item) => !item.shortBy).sort((a, b) => a.delta - b.delta);
  const partial = candidates.filter((item) => item.shortBy > 0).sort((a, b) => a.delta - b.delta);
  return [complete[0], partial[0] || complete[1], !complete.length ? partial[1] : null].filter(Boolean).slice(0, 2);
}
