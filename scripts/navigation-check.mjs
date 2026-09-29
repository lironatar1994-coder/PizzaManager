import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = process.argv[2] ? pathToFileURL(resolve(process.argv[2])) : new URL('../src/navigation.js', import.meta.url);
const { createNavigator } = await import(`data:text/javascript;base64,${Buffer.from(readFileSync(source, 'utf8')).toString('base64')}`);
const settle = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
async function fixture({ loaded = true, animated = true, native = true, reduced = false, decoded = true, decodeSupported = true, decodeFails = false } = {}) {
  const events = [];
  const animations = [];
  const transitions = [];
  const nodes = [];
  const listeners = [];
  const reducedMotion = { matches: reduced, addEventListener: (event, callback) => { assert.equal(event, 'change'); listeners.push(callback); } };
  const document = {
    body: { append: (node) => nodes.push(node) },
    createElement: (tag) => {
      const attributes = new Map();
      const node = { tag, children: [], hidden: false, setAttribute: (name, value) => attributes.set(name, value), getAttribute: (name) => attributes.get(name), append: (child) => node.children.push(child), addEventListener() {} };
      if (tag === 'img') {
        node.complete = loaded;
        node.naturalWidth = loaded ? 88 : 0;
        if (decodeSupported) node.decode = () => decodeFails ? Promise.reject(Error('image decode failed')) : loaded && decoded ? Promise.resolve() : deferred().promise;
        if (animated) node.animate = (frames, options) => {
          events.push('animate');
          const done = deferred();
          const effect = { frames, options, finished: done.promise, cancelled: false, cancel() { this.cancelled = true; done.reject(Error('cancelled')); }, finish: done.resolve };
          animations.push(effect);
          return effect;
        };
      }
      return node;
    },
  };
  if (native) document.startViewTransition = (update) => {
    events.push('native');
    const done = deferred();
    const effect = { update, finished: done.promise, skipped: false, skipTransition() { this.skipped = true; done.resolve(); }, finish: done.resolve };
    transitions.push(effect);
    return effect;
  };
  globalThis.document = document;
  const navigate = createNavigator({ reducedMotion, pizzaSrc: '/PizzaManager/assets/pizza-base-v2.webp' });
  assert.equal(nodes.length, 1);
  const cue = nodes[0];
  const image = cue.children[0];
  assert.equal(cue.hidden, true);
  assert.equal(cue.getAttribute('aria-hidden'), 'true', 'A decorative cue must not announce a loading state');
  assert.equal(image.alt, '');
  assert.equal(image.src, '/PizzaManager/assets/pizza-base-v2.webp');
  await settle();
  return { navigate, reducedMotion, cue, image, animations, transitions, events, setReduced(value) { reducedMotion.matches = value; listeners.forEach((listener) => listener()); } };
}

// Opening route renders synchronously and shows a bounded decorative cue.
{
  const f = await fixture();
  let rendered = 0;
  f.navigate(() => { rendered++; f.events.push('render'); }, { pizza: true });
  assert.equal(rendered, 1, 'Opening navigation must never wait for its animation');
  assert.deepEqual(f.events, ['render', 'animate']);
  assert.equal(f.cue.hidden, false);
  assert.equal(f.animations[0].options.duration, 260);
  assert.equal(f.transitions.length, 0);
  f.animations[0].finish();
  await settle();
  assert.equal(f.cue.hidden, true, 'The completed cue must leave the page');
}

// No image / unsupported animation never replaces a fast route with a loader.
for (const options of [{ loaded: false }, { animated: false }, { decoded: false }, { decodeFails: true }]) {
  const f = await fixture(options);
  let rendered = 0;
  f.navigate(() => rendered++, { pizza: true });
  assert.equal(rendered, 1);
  assert.equal(f.cue.hidden, true);
  assert.equal(f.animations.length, 0);
}
{
  const f = await fixture();
  f.image.naturalWidth = 0;
  let rendered = 0;
  f.navigate(() => rendered++, { pizza: true });
  assert.equal(rendered, 1);
  assert.equal(f.cue.hidden, true, 'A broken completed image must also skip the cue');
}

// Reduced motion is respected at initialization and during an active cue.
{
  const f = await fixture({ reduced: true });
  let rendered = 0;
  f.navigate(() => rendered++, { pizza: true });
  f.navigate(() => rendered++);
  assert.equal(rendered, 2);
  assert.equal(f.animations.length, 0);
  assert.equal(f.transitions.length, 0);
}
{
  const f = await fixture();
  f.navigate(() => {}, { pizza: true });
  f.setReduced(true);
  assert.equal(f.cue.hidden, true);
  assert.equal(f.animations[0].cancelled, true);
  let rendered = 0;
  f.navigate(() => rendered++);
  assert.equal(rendered, 1);
  assert.equal(f.transitions.length, 0);
  await settle();
}

// Routine routes retain native transitions, with immediate fallback support.
{
  const f = await fixture();
  let rendered = 0;
  f.navigate(() => rendered++);
  assert.equal(f.animations.length, 0);
  assert.equal(f.transitions.length, 1);
  f.transitions[0].update();
  assert.equal(rendered, 1);
  f.transitions[0].finish();
  await settle();
}
{
  const f = await fixture({ native: false });
  let rendered = 0;
  f.navigate(() => rendered++);
  assert.equal(rendered, 1);
  assert.equal(f.cue.hidden, true);
}

// A cancelled cue's asynchronous cleanup cannot hide the following cue.
{
  const f = await fixture({ decodeSupported: false });
  let rendered = 0;
  f.navigate(() => rendered++, { pizza: true });
  const old = f.animations[0];
  f.navigate(() => rendered++, { pizza: true });
  assert.equal(old.cancelled, true);
  assert.equal(rendered, 2);
  await settle();
  assert.equal(f.cue.hidden, false);
  f.animations[1].finish();
  await settle();
  assert.equal(f.cue.hidden, true);
}

// Rapid route changes discard obsolete native callbacks and active cue effects.
{
  const f = await fixture();
  const rendered = [];
  f.navigate(() => rendered.push('old'));
  const old = f.transitions[0];
  f.navigate(() => rendered.push('pizza'), { pizza: true });
  assert.equal(old.skipped, true);
  old.update();
  assert.deepEqual(rendered, ['pizza'], 'A queued native callback must not restore an obsolete page');
  f.navigate(() => rendered.push('current'));
  assert.equal(f.animations[0].cancelled, true);
  assert.equal(f.cue.hidden, true);
  f.transitions[1].update();
  assert.deepEqual(rendered, ['pizza', 'current']);
  f.transitions[1].finish();
  await settle();
}
delete globalThis.document;
console.log('Navigation checks passed: immediate order entry, bounded cue, missing image, reduced motion, routine routes and rapid interruption.');
