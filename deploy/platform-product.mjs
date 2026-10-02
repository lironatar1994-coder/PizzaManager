import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { orderResumeApp, withoutOrderResume } from './order-resume.mjs';
import { toppingDepth, withoutToppingDepth } from './topping-depth.mjs';

// Presentation only: retain the current tenant, catalog, cart and payment code.
const [repository, source, output, revision] = process.argv.slice(2).map((value, index) => index < 3 ? resolve(value) : value);
if (!repository || !source || !output || !/^[0-9a-f]{40}$/.test(revision || '')) throw Error('Expected repository, incumbent storefront, inactive copy and Git revision');
if (source === output) throw Error('Compile into a separate inactive storefront');
const read = (root, path) => readFileSync(join(root, path), 'utf8');
const write = (path, value) => writeFileSync(join(output, path), value);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const hash = (root, path) => digest(readFileSync(join(root, path)));
const tag = `product1-${revision.slice(0, 12)}`;
const startMarker = '/* Floating mobile pizza preview. */';
const endMarker = '/* End floating mobile pizza preview. */';

function cssBlock(content) {
  const first = content.indexOf(startMarker);
  const last = content.indexOf(endMarker, first + startMarker.length);
  if (first < 0 || last < 0 || content.indexOf(startMarker, first + startMarker.length) !== -1 || content.indexOf(endMarker, last + endMarker.length) !== -1) throw Error('Expected exactly one complete floating preview stylesheet block');
  return { first, end: last + endMarker.length };
}
function withoutFloatingStyles(content) {
  const block = cssBlock(content);
  return content.slice(0, block.first) + content.slice(block.end);
}
const floatImport = /(import\s*\{\s*setupFloatingPreview\s*\}\s*from\s*['"]\.\/floating-preview\.js)(?:\?[^'"]*)?(['"]\s*;)/g;
const entryTags = /(\/storefront\/src\/(?:styles\.css|app\.js)\?v=)[^"']+/g;
const withoutImportTag = (content) => content.replace(floatImport, '$1$2');
const withoutEntryTags = (content) => content.replace(entryTags, '$1');
const quantityBody = `    const button = event.target.closest('[data-qty]');
    if (!button) return;
    quantity = Math.max(1, Math.min(99, quantity + (button.dataset.qty === 'plus' ? 1 : -1)));
    refresh();
    rememberSelection();
    status.textContent = \`כמות: \${quantity}\`;
    reactToChoice(art, false);
`;
const directQuantity = `  document.querySelector('[data-builder-quantity]').addEventListener('click', (event) => {
${quantityBody}  });

`;
const oldQuantityEnd = quantityBody + '  });\n\n  const toggleTools';
const detachedQuantityEnd = '  });\n\n  const toggleTools';
const quantityQueries = [
  ["form.querySelector('output')", "document.querySelector('[data-builder-quantity] output')"],
  ["form.querySelector('[data-qty=\"minus\"]')", "document.querySelector('[data-builder-quantity] [data-qty=\"minus\"]')"],
  ["form.querySelector('[data-qty=\"plus\"]')", "document.querySelector('[data-builder-quantity] [data-qty=\"plus\"]')"],
];
function mobileQuantity(source) {
  if (source.includes(directQuantity)) {
    for (const [before, after] of quantityQueries) if (source.includes(before) || !source.includes(after)) throw Error('Partial mobile quantity transport adapter');
    return source;
  }
  if (!source.includes(oldQuantityEnd)) throw Error('Incumbent quantity click boundary changed');
  let result = source.replace(oldQuantityEnd, detachedQuantityEnd);
  for (const [before, after] of quantityQueries) {
    if (result.split(before).length !== 2) throw Error(`Incumbent quantity selector changed: ${before}`);
    result = result.replace(before, after);
  }
  const change = "  form.addEventListener('change', (event) => {\n    const previous = config;";
  if (result.split(change).length !== 2) throw Error('Incumbent builder change boundary changed');
  return result.replace(change, directQuantity + change);
}
function withoutQuantityTransport(source) {
  if (!source.includes(directQuantity)) return source;
  let result = source.replace(directQuantity, '');
  if (!result.includes(detachedQuantityEnd)) throw Error('Quantity restoration boundary changed');
  result = result.replace(detachedQuantityEnd, oldQuantityEnd);
  for (const [before, after] of quantityQueries) result = result.replace(after, before);
  return result;
}
const withoutProductPresentation = (content) => withoutOrderResume(withoutImportTag(withoutQuantityTransport(content)));

const incumbentApp = read(source, 'src/app.js');
for (const contract of ["from '../../shared/runtime.js'", 'function productPage(', 'setupFloatingPreview(stage)', 'submitOrder(', 'finishPayment(', 'onCartChange((change)', '#/status/']) {
  if (!incumbentApp.includes(contract)) throw Error(`Platform product contract changed: ${contract}`);
}
const imports = [...incumbentApp.matchAll(floatImport)];
if (imports.length !== 1) throw Error('Expected one incumbent floating preview import');
// The platform's old quantity control delegated clicks and looked up the
// stepper through the form. Only its DOM ownership changes when it docks.
// Move the exact existing handler body to the control and scope its lookups
// there, retaining every line of quantity arithmetic, price and cart logic.
const app = orderResumeApp(mobileQuantity(incumbentApp).replace(floatImport, `$1?v=${tag}$2`), tag);
if (withoutProductPresentation(app) !== withoutProductPresentation(incumbentApp)) throw Error('Product release changed incumbent app logic');

const incumbentCss = read(source, 'src/styles.css');
const rootCss = read(repository, 'src/floating-preview.css').replace(/\r\n/g, '\n').replaceAll('../assets/', '../../assets/').trim();
const rootBlock = cssBlock(rootCss);
if (rootBlock.first !== 0 || rootBlock.end !== rootCss.length) throw Error('Product stylesheet must contain only its marked floating preview block');
const incumbentBlock = cssBlock(incumbentCss);
const withoutResumeStyles = content => content.replace(/\n\/\* Saved-order return notice\. \*\/[\s\S]*?\/\* End saved-order return notice\. \*\//g, '');
const resumeCss = read(repository, 'src/order-resume.css').replace(/\r\n/g, '\n').trim();
const css = withoutResumeStyles(incumbentCss.slice(0, incumbentBlock.first) + rootCss + incumbentCss.slice(incumbentBlock.end)) + '\n' + resumeCss;
if (withoutResumeStyles(withoutFloatingStyles(css)) !== withoutResumeStyles(withoutFloatingStyles(incumbentCss))) throw Error('Product release changed another stylesheet surface');

const module = read(repository, 'src/floating-preview.js').replace(/\r\n/g, '\n');
if (!module.includes('export function setupFloatingPreview(stage)') || /^\s*import\s/m.test(module)) throw Error('Floating preview module contract changed');
const incumbentHtml = read(source, 'index.html');
if ([...incumbentHtml.matchAll(entryTags)].length !== 2) throw Error('Expected only the two incumbent platform entry cache tags');
const html = incumbentHtml.replace(entryTags, `$1${tag}`);
if (withoutEntryTags(html) !== withoutEntryTags(incumbentHtml)) throw Error('Product release changed other entry markup');

write('src/app.js', app);
write('src/styles.css', css);
write('src/floating-preview.js', module);
write('src/order-resume.js', read(repository, 'src/order-resume.js').replace(/\r\n/g, '\n'));
write('index.html', html);

// Replace only the visual base filenames, keeping the incumbent renderer,
// deterministic topping scatter, variant geometry and half-selection logic.
const pizzaAssets = [['pizza-base-v2.webp', 'pizza-base-real-v3.webp'], ['pizza-base-thin-v2.webp', 'pizza-base-thin-real-v3.webp']];
const normalizePizzaAssets = (content) => withoutToppingDepth(pizzaAssets.reduce((text, [before, after]) => text.replaceAll(after, before), content));
const incumbentPizza = read(source, 'src/pizza.js');
const pizzaModule = toppingDepth(pizzaAssets.reduce((text, [before, after]) => text.replaceAll(before, after), incumbentPizza));
if (!pizzaModule.includes('pizza-base-real-v3.webp') || !pizzaModule.includes('pizza-base-thin-real-v3.webp') || normalizePizzaAssets(pizzaModule) !== normalizePizzaAssets(incumbentPizza)) throw Error('Pizza artwork adapter changed renderer logic');
write('src/pizza.js', pizzaModule);

const preservedModules = {};
for (const file of readdirSync(join(source, 'src')).filter((name) => name.endsWith('.js'))) {
  const path = `src/${file}`;
  if (file !== 'app.js' && file !== 'floating-preview.js' && file !== 'pizza.js' && file !== 'order-resume.js') {
    if (hash(source, path) !== hash(output, path)) throw Error(`Incumbent module changed: ${file}`);
    preservedModules[path] = hash(source, path);
  }
  const syntax = spawnSync(process.execPath, ['--check', join(output, path)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw Error(`Invalid storefront module ${file}: ${syntax.stderr}`);
}
// Also guard unmodified assets and nested source files in the prepared copy.
function unchangedTree(directory) {
  for (const name of readdirSync(join(source, directory))) {
    const path = join(directory, name);
    if (statSync(join(source, path)).isDirectory()) unchangedTree(path);
    else if (!['src/app.js', 'src/styles.css', 'src/floating-preview.js', 'src/pizza.js', 'src/order-resume.js', 'assets/product-ui-version.json'].includes(path.replaceAll('\\', '/')) && hash(source, path) !== hash(output, path)) throw Error(`Incumbent file changed: ${path}`);
  }
}
unchangedTree('src');
unchangedTree('assets');
const files = Object.fromEntries(['src/app.js', 'src/styles.css', 'src/floating-preview.js', 'src/order-resume.js', 'src/pizza.js', 'index.html'].map((path) => [path, hash(output, path)]));
write('assets/product-ui-version.json', JSON.stringify({ revision, surface: 'product-customizer', managedCatalog: true, files, preserved: { appLogic: digest(withoutProductPresentation(app)), pizzaRenderer: digest(normalizePizzaAssets(pizzaModule)), otherStyles: digest(withoutResumeStyles(withoutFloatingStyles(css))), entryMarkup: digest(withoutEntryTags(html)), modules: preservedModules } }) + '\n');
console.log(`Compiled product UI ${revision}; app logic, other style surfaces, incumbent modules and assets preserved.`);
