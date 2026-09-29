// Customer copy only. Never rewrite managed catalog data, validation or payment state.
export function compactCustomerCopy(source, { platform = false } = {}) {
  let app = source;
  const replacements = [
    ['<h1>${safe(product.name)}</h1><p>${safe(product.description)}</p>', '<h1>${safe(product.name)}</h1>'],
    ["    const hasExtras = product.optionGroups?.some((option) => option.type === 'multi');\n", ''],
    ["    const sizeDescription = variantsFor(product).length > 1 ? (hasExtras ? 'גודל ותוספות לבחירה' : 'גדלים לבחירה') : hasExtras ? 'תוספות לבחירה' : '';\n", ''],
    ["const description = product.menuDescription || (product.bundle ? product.description : lead ? sizeDescription : '');", "const description = product.menuDescription && !/^(גודל ותוספות לבחירה|גדלים לבחירה|תוספות לבחירה)$/.test(product.menuDescription) ? product.menuDescription : product.bundle ? product.description : '';"],
    ["const description = product.bundle ? product.menuDescription || product.description : '';", "const description = product.menuDescription && !/^(גודל ותוספות לבחירה|גדלים לבחירה|תוספות לבחירה)$/.test(product.menuDescription) ? product.menuDescription : product.bundle ? product.description : '';"],
    ["${isPizza ? `<span class=\"stage__live\"><span class=\"stage__live-dot\" aria-hidden=\"true\"></span>תצוגה חיה</span>` : ''}", ''],
    ['<span class="field-group__title">איזה גודל?</span>', '<span class="field-group__title">גודל</span>'],
    ['<span class="field-group__title">איך מקבלים את ההזמנה?</span>', '<span class="field-group__title">קבלת ההזמנה</span>'],
    ['<span class="field-group__title">לאן לשלוח?</span>', '<span class="field-group__title">כתובת למשלוח</span>'],
    ['<span class="field-group__title">איך נשיג אתכם?</span>', '<span class="field-group__title">פרטי קשר</span>'],
    ['<p class="bundle-intro">כל פריט ניתן להתאמה בנפרד. תוספות ושדרוגי גודל מתווספים למחיר הארוחה.</p>', ''],
    ['<span class="field-group__hint">${group.placement ? \'אפשר לבחור כמה, גם על חצי פיצה\' : \'אפשר לבחור כמה\'}</span>', ''],
    ["${group.placement ? '' : '<span class=\"field-group__hint\">אפשר לבחור כמה</span>'}", ''],
    ["${allFree ? '<span class=\"field-group__hint\">ללא תוספת תשלום</span>' : ''}", ''],
    ['<span class="field-group__title">למי זה?</span><span class="field-group__hint">שם לפריט, לא חובה</span>', '<span class="field-group__title">שם לפריט</span>'],
    ['<p class="field-group__hint">יופיע בסל ובפירוט למטבח.</p>', ''],
    ['<span class="field-group__title">משהו שחשוב שנדע?</span><span class="field-group__hint">הערה למטבח, לא חובה</span>', '<span class="field-group__title">הערה למטבח</span>'],
    ['<strong>שם והוראות למטבח</strong>', '<strong>שם והערה</strong>'],
    ['שם והוראות למטבח · לא חובה', 'שם והערה · לא חובה'],
    ['<p>שמור במכשיר הזה, בלי לפתוח חשבון.</p>', ''],
    ['רק ההרכב והכמות. הערות ופרטים אישיים אינם בקישור.', 'קישור להרכב בלבד, ללא פרטים אישיים.'],
    ['איך לקרוא להרכב הקבוע?', 'שם להרכב'],
    ['קישור להרכב שלכם', 'קישור להרכב'],
    ['עותק חדש לעריכה · המקור נשאר בסל', 'עותק חדש'],
    ['${safe(source.label)} · המחיר לפי התפריט הנוכחי', '${safe(source.label)}'],
    ["${groups.length ? '<p class=\"pizza-preview__hint\">נוגעים בחצי שרוצים לערוך</p>' : ''}", ''],
    ["<p class=\"sheet__hint\">${checkout.mode === 'pickup' ? 'איסוף עצמי נבחר. אפשר לשנות בקופה.' : 'משלוח נבחר. דמי המשלוח ייקבעו לפי הכתובת בקופה.'}</p>", "${checkout.mode === 'delivery' ? '<p class=\"sheet__hint\">משלוח יחושב בקופה</p>' : ''}"],
    ['<p>אפשר לשנות כאן את אופן הקבלה ולמלא פרטי קשר.</p>', ''],
    ['<span class="field-group__hint">האזור והמחיר נקבעים לפי הכתובת</span>', ''],
    ["'<p class=\"address-check__hint\">בחרו כתובת מלאה מהרשימה כדי לחשב משלוח.</p>'", "''"],
    ['<small>עד הדלת, לפי אזור</small>', ''],
    ['<small>מצב האיסוף יתעדכן בעמוד המעקב לאחר אישור הפיצרייה.</small>', ''],
    ['${safe(place.city)} · כתובת שנבחרה מהמפה', '${safe(place.city)}'],
    ['<p id="tracking-copy-output" role="status">שמרו את הקישור למעקב אחר ההזמנה.</p>', '<p id="tracking-copy-output" role="status"></p>'],
    ['<p><strong>הסל עדיין ריק</strong>כל פיצה שתרכיבו תחכה כאן.</p>', '<p><strong>הסל ריק</strong></p>'],
    ['<p><strong>אין עדיין מה להזמין</strong>מרכיבים פיצה, ואז חוזרים לכאן.</p>', '<p><strong>הסל ריק</strong></p>'],
    ['<p><strong>ההרכב הקבוע מתחיל כאן</strong>מרכיבים בדיוק כמו שאוהבים ולוחצים על „שמירה”.</p>', '<p><strong>אין הרכבים שמורים</strong></p>'],
    ["<p>${order ? 'ההרכב מההזמנה האחרונה, לפי התפריט והמחירים הנוכחיים.' : 'אין עדיין הרכב קודם שמור במכשיר הזה.'}</p>", "${order ? '' : '<p>אין הזמנה שמורה</p>'}"],
    ["<p class=\"repeat-page__hint\">${cartCount() ? 'הפריטים יתווספו לסל הנוכחי. ' : ''}אפשר לערוך כל פריט בסל לפני שממשיכים.</p>", "${cartCount() ? '<p class=\"repeat-page__hint\">יתווסף לסל הנוכחי</p>' : ''}"],
    ["'<p class=\"repeat-page__hint\">אפשר לבחור מהרכבים זמינים בתפריט.</p>'", "''"],
    ['<p><strong>אין הזמנה להצגה</strong>ההזמנה האחרונה מוצגת כאן רק בחלון שבו בוצעה.</p>', '<p><strong>אין הזמנה להצגה</strong></p>'],
    ["<p class=\"favorites-hint\">${favoriteStorageIsPersistent() ? 'ההרכבים שמורים במכשיר הזה. המחיר מתעדכן לפי התפריט הנוכחי.' : 'האחסון במכשיר חסום. ההרכבים זמינים רק כל עוד העמוד פתוח.'}</p>", "${favoriteStorageIsPersistent() ? '' : '<p class=\"favorites-hint\">האחסון חסום. השמירה זמינה עד סגירת העמוד.</p>'}"],
    ['דמי משלוח, אם נבחר, מחושבים בקופה.', 'משלוח יחושב בקופה.'],
    ["document.querySelector('#tracking-connection').textContent='העמוד מתעדכן אוטומטית.';", "document.querySelector('#tracking-connection').textContent='';"],
    ['זו הערכה שקבעה הפיצרייה בעת האישור, והיא עשויה להשתנות לפי העומס.', ''],
  ];
  for (const [before, after] of replacements) app = app.replaceAll(before, after);

  // Choice cards carry identity and price; measurements remain in managed data.
  const sizeStart = app.indexOf('function variantSection(');
  const sizeEnd = app.indexOf('function singleGroup(', sizeStart);
  if (sizeStart < 0 || sizeEnd < 0) throw Error('Size-choice copy boundary changed');
  let sizes = app.slice(sizeStart, sizeEnd);
  sizes = sizes.replace("${!isAvailable(variant) ? '<small>אזל להיום</small>' : variant.detail ? `<small>${safe(variant.detail)}</small>` : ''}", "${!isAvailable(variant) ? '<small>אזל להיום</small>' : ''}");
  sizes = sizes.replace("${variant.detail ? `<small>${safe(variant.detail)}</small>` : ''}", '');
  sizes = sizes.replace(/^.*<span class="tile__measure">.*<\/span>` : ''}/gm, '        ');
  if (sizes.includes('variant.detail') || sizes.includes('variant.diameterCm') || sizes.includes('variant.slices')) throw Error('Size-choice cleanup incomplete');
  app = app.slice(0, sizeStart) + sizes + app.slice(sizeEnd);

  const singleStart = app.indexOf('function singleGroup(');
  const singleEnd = app.indexOf('function multiGroup(', singleStart);
  if (singleStart >= 0 && singleEnd >= 0) {
    let choices = app.slice(singleStart, singleEnd).replace('${safe(group.name)}</span>', "${safe(group.visualRole === 'crust' ? 'בצק' : group.name)}</span>");
    choices = choices.replace('class="tile tile--option"', 'class="tile tile--option${choice.crust ? \' tile--crust\' : \'\'}"');
    if (!choices.includes('!choice.crust && choice.detail')) choices = choices.replace('choice.detail ? `<small>${safe(choice.detail)}</small>`', '!choice.crust && choice.detail ? `<small>${safe(choice.detail)}</small>`');
    app = app.slice(0, singleStart) + choices + app.slice(singleEnd);
  }

  app = app.replace('<div class="buybar"><p class="buybar__recovery"', '<div class="buybar buybar--builder"><p class="buybar__recovery"');

  // The preview shows actual choices, never a placeholder or the default crust.
  app = app.replace(/    const details = detailText\(info\);\r?\n    document\.querySelector\('#stage-detail'\)\.textContent = isPizza && !drawn\.toppings\.length\r?\n      \? `\$\{details \? `\$\{details\} · ` : ''\}תוספות שתבחרו יופיעו כאן`\r?\n      : details \|\| 'בלי תוספות';/, `    const details = isPizza ? info.extras.filter((extra) => !extra.divided).map((extra) => extra.text).join(' · ') : detailText(info);
    const stageDetail = document.querySelector('#stage-detail');
    stageDetail.textContent = details;
    stageDetail.hidden = !details;`);
  app = app.replace("document.querySelector('#stage-compact').textContent = [info.singles[0], toppingSummary].filter(Boolean).join(' · ');", "const compact = document.querySelector('#stage-compact');\n      compact.textContent = toppingCount ? toppingSummary : '';\n      compact.hidden = !toppingCount;");

  if (platform) {
    // Free crusts need no repeated 'included' caption. Paid choices keep their price.
    const start = app.indexOf('function singleGroup(');
    const end = app.indexOf('function multiGroup(', start);
    if (start < 0 || end < 0) throw Error('Single-choice copy boundary changed');
    const group = app.slice(start, end).replace("<bdi>${choice.price ? `+${money(choice.price)}` : 'כלול'}</bdi>", "${choice.price ? `<bdi>+${money(choice.price)}</bdi>` : ''}");
    app = app.slice(0, start) + group + app.slice(end);

    // Keep name and note available together, rather than occupying the main flow.
    if (!app.includes('class="builder-personal"')) {
      const first = app.indexOf('        <div class="field-group item-name-field">');
      const last = app.indexOf('        <details class="builder-tools-disclosure">', first);
      if (first < 0 || last < 0) throw Error('Optional-fields copy boundary changed');
      app = app.slice(0, first) + '        <details class="builder-personal" ${config.label || config.note ? \'open\' : \'\'}><summary><span><strong>שם והערה</strong><small>לא חובה</small></span>${icon(\'down\')}</summary><div class="builder-personal__fields">\n' + app.slice(first, last) + '        </div></details>\n' + app.slice(last);
    }

    app = app.replace(/<p class="address-search__hint" id="address-search-hint">חיפוש באמצעות ([\s\S]*?)<\/p>/, '<details class="address-search__info"><summary id="address-search-hint">${icon(\'info\')}<span>מידע על חיפוש הכתובת</span>${icon(\'down\')}</summary><div><p>הכתובת נשלחת לשירות <a href="https://photon.komoot.io/" target="_blank" rel="noopener">Photon</a>. נתוני המפה: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>. ${shop.demoOnly ? \'אזורי המשלוח להמחשה.\' : \'\'}</p></div></details>');

    // Basket totals belong in the breakdown, leaving one price beside the action.
    const basket = '<div class="buybar__basket" data-builder-basket hidden><button type="button" data-open-cart><span data-basket-current></span>${icon(\'down\')}</button><span data-basket-projected></span></div>';
    if (app.includes(basket)) {
      const priceRows = '<div data-price-content></div>';
      if (!app.includes(priceRows)) throw Error('Builder price breakdown boundary changed');
      app = app.replace(basket, '').replace(priceRows, priceRows + '<section class="price-basket" data-builder-basket hidden aria-label="סכומי הסל"><button type="button" data-open-cart><span data-basket-current></span>${icon(\'down\')}</button><p data-basket-projected></p></section>');
    }
  }
  if (app.includes('תוספות שתבחרו יופיעו כאן')) throw Error('Preview copy cleanup was not applied');
  return app.replace(/^[\t ]+$/gm, '');
}

export function compactCustomerStyles(css) {
  css = removeCompactChoices(css);
  const start = '/* Customer copy: compact optional information. */';
  const end = '/* End customer copy. */';
  const first = css.indexOf(start);
  if (first >= 0) {
    const last = css.indexOf(end, first);
    if (last < 0) throw Error('Customer-copy stylesheet boundary changed');
    css = css.slice(0, first) + css.slice(last + end.length);
  }
  return css.trimEnd() + `

${start}
.stage__detail[hidden], .stage__compact[hidden] { display: none; }
.stage__summary:has(#stage-detail[hidden]) { min-block-size: 40px; }
.builder__form { padding-block-start: 16px; }
.builder__intro { padding-block-end: 0; }
.builder__intro > h1 { font-size: clamp(2rem, 2.8vw, 2.5rem); font-weight: 700; line-height: 1.15; }
.builder__form > .field-group { padding-block: 24px 0; box-shadow: none; }
.builder__form > fieldset.field-group:first-of-type { padding-block-start: 16px; }
.builder__form > .field-group .field-group__head { margin-block-end: 12px; }
.builder-personal { margin-block-start: 24px; }
.builder-personal > summary { display: flex; align-items: center; gap: 16px; min-block-size: 52px; cursor: pointer; list-style: none; }
.builder-personal > summary::-webkit-details-marker { display: none; }
.builder-personal > summary > span { min-inline-size: 0; flex: 1; }
.builder-personal > summary strong { font-size: 1rem; font-weight: 700; }
.builder-personal > summary small { display: block; margin-block-start: 4px; font-size: var(--fs-small); color: var(--text-3); }
.builder-personal > summary .icon { inline-size: 18px; block-size: 18px; transition: transform .2s; }
.builder-personal[open] > summary .icon { transform: rotate(180deg); }
.builder-personal__fields { padding-block-start: 8px; }
.builder-personal__fields > .field-group { padding-block: 12px; box-shadow: none; }
.builder-tools__panel > .builder-tools__status:empty { display: none; }
.address-search__info { margin-block-start: 8px; font-size: var(--fs-small); color: var(--text-2); }
.address-search__info > summary { display: flex; align-items: center; gap: 8px; min-block-size: 44px; cursor: pointer; list-style: none; }
.address-search__info > summary::-webkit-details-marker { display: none; }
.address-search__info > summary .icon { inline-size: 16px; block-size: 16px; }
.address-search__info > summary .icon:last-child { margin-inline-start: auto; }
.address-search__info[open] > summary .icon:last-child { transform: rotate(180deg); }
.address-search__info > div { padding-block-start: 8px; }
.address-search__info a { color: var(--text); text-underline-offset: .2em; }
#tracking-copy-output:empty { display: none; }
.tracking-estimate > p:empty, .done__layout > section > p:empty { display: none; }
${end}
` + compactChoiceStyles;
}

const choiceStart = '/* Compact ordering choices. */';
const choiceEnd = '/* End compact ordering choices. */';
function removeCompactChoices(css) {
  const start = css.indexOf(choiceStart);
  if (start < 0) return css;
  const end = css.indexOf(choiceEnd, start);
  if (end < 0) throw Error('Compact-choice stylesheet boundary changed');
  return css.slice(0, start) + css.slice(end + choiceEnd.length);
}
export function appendCompactChoiceStyles(css) {
  return removeCompactChoices(css).trimEnd() + '\n\n' + compactChoiceStyles;
}
const compactChoiceStyles = `${choiceStart}
.tile--size .tile__surface { min-block-size: 112px; align-items: center; gap: 8px; padding: 12px; text-align: center; }
.tile--size .size-disc { inline-size: 32px; block-size: 32px; margin-block-end: 0; }
.tile--size .tile__surface > bdi { padding-block-start: 0; color: var(--text); }
.tile--crust .tile__surface { min-block-size: 76px; flex-direction: row; align-items: center; gap: 12px; padding: 12px 16px; }
.tile--crust .crust-icon { inline-size: 28px; block-size: 28px; margin: 0; flex: none; }
.tile--crust .tile__surface > bdi { margin-inline-start: auto; margin-block-start: 0; padding-block-start: 0; }
.price-basket { margin-block-start: 16px; padding-block: 8px 12px; border-block-start: 1px solid var(--line); font-size: var(--fs-small); }
.price-basket button { display: flex; align-items: center; gap: 8px; min-block-size: 44px; padding: 0; border: 0; background: transparent; color: var(--text-2); }
.price-basket button:hover { color: var(--text); }
.price-basket .icon { inline-size: 14px; block-size: 14px; }
.price-basket p { color: var(--text-2); }
.price-basket strong { color: var(--text); }
.buybar--builder { --tomato: #c93124; --tomato-hover: #ab291f; }
@media (min-width: 900px) {
  .builder, .buybar--builder { --builder-gap: clamp(24px, 4vw, 64px); }
  .builder { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); }
  .buybar--builder { padding: 0; border: 0; background: transparent; backdrop-filter: none; }
  .buybar--builder .buybar__inner, .buybar--builder .buybar__recovery { width: calc((min(100% - 64px, 1320px) - var(--builder-gap)) * 11 / 21); margin-inline-start: max(32px, calc((100% - 1320px) / 2)); margin-inline-end: auto; }
  .buybar--builder .buybar__inner { display: flex; padding: 12px 16px max(12px, env(safe-area-inset-bottom)); border-radius: 16px 16px 0 0; background: var(--glass); backdrop-filter: blur(12px); box-shadow: inset 0 1px 0 var(--line); }
  .buybar--builder .buybar__cta { grid-column: auto; min-inline-size: 0; flex: 1; }
  .buybar--builder .buybar__recovery:not([hidden]) { padding: 12px; background: var(--surface-2); }
  .stage__summary > #stage-title { display: none; }
  .stage__summary:has(#stage-detail[hidden]):has(.stage__composition:empty) { min-block-size: 0; padding-block-end: 0; }
}
${choiceEnd}
`;
