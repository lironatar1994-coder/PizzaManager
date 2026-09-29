import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

// Replace only the opening surface of an inactive copy of the LIVE storefront.
// Menu, tenant catalog, order/payment adapters and shared runtime stay incumbent.
const [repository, source, output, revision] = process.argv.slice(2).map((value, index) => index < 3 ? resolve(value) : value);
if (!repository || !source || !output || !/^[0-9a-f]{40}$/.test(revision || '')) throw Error('Expected repository, source storefront, inactive output, and Git revision');
if (source === output) throw Error('Never compile into the active storefront');
const read = (root, path) => readFileSync(join(root, path), 'utf8');
const write = (path, content) => writeFileSync(join(output, path), content);
const tag = `opening1-${revision.slice(0, 12)}`;
const startMarker = '/* ---------- מסך פתיחה ---------- */';
const endMarker = '/* ---------- תפריט ---------- */';
const bounds = (text) => {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw Error('Opening surface boundaries changed');
  return { start, end };
};
const incumbent = read(source, 'src/app.js');
for (const contract of ["from '../../shared/runtime.js'", 'function productHref()', 'function menu()', 'submitOrder(', '#/status/']) {
  if (!incumbent.includes(contract)) throw Error(`Platform contract changed: ${contract}`);
}
const rootApp = read(repository, 'src/app.js');
const nextBounds = bounds(rootApp);
let opening = rootApp.slice(nextBounds.start, nextBounds.end);
opening = opening.replaceAll("'./assets/hero-pizzeria-", "'/assets/hero-pizzeria-");
opening = opening.replace('const status = openingStatus();', "const status = { open: isOpen(), label: `שעות פתיחה ${shop.hours.opensAt}–${shop.hours.closesAt}` };");
for (const field of ['heroImages.mobile', 'heroImages.desktop', 'shop.logo']) {
  opening = opening.replaceAll(`safe(${field})`, `safe(appUrl(${field}))`);
}
opening = opening.replace('href="./assets/brand/oven-mark-luxury.svg#oven-mark-luxury"', 'href="${safe(appUrl(\'/assets/brand/oven-mark-luxury.svg#oven-mark-luxury\'))}"');
if (opening.includes('openingStatus()') || !opening.includes('hero--luxury')) throw Error('Opening adaptation failed');
// Render the adapted surface before activation. Syntax-only module checks do
// not reliably catch quoting errors in nested template branches.
for (const state of [{ demoOnly: true, logo: '', products: true }, { demoOnly: false, logo: '/assets/brand/tenant.svg', products: true }, { demoOnly: true, logo: '', products: false }]) {
  const container = { innerHTML: '' };
  const context = {
    app: container,
    shop: { name: 'Opening adapter check', demoOnly: state.demoOnly, logo: state.logo, heroImages: { mobile: '/assets/tenant-mobile.jpg', desktop: '/assets/tenant-desktop.jpg', alt: '' }, hours: { opensAt: '12:00', closesAt: '23:00' }, deliveryZones: [{}] },
    document: { querySelector: () => ({ setAttribute() {} }) },
    activeProducts: () => state.products ? [{ id: 'fixture' }] : [],
    isOpen: () => true,
    getFavorites: () => [],
    cartCount: () => 0,
    cartButton: () => '',
    productHref: () => '#/menu',
    icon: () => '',
    safe: (value) => String(value ?? ''),
    appUrl: (path) => typeof path === 'string' && path.startsWith('/') ? `/PizzaManager${path}` : path,
    phoneHref: () => 'tel:000',
    wazeHref: () => 'https://waze.com/',
  };
  runInNewContext(opening + '\nhome();', context, { timeout: 1000 });
  if (!container.innerHTML.includes('class="hero hero--luxury"') || container.innerHTML.includes('${safe(appUrl(')) throw Error('Adapted opening did not render');
  for (const device of ['mobile', 'desktop']) {
    const expectedPhoto = state.demoOnly ? `/PizzaManager/assets/hero-pizzeria-${device}-v2.webp` : `/PizzaManager/assets/tenant-${device}.jpg`;
    if (!container.innerHTML.includes(expectedPhoto)) throw Error(`Opening ${device} photo URL did not resolve`);
  }
  if (!state.logo && !container.innerHTML.includes('href="/PizzaManager/assets/brand/oven-mark-luxury.svg#oven-mark-luxury"')) throw Error('Opening symbol URL did not resolve');
  if (state.logo && !container.innerHTML.includes('src="/PizzaManager/assets/brand/tenant.svg"')) throw Error('Tenant logo did not survive adaptation');
  if (!state.products && container.innerHTML.includes('data-mode=')) throw Error('Empty catalog exposed order actions');
}
const previousBounds = bounds(incumbent);
const app = incumbent.slice(0, previousBounds.start) + opening + incumbent.slice(previousBounds.end);
const stripOpening = (text) => { const { start, end } = bounds(text); return text.slice(0, start) + text.slice(end); };
if (stripOpening(app) !== stripOpening(incumbent)) throw Error('A change escaped the opening surface');
write('src/app.js', app);

const cssMarker = '/* PizzaManager luxury opening, generated from src/opening.css. */';
const incumbentCss = read(source, 'src/styles.css');
const existingMarker = incumbentCss.indexOf(cssMarker);
const baseCss = existingMarker < 0 ? incumbentCss : incumbentCss.slice(0, existingMarker);
const openingCss = read(repository, 'src/opening.css').replaceAll('../assets/', '../../assets/');
write('src/styles.css', baseCss.trimEnd() + '\n\n' + cssMarker + '\n' + openingCss);

let html = read(source, 'index.html');
const contract = read(repository, 'index.html').match(/<!--[\s\S]*?FINISH:[\s\S]*?-->/)?.[0];
if (!contract) throw Error('Opening direction contract is missing');
html = html.replace(/<!--[\s\S]*?FINISH:[\s\S]*?-->/, contract);
html = html.replace(/(\/storefront\/src\/(?:styles\.css|app\.js)\?v=)[^"']+/g, `$1${tag}`)
  .replaceAll('/assets/pizza-hero-mobile.jpg', '/assets/hero-pizzeria-mobile-v2.webp')
  .replaceAll('/assets/pizza-hero-desktop.jpg', '/assets/hero-pizzeria-desktop-v2.webp')
  .replaceAll('/assets/hero-luxury-mobile-v1.webp', '/assets/hero-pizzeria-mobile-v2.webp')
  .replaceAll('/assets/hero-luxury-desktop-v1.webp', '/assets/hero-pizzeria-desktop-v2.webp')
  .replaceAll('/assets/fonts/frank-ruhl-libre-600.woff', '/assets/fonts/heebo-900.woff');
if (!html.includes('heebo-900.woff')) html = html.replace('</head>', '  <link rel="preload" as="font" href="/assets/fonts/heebo-900.woff" type="font/woff" crossorigin />\n  </head>');
if (!html.includes(`app.js?v=${tag}`) || !html.includes(`styles.css?v=${tag}`)) throw Error('Platform entry paths changed');
write('index.html', html);

for (const file of readdirSync(join(output, 'src')).filter((name) => name.endsWith('.js'))) {
  const path = `src/${file}`;
  const content = read(output, path).replace(/(from\s*|import\s*)(['"])(\.\/[^'"]+\.js)(?:\?[^'"]*)?\2/g, (_match, prefix, quote, path) => `${prefix}${quote}${path}?v=${tag}${quote}`);
  write(path, content);
  const syntax = spawnSync(process.execPath, ['--check', join(output, path)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw Error(`Invalid platform module ${file}: ${syntax.stderr}`);
}
const hash = (path) => createHash('sha256').update(readFileSync(join(output, path))).digest('hex');
write('assets/opening-ui-version.json', JSON.stringify({ revision, surface: 'opening', managedCatalog: true, files: { 'src/app.js': hash('src/app.js'), 'src/styles.css': hash('src/styles.css') } }) + '\n');
console.log(`Compiled opening ${revision}; all code outside the opening surface preserved.`);
