// Refine only the builder UI. Keep each storefront's pricing, cart and API code.
export function streamlinedBuilderApp(source) {
  let app = source;
  const cartArt = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h3l2.5 12h11L21 6H6M9 20h.01M18 20h.01" stroke-linecap="round" stroke-linejoin="round" /></svg>';
  app = app.replace("${icon('box')}<span class=\"cart-button__count\"", cartArt + '<span class="cart-button__count"');
  app = app.replace("<bdi id=\"bar-total\"></bdi></span>${icon('forward')}", '<bdi id="bar-total"></bdi></span>' + cartArt);
  if (!app.includes("function orderProgress() { return ''; }")) {
    const progress = /function orderProgress\([^]*?\n}\r?\n/;
    if (!progress.test(app)) throw Error('Progress navigation boundary changed');
    app = app.replace(progress, "function orderProgress() { return ''; }\n");
  }
  const variantStart = app.indexOf('function variantSection(');
  const groupStart = app.indexOf('function singleGroup(', variantStart);
  const multiStart = app.indexOf('function multiGroup(', groupStart);
  const multiEnd = app.indexOf('\nconst placementLabel', multiStart);
  if ([variantStart, groupStart, multiStart, multiEnd].some((index) => index < 0)) throw Error('Builder choice boundaries changed');

  let variants = app.slice(variantStart, groupStart);
  variants = variants.replace('class="field-group__title">גודל</span>', 'class="field-group__title">${product.visual === \'pizza\' ? \'גודל הפיצה\' : \'גודל\'}</span>');
  variants = variants.replace(/\s*\$\{product\.visual === 'pizza' \? `<span class="size-disc"[^\n]+\n/, '\n');
  let single = app.slice(groupStart, multiStart);
  single = single.replace("group.visualRole === 'crust' ? 'בצק'", "group.visualRole === 'crust' ? 'סוג הבצק'");
  single = single.replace(/\s*\$\{choice\.crust \? `<svg class="crust-icon"[^\n]+\n/, '\n');
  if (!single.includes('field-group--crust')) single = single.replace('class="field-group"', 'class="field-group${group.visualRole === \'crust\' ? \' field-group--crust\' : \'\'}"');
  if (!single.includes('tile-row--crust')) single = single.replace('class="tile-row tile-row--', 'class="tile-row${group.visualRole === \'crust\' ? \' tile-row--crust\' : \'\'} tile-row--');
  let multi = app.slice(multiStart, multiEnd);
  multi = multi.replace('>ניקוי ${safe(group.name)}</button>', ">${icon('trash')}ניקוי</button>");
  multi = multi.replace('Object.entries(PLACEMENTS).map', "['whole', 'right', 'left'].map((key) => [key, PLACEMENTS[key]]).map");
  multi = multi.replace("key === 'right' ? 'ימין' : 'שמאל'", "key === 'right' ? 'חצי ימין' : 'חצי שמאל'");
  multi = multi.replace('<span class="topping__check">${icon(\'check\')}</span>', '<span class="topping__check">${icon(\'plus\')}${icon(\'check\')}</span>');
  multi = multi.replace('class="topping${', 'class="topping topping--compact${').replace('class="topping"', 'class="topping topping--compact"');
  multi = multi.replace('${placementLabel(placement || \'whole\')}', '${placement ? placementShortLabel(placement) : \'מיקום\'}');
  // Half prices are available before choosing a placement, from the live tariff.
  multi = multi.replace('aria-label="${info.label}"', 'aria-label="${info.label}, ${choice.price ? money(choicePrice(choice, key)) : \'כלול\'}"');
  multi = multi.replace("? 'ימין' : 'שמאל'}</span>", "? 'ימין' : 'שמאל'}<small><bdi>${choice.price ? `+${money(choicePrice(choice, key))}` : 'כלול'}</bdi></small></span>");
  app = app.slice(0, variantStart) + variants + single + multi + app.slice(multiEnd);
  if (!app.includes('function builderSummaryMarkup(')) {
    app = app.replace('function variantSection(', `function builderSummaryMarkup(product, config, quantity) {
  const price = priceBreakdown(product, config, quantity);
  const base = price.rows[0];
  const extras = price.unit - base.amount;
  const count = (product.optionGroups || []).filter((group) => group.type === 'multi').reduce((sum, group) => sum + Object.keys(config.options[group.id] || {}).length, 0);
  return \`<dl><div><dt>\${safe(base.name)}</dt><dd><bdi>\${money(base.amount * quantity)}</bdi></dd></div><div><dt>תוספות\${count ? \` (\${count})\` : ''}</dt><dd><bdi>\${money(extras * quantity)}</bdi></dd></div><div class="builder-cost__total"><dt>סה״כ\${quantity > 1 ? \` · \${quantity} יח׳\` : ''}</dt><dd><bdi>\${money(price.total)}</bdi></dd></div></dl>\`;
}

function variantSection(`);
  }
  if (!app.includes('class="builder-cost"')) app = app.replace('<details class="builder-personal"', '<section class="builder-cost" data-builder-summary aria-label="סיכום מחיר"></section>\n        <details class="builder-personal"');
  const refreshPrice = "document.querySelector('[data-price-content]').innerHTML = priceMarkup(product, config, quantity);";
  if (!app.includes('innerHTML = builderSummaryMarkup(')) app = app.replace(refreshPrice, refreshPrice + "\n    form.querySelector('[data-builder-summary]').innerHTML = builderSummaryMarkup(product, config, quantity);");
  const closeSelected = "      closePlacement(target.closest('.topping'));";
  const revealSelected = "      form.querySelectorAll('.topping.is-editing').forEach(closePlacement);\n      const selectedTopping = target.closest('.topping');\n      const placementControl = selectedTopping.querySelector('[data-placement-toggle]');\n      if (target.checked && placementControl) {\n        selectedTopping.classList.add('is-editing');\n        placementControl.setAttribute('aria-expanded', 'true');\n      }";
  if (!app.includes('const selectedTopping =')) {
    if (!app.includes(closeSelected)) throw Error('Topping disclosure boundary changed');
    app = app.replace(closeSelected, revealSelected);
  }
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
