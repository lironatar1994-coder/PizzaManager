import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const path = (relative) => new URL(relative, root);
const required = [
  'index.html', 'src/app.js', 'src/data.js', 'src/order.js',
  'src/pizza.js', 'src/store.js', 'src/services.js', 'src/schedule.js', 'src/address.js', 'src/config-links.js', 'src/styles.css',
  'assets/pizza-hero-desktop.jpg', 'assets/pizza-hero-mobile.jpg',
  'assets/pizza-base-v2.webp', 'assets/pizza-base-thin-v2.webp', 'assets/garlic-bread-demo.webp',
  'assets/brand/oven-mark.svg', 'assets/brand/favicon.svg',
  ...['olive', 'mushroom', 'corn', 'onion', 'jalapeno', 'feta'].map((name) => `assets/toppings/${name}.webp`),
  'deploy_linux.sh', 'deploy/pizza-manager-locations.conf',
];
for (const file of required) {
  if (!existsSync(path(file))) throw new Error(`Missing deployment file: ${file}`);
}

const html = readFileSync(path('index.html'), 'utf8');
const data = readFileSync(path('src/data.js'), 'utf8');
const services = readFileSync(path('src/services.js'), 'utf8');
if (!/<html lang="he" dir="rtl">/.test(html)) throw new Error('Hebrew RTL document setup is missing');
if (!/<meta name="robots" content="noindex,nofollow"/.test(html)) throw new Error('Demo must remain excluded from indexing');
if (!/demoOnly:\s*true/.test(data)) throw new Error('Demo-only safeguard is missing');
if (!/DEMO-/.test(services)) throw new Error('Demo order reference is missing');

const sourceDir = fileURLToPath(path('src/'));
for (const file of readdirSync(sourceDir).filter((name) => name.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', join(sourceDir, file)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${file}: ${result.stderr || result.stdout}`);
}

console.log('Static demo checks passed. No backend or real payment is included.');
await import('./bundles-check.mjs');
