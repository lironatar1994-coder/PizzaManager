import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { compactCustomerCopy, compactCustomerStyles } from './storefront-copy.mjs';
import { floatingPreviewApp, floatingPreviewStyles } from './floating-preview.mjs';
import { streamlinedBuilderApp } from './builder-controls.mjs';
import { customerFlowApp, customerFlowStyles } from './customer-flow.mjs';

// Apply the menu surface and concise customer copy. Its API, tenant storage,
// pricing, checkout and payment adapters remain the source of truth.
const [repository, source, output, revision] = process.argv.slice(2).map((value, index) => index < 3 ? resolve(value) : value);
if (!repository || !source || !output || !/^[0-9a-f]{40}$/.test(revision || '')) throw Error('Expected repository, source storefront, output storefront and Git revision');
if (source === output) throw Error('Compile to a separate, inactive storefront');
const read = (root, path) => readFileSync(join(root, path), 'utf8');
const write = (path, content) => writeFileSync(join(output, path), content);
const tag = `menu4-${revision.slice(0, 12)}`;
const rootApp = read(repository, 'src/app.js');
let app = read(source, 'src/app.js');
for (const contract of ["from '../../shared/runtime.js'", 'function productHref()', 'function menu()', 'onCartChange((change)', 'submitOrder(', '#/status/']) {
  if (!app.includes(contract)) throw Error(`Platform adapter contract changed: ${contract}`);
}
const openingStart = '/* ---------- מסך פתיחה ---------- */';
const openingEnd = '/* ---------- תפריט ---------- */';
const rootOpeningStart = rootApp.indexOf(openingStart);
const rootOpeningEnd = rootApp.indexOf(openingEnd, rootOpeningStart);
const currentOpeningStart = app.indexOf(openingStart);
const currentOpeningEnd = app.indexOf(openingEnd, currentOpeningStart);
if ([rootOpeningStart, rootOpeningEnd, currentOpeningStart, currentOpeningEnd].some(index => index < 0)) throw Error('Opening adapter boundary changed');
let opening = rootApp.slice(rootOpeningStart, rootOpeningEnd)
  .replaceAll("'./assets/hero-pizzeria-", "'/assets/hero-pizzeria-")
  .replace('const status = openingStatus();', 'const status = { open: isOpen() };');
for (const field of ['heroImages.mobile', 'heroImages.desktop', 'shop.logo']) opening = opening.replaceAll(`safe(${field})`, `safe(appUrl(${field}))`);
opening = opening.replace('href="./assets/brand/oven-mark-luxury.svg#oven-mark-luxury"', 'href="${safe(appUrl(\'/assets/brand/oven-mark-luxury.svg#oven-mark-luxury\'))}"');
app = app.slice(0, currentOpeningStart) + opening + app.slice(currentOpeningEnd);
const menuStart = rootApp.indexOf('function menu() {');
const menuEnd = rootApp.indexOf('/* ---------- קומבואים:', menuStart);
if (menuStart < 0 || menuEnd < 0) throw Error('Menu source markers changed');
let menu = rootApp.slice(menuStart, menuEnd).trim();
menu = menu.replace(
  'const price = product.bundle ? unitPrice(product, config) : Math.min(...variantsFor(product).filter(isAvailable).map((variant) => variant.price));',
  'const variants = variantsFor(product).filter((variant) => variant.available !== false);\n    const prices = variants.length ? variants : variantsFor(product);\n    const price = Math.min(...prices.map((variant) => variant.price));',
).replace('const saving = bundleSavings(product, config);', 'const saving = 0; // The platform has no bundle discount adapter; never invent a saving.').replace(
  "const fromPrice = !product.bundle && variantsFor(product).filter(isAvailable).some((variant) => variant.price > price);",
  'const fromPrice = prices.some((variant) => variant.price > price);',
).replace('const featured = Boolean(product.menuFeatured && product.menuImage);', `const demoPhoto = shop.demoOnly ? (product.visual === 'pizza' ? lead ? '/assets/menu-pizza-editorial-v2.webp' : '/assets/menu-pizza-v1.webp' : product.id === 'garlic-bread' ? '/assets/menu-garlic-v1.webp' : '') : '';
    const photo = product.image || product.menuImage || demoPhoto;
    const photoAlt = product.image ? product.imageAlt || product.name : product.menuImage ? product.menuImageAlt || product.name : 'צילום שנוצר בבינה מלאכותית להמחשה בלבד';
    const featured = Boolean(product.menuFeatured && photo);`).replace(
  'const art = product.menuImage ? `<img src="${safe(product.menuImage)}" alt="${safe(product.menuImageAlt || product.imageAlt || product.name)}" width="960" height="640" decoding="async" />` : productArt(product, { ...config, variantId: variantsFor(product).at(-1).id });',
  'const art = photo ? `<img src="${safe(appUrl(photo.replace(/^\\.\\//, \'/\')))}" alt="${safe(photoAlt)}" width="960" height="640" decoding="async" />` : productArt(product, { ...config, variantId: variantsFor(product).at(-1).id });',
).replace("${product.menuImage ? ' menu-item__art--photo' : ''}", "${photo ? ' menu-item__art--photo' : ''}").replace("'מחירי הדגמה · '", "'נתוני ותמונות הדגמה · '");
if (menu.includes('bundleSavings(') || menu.includes('filter(isAvailable)') || menu.includes('safe(product.menuImage)')) throw Error('Platform menu adaptation failed');
const oldMenuStart = app.indexOf('function menu() {');
const oldMenuEnd = app.indexOf('/* ---------- מסך הרכבה', oldMenuStart);
if (oldMenuEnd < 0) throw Error('Platform menu boundary changed');
app = app.slice(0, oldMenuStart) + menu + '\n\n' + app.slice(oldMenuEnd);
if (!app.includes('function orderProgress(')) {
  const progressStart = rootApp.indexOf('function orderProgress(');
  const progressEnd = rootApp.indexOf('\nconst alternativeFor', progressStart);
  if (progressStart < 0 || progressEnd < 0) throw Error('Progress source markers changed');
  app = app.replace('function productHref() {', rootApp.slice(progressStart, progressEnd).trim() + '\n\nfunction productHref() {');
}
const cartAnchor = "document.querySelectorAll('[data-hero-cart]').forEach((node) => { node.hidden = count === 0; });";
if (!app.includes(cartAnchor)) throw Error('Platform cart update boundary changed');
app = app.replace(cartAnchor + '\n  refreshMenuCart();', cartAnchor);
app = app.replace(cartAnchor, cartAnchor + '\n  refreshMenuCart();');
write('src/app.js', customerFlowApp(streamlinedBuilderApp(floatingPreviewApp(compactCustomerCopy(app, { platform: true }))), { platform: true }));
write('src/floating-preview.js', read(repository, 'src/floating-preview.js'));
write('src/customer-flow.js', read(repository, 'src/customer-flow.js'));
write('src/hero-motion.js', read(repository, 'src/hero-motion.js'));
write('src/startup.js', read(repository, 'src/startup.js'));
const incumbentData = read(source, 'src/data.js');
if (!incumbentData.includes('/api/public/shops/') || !incumbentData.includes('export const shop')) throw Error('Platform catalog adapter changed');
write('src/data.js', read(repository, 'deploy/storefront-data.js'));

// These menu selectors are single-line declarations in the incumbent stylesheet.
// Keep every other rule, including the backend order status screen.
let css = read(source, 'src/styles.css').split('\n').filter((line) => !/^\s*\.(menu|order-progress)/.test(line)).map((line) => line.replace(', .menu-favorites {', ' {')).join('\n');
const openingMarker = '/* PizzaManager luxury opening, generated from src/opening.css. */';
const openingCssStart = css.indexOf(openingMarker);
const markedOpeningEnd = css.indexOf('/* End PizzaManager opening. */', openingCssStart);
const openingCssEnd = markedOpeningEnd >= 0 ? markedOpeningEnd + '/* End PizzaManager opening. */'.length : css.indexOf('/* Menu photography:', openingCssStart);
if (openingCssStart < 0 || openingCssEnd < 0) throw Error('Opening stylesheet boundary changed');
css = css.slice(0, openingCssStart) + openingMarker + '\n' + read(repository, 'src/opening.css').replaceAll('../assets/', '../../assets/') + '\n' + css.slice(openingCssEnd);
const scoped = [];
let media = '';
for (const line of read(repository, 'src/styles.css').split('/* Customer flow: quiet, compact surfaces. */')[0].split('\n')) {
  if (/^@media .*\{\s*$/.test(line)) media = line.trim();
  else if (line.trim() === '}') media = '';
  else if (/^\s*\.(menu|order-progress)/.test(line)) scoped.push(media ? `${media}\n${line}\n}` : line);
}
if (scoped.length < 50) throw Error('Menu stylesheet extraction is incomplete');
css += '\n\n/* Menu photography: generated from the PizzaManager menu surface. */\n' + scoped.join('\n') + '\n';
css += '.menu-page { --tomato: #c93124; --tomato-hover: #ab291f; }\n';
css = css.replace(/\/\* Hero heat motion: the photograph remains[\s\S]*?\/\* End hero heat motion\. \*\//g, '');
css += '\n' + read(repository, 'src/hero-motion.css');
write('src/styles.css', customerFlowStyles(floatingPreviewStyles(compactCustomerStyles(css), read(repository, 'src/floating-preview.css')), read(repository, 'src/customer-flow.css')));
let html = read(source, 'index.html').replace(/(\/storefront\/src\/(?:styles\.css|app\.js)\?v=)[^"']+/g, `$1${tag}`);
html = html.replaceAll('hero-pizzeria-mobile-v2.webp', 'hero-pizzeria-mobile-v3.webp').replaceAll('hero-pizzeria-desktop-v2.webp', 'hero-pizzeria-desktop-v3.webp');
html = html.replace(/^.*<script type="module" src="\/storefront\/src\/hero-motion\.js[^>]*><\/script>.*\r?\n/gm, '');
html = html.replace('  </head>', `    <script type="module" src="/storefront/src/hero-motion.js?v=${tag}"></script>\n  </head>`);
html = html.replace(/^.*<script src="\/storefront\/src\/startup\.js[^>]*><\/script>.*\r?\n/gm, '');
const startupMarkup = read(repository, 'index.html').match(/    <div id="app">.*<\/div>/)?.[0];
if (!startupMarkup || !/<div id="app">[\s\S]*?<\/div>/.test(html)) throw Error('Startup placeholder boundary changed');
html = html.replace(/    <div id="app">[\s\S]*?<\/div>/, startupMarkup + `\n    <script src="/storefront/src/startup.js?v=${tag}"></script>`);
if (!html.includes(`app.js?v=${tag}`) || !html.includes(`styles.css?v=${tag}`)) throw Error('Platform entry asset paths changed');
write('index.html', html);

// A single URL per module preserves the platform's shared tenant state while
// avoiding stale imports from a previous frontend release.
for (const file of readdirSync(join(output, 'src')).filter((name) => name.endsWith('.js'))) {
  const path = `src/${file}`;
  const content = read(output, path).replace(/(from\s*|import\s*)(['"])(\.\/[^'"]+\.js)(?:\?[^'"]*)?\2/g, (_match, prefix, quote, path) => `${prefix}${quote}${path}?v=${tag}${quote}`);
  write(path, content);
  const syntax = spawnSync(process.execPath, ['--check', join(output, path)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw Error(`Invalid platform module ${file}: ${syntax.stderr}`);
}
const hash = (path) => createHash('sha256').update(readFileSync(join(output, path))).digest('hex');
write('assets/menu-ui-version.json', JSON.stringify({ revision, surface: 'customer-ui', managedCatalog: true, files: { 'src/app.js': hash('src/app.js'), 'src/styles.css': hash('src/styles.css'), 'src/floating-preview.js': hash('src/floating-preview.js'), 'src/customer-flow.js': hash('src/customer-flow.js') } }) + '\n');
console.log(`Compiled platform customer UI ${revision}; preserved live catalog and checkout adapters.`);
