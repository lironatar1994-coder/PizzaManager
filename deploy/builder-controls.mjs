// Refine only the builder UI. Keep each storefront's pricing, cart and API code.
export function streamlinedBuilderApp(source) {
  let app = source;
  const variantStart = app.indexOf('function variantSection(');
  const groupStart = app.indexOf('function singleGroup(', variantStart);
  const multiStart = app.indexOf('function multiGroup(', groupStart);
  const multiEnd = app.indexOf('\nconst placementLabel', multiStart);
  if ([variantStart, groupStart, multiStart, multiEnd].some((index) => index < 0)) throw Error('Builder choice boundaries changed');

  let variants = app.slice(variantStart, groupStart);
  variants = variants.replace(/\s*\$\{product\.visual === 'pizza' \? `<span class="size-disc"[^\n]+\n/, '\n');
  let single = app.slice(groupStart, multiStart);
  single = single.replace(/\s*\$\{choice\.crust \? `<svg class="crust-icon"[^\n]+\n/, '\n');
  if (!single.includes('field-group--crust')) single = single.replace('class="field-group"', 'class="field-group${group.visualRole === \'crust\' ? \' field-group--crust\' : \'\'}"');
  if (!single.includes('tile-row--crust')) single = single.replace('class="tile-row tile-row--', 'class="tile-row${group.visualRole === \'crust\' ? \' tile-row--crust\' : \'\'} tile-row--');
  let multi = app.slice(multiStart, multiEnd);
  multi = multi.replace('class="topping${', 'class="topping topping--compact${').replace('class="topping"', 'class="topping topping--compact"');
  multi = multi.replace('${placementLabel(placement || \'whole\')}', '${placement ? placementShortLabel(placement) : \'מיקום\'}');
  // Half prices are available before choosing a placement, from the live tariff.
  multi = multi.replace('aria-label="${info.label}"', 'aria-label="${info.label}, ${choice.price ? money(choicePrice(choice, key)) : \'כלול\'}"');
  multi = multi.replace("? 'ימין' : 'שמאל'}</span>", "? 'ימין' : 'שמאל'}<small><bdi>${choice.price ? `+${money(choicePrice(choice, key))}` : 'כלול'}</bdi></small></span>");
  app = app.slice(0, variantStart) + variants + single + multi + app.slice(multiEnd);
  if (!app.includes('const placementShortLabel')) app = app.replace('\nconst placementLabel', "\nconst placementShortLabel = (part) => part === 'right' ? 'ימין' : part === 'left' ? 'שמאל' : 'שלמה';\n\nconst placementLabel");
  app = app.replace("part === 'right' ? 'חצי ימין' : part === 'left' ? 'חצי שמאל' : 'שלמה'", "part === 'right' ? 'ימין' : part === 'left' ? 'שמאל' : 'שלמה'");
  app = app.replace("toggle.querySelector('[data-placement-label]').textContent = placementLabel(placement);", "toggle.querySelector('[data-placement-label]').textContent = config.options[group.id]?.[choice.id] ? placementShortLabel(placement) : 'מיקום';");
  // Choosing a half also adds the topping; no extra whole-pizza selection first.
  const change = /form\.addEventListener\('change', \(event\) => \{\r?\n    const previous = config;\r?\n/;
  const selectHalf = "    if (event.target.name?.startsWith('place-')) event.target.closest('.topping').querySelector('input[type=\"checkbox\"]').checked = true;\n";
  if (!app.includes(selectHalf.trim())) {
    if (!change.test(app)) throw Error('Builder half selection boundary changed');
    app = app.replace(change, (match) => match + selectHalf);
  }

  // Retain the one existing quantity control and its listeners, before notes.
  const quantityRoot = '<div class="buybar__quantity" data-builder-quantity><span>כמות</span>${stepper({ value: quantity, label: \'כמות\' })}</div>';
  const quantityPlatform = '<div class="field-group field-group--inline"><span class="field-group__title" id="qty-title">כמות</span>${stepper({ value: quantity, label: \'כמות\' })}</div>';
  const quantity = app.includes(quantityRoot) ? quantityRoot : app.includes(quantityPlatform) ? quantityPlatform : null;
  if (quantity) {
    app = app.replace(quantity, '');
    app = app.replace('<details class="builder-personal"', '<div class="field-group field-group--inline builder-quantity" data-builder-quantity><span class="field-group__title" id="qty-title">כמות</span>${stepper({ value: quantity, label: \'כמות\' })}</div>\n        <details class="builder-personal"');
  } else if (!app.includes('builder-quantity')) throw Error('Builder quantity boundary changed');

  if (!app.includes('buybar__cta-copy')) {
    const price = '<button type="button" class="buybar__total buybar__price" data-price-toggle aria-expanded="false" aria-controls="price-panel"><span>פירוט מחיר ${icon(\'down\')}</span><strong id="bar-total"></strong></button>';
    const add = '<span id="add-label"></span>${icon(\'forward\')}';
    if (!app.includes(price) || !app.includes(add)) throw Error('Builder price/action boundary changed');
    app = app.replace(price, '<button type="button" class="buybar__price" data-price-toggle aria-label="פירוט המחיר" title="פירוט המחיר" aria-expanded="false" aria-controls="price-panel">${icon(\'receipt\')}</button>');
    app = app.replace(add, '<span class="buybar__cta-copy"><span id="add-label"></span><span aria-hidden="true">·</span><bdi id="bar-total"></bdi></span>${icon(\'forward\')}');
  }
  // Keep the white button text readable during its short price-change cue.
  const reactionStart = app.indexOf('function reactToChoice(');
  const reactionEnd = app.indexOf('\nfunction ', reactionStart + 1);
  if (reactionStart >= 0 && reactionEnd > reactionStart) {
    let reaction = app.slice(reactionStart, reactionEnd);
    reaction = reaction.replace(/  const accent = [^\n]+\n/, '').replace('color: accent, ', '').replace('color: getComputedStyle(element).color, ', '');
    app = app.slice(0, reactionStart) + reaction + app.slice(reactionEnd);
  }
  return app.replace(/\n[ \t]+(?=\n      <button type="button" id="add-to-cart")/, '');
}
