import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

// Compile only navigation into an inactive copy of the current managed storefront.
const [repository, source, output, revision] = process.argv.slice(2).map((value, index) => index < 3 ? resolve(value) : value);
if (!repository || !source || !output || !/^[0-9a-f]{40}$/.test(revision || '')) throw Error('Expected repository, source storefront, inactive output, and Git revision');
if (source === output) throw Error('Never compile into the active storefront');
const read = (root, path) => readFileSync(join(root, path), 'utf8');
const write = (path, content) => writeFileSync(join(output, path), content);
const tag = `transition1-${revision.slice(0, 12)}`;
const incumbent = read(source, 'src/app.js');
for (const contract of ["from '../../shared/runtime.js'", 'function productHref()', 'function menu()', 'submitOrder(', '#/status/']) {
  if (!incumbent.includes(contract)) throw Error(`Platform contract changed: ${contract}`);
}
const oldNavigate = /function navigate\(\) \{\s*if \(document\.startViewTransition && !reducedMotion\.matches\) document\.startViewTransition\(render\);\s*else render\(\);\s*\}/;
const installedNavigate = /function navigate\(\) \{\s*navigatePage\(render, \{ pizza: Boolean\(document\.querySelector\('\.hero'\)\) && \['menu', 'product'\]\.includes\(getRoute\(\)\.page\) \}\);\s*\}/;
const navigationImport = /^import \{ createNavigator \} from '\.\/navigation\.js(?:\?[^']*)?';\r?\n/m;
const navigationDeclaration = /^const navigatePage = createNavigator\(\{ reducedMotion, pizzaSrc: appUrl\('\/assets\/pizza-base-v2\.webp'\) \}\);\r?\n/m;
const navigatePattern = incumbent.includes('const navigatePage =') ? installedNavigate : oldNavigate;
if (!navigatePattern.test(incumbent)) throw Error('The incumbent navigation contract changed');
if (incumbent.includes('createNavigator') && (!navigationImport.test(incumbent) || !navigationDeclaration.test(incumbent))) throw Error('An unrecognized navigator is already installed');
const nextNavigate = `function navigate() {
  navigatePage(render, { pizza: Boolean(document.querySelector('.hero')) && ['menu', 'product'].includes(getRoute().page) });
}`;
const declaration = "const navigatePage = createNavigator({ reducedMotion, pizzaSrc: appUrl('/assets/pizza-base-v2.webp') });\n";
let app = incumbent.replace(navigationImport, '').replace(navigationDeclaration, '').replace(navigatePattern, nextNavigate);
const motionDeclaration = "const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');";
if (app.split(motionDeclaration).length !== 2) throw Error('The reduced-motion declaration changed');
const newline = incumbent.includes('\r\n') ? '\r\n' : '\n';
if (!app.includes(motionDeclaration + newline)) throw Error('The reduced-motion line boundary changed');
app = `import { createNavigator } from './navigation.js';${newline}` + app.replace(motionDeclaration + newline, motionDeclaration + newline + declaration.replace('\n', newline));
const stripIntegration = (text) => text.replace(navigationImport, '').replace(navigationDeclaration, '').replace(oldNavigate, '/* preserved navigate boundary */').replace(installedNavigate, '/* preserved navigate boundary */');
// Compare prior to cache-tag normalization, so the opening/menu/order source
// is verified byte-for-byte rather than inferred from a successful build.
if (stripIntegration(app) !== stripIntegration(incumbent)) throw Error('A change escaped navigation integration');
for (const hero of [false, true]) for (const page of ['home', 'menu', 'product', 'cart', 'checkout', 'status']) {
  let rendered = 0;
  let requested;
  let resolvedPhoto;
  const context = {
    reducedMotion: { matches: false },
    appUrl: (path) => `/PizzaManager${path}`,
    createNavigator: (options) => { resolvedPhoto = options.pizzaSrc; return (render, options) => { requested = options.pizza; render(); }; },
    document: { querySelector: () => hero ? {} : null },
    getRoute: () => ({ page }),
    render: () => { rendered++; },
  };
  runInNewContext(declaration + nextNavigate + '\nnavigate();', context, { timeout: 1000 });
  if (rendered !== 1 || requested !== (hero && ['menu', 'product'].includes(page)) || resolvedPhoto !== '/PizzaManager/assets/pizza-base-v2.webp') throw Error('Navigation adapter behavior failed');
}
write('src/app.js', app);
write('src/navigation.js', read(repository, 'src/navigation.js'));

const startMarker = '/* PizzaManager navigation, generated from src/navigation.css. */';
const endMarker = '/* End PizzaManager navigation. */';
const incumbentCss = read(source, 'src/styles.css');
const start = incumbentCss.indexOf(startMarker);
const end = incumbentCss.indexOf(endMarker, start);
if (start >= 0 && end < start) throw Error('Navigation stylesheet boundaries changed');
const navigationCss = `${startMarker}\n${read(repository, 'src/navigation.css')}\n${endMarker}\n\n`;
const endBoundary = (text, end) => {
  const boundary = end + endMarker.length;
  return boundary + (text.slice(boundary).startsWith('\n\n') ? 2 : text.slice(boundary).startsWith('\n') ? 1 : 0);
};
// The opening compiler owns its marker through EOF. Put this independent
// block before it, so a later opening-only update retains navigation styles.
const openingMarker = incumbentCss.indexOf('/* PizzaManager luxury opening, generated from src/opening.css. */');
const insertion = openingMarker < 0 ? incumbentCss.length : openingMarker;
const css = start < 0 ? incumbentCss.slice(0, insertion) + navigationCss + incumbentCss.slice(insertion) : incumbentCss.slice(0, start) + navigationCss + incumbentCss.slice(endBoundary(incumbentCss, end));
const stripNavigationCss = (text) => {
  const start = text.indexOf(startMarker);
  if (start < 0) return text;
  const end = text.indexOf(endMarker, start);
  return text.slice(0, start) + text.slice(endBoundary(text, end));
};
if (stripNavigationCss(css).trimEnd() !== stripNavigationCss(incumbentCss).trimEnd()) throw Error('A change escaped navigation stylesheet');
write('src/styles.css', css);

const html = read(source, 'index.html').replace(/(\/storefront\/src\/(?:styles\.css|app\.js)\?v=)[^"']+/g, `$1${tag}`);
if (!html.includes(`app.js?v=${tag}`) || !html.includes(`styles.css?v=${tag}`)) throw Error('Platform entry paths changed');
write('index.html', html);
for (const file of readdirSync(join(output, 'src')).filter((name) => name.endsWith('.js'))) {
  const path = `src/${file}`;
  const content = read(output, path).replace(/(from\s*|import\s*)(['"])(\.\/[^'"]+\.js)(?:\?[^'"]*)?\2/g, (_match, prefix, quote, path) => `${prefix}${quote}${path}?v=${tag}${quote}`);
  write(path, content);
  const syntax = spawnSync(process.execPath, ['--check', join(output, path)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw Error(`Invalid platform module ${file}: ${syntax.stderr}`);
  if (file !== 'app.js' && file !== 'navigation.js') {
    const untag = (text) => text.replace(/(from\s*|import\s*)(['"])(\.\/[^'"]+\.js)(?:\?[^'"]*)?\2/g, (_match, prefix, quote, path) => `${prefix}${quote}${path}${quote}`);
    if (untag(content) !== untag(read(source, path))) throw Error(`A change escaped navigation: ${file}`);
  }
}
const checks = spawnSync(process.execPath, [join(repository, 'scripts/navigation-check.mjs'), join(output, 'src/navigation.js')], { encoding: 'utf8' });
if (checks.status !== 0) throw Error(`Navigation behavior failed: ${checks.stderr || checks.stdout}`);
const hash = (path) => createHash('sha256').update(readFileSync(join(output, path))).digest('hex');
write('assets/navigation-ui-version.json', JSON.stringify({ revision, surface: 'navigation', managedCatalog: true, files: Object.fromEntries(['src/app.js', 'src/styles.css', 'src/navigation.js'].map((path) => [path, hash(path)])) }) + '\n');
console.log(`Compiled navigation ${revision}; opening, menu, order and shared runtime preserved.`);
