import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../deploy/storefront-data.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/, '').replace(/export const /g, 'const ');
const run = new (Object.getPrototypeOf(async function() {}).constructor)(
  'fetch', 'appUrl', 'appPath', 'window', 'document', 'setTimeout', 'clearTimeout',
  source + '\nreturn { shop, products, activeProducts };',
);
const catalog = { shop: { id: 'shop', name: 'Test' }, products: [{ id: 'active', active: true }, { id: 'hidden', active: false }] };
const response = (status, data) => ({ ok: status === 200, status, json: async () => data });
const events = [];
const execute = fetch => run(fetch, path => '/PizzaManager' + path, '/p/oven-demo/', { dispatchEvent: event => events.push(event) }, {}, (callback, ms) => setTimeout(callback, ms === 12000 ? 20 : 1), clearTimeout);
let calls = 0;
const loaded = await execute(async () => { if (++calls === 1) throw new TypeError('Network disconnected'); return response(200, catalog); });
assert.equal(calls, 2);
assert.deepEqual(loaded.activeProducts(), [catalog.products[0]]);
calls = 0;
await assert.rejects(execute(async () => { calls++; return response(404, { message: 'Shop unavailable' }); }), /Shop unavailable/);
assert.equal(calls, 1);
assert.equal(events.at(-1).detail.message, 'Shop unavailable');
calls = 0;
await assert.rejects(execute((url, { signal }) => new Promise((resolve, reject) => {
  calls++;
  signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')), { once: true });
})), /Timeout/);
assert.equal(calls, 2);
assert.equal(events.at(-1).type, 'pizza-startup-failed');
console.log('Startup recovery checks passed: transient retry, unavailable shop, bounded timeout, managed catalog retained.');
