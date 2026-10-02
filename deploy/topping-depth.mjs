// Presentation only: final scatter positions and half placement stay intact.
const original = 'style="--i:${index};--drift:${(point.x * .035).toFixed(1)}px"';
const depth = original.slice(0, -1) + ';--fall-x:${(-Math.sin(point.rotation * Math.PI / 180) * 64 / point.size).toFixed(1)}px;--fall-y:${(-Math.cos(point.rotation * Math.PI / 180) * 64 / point.size).toFixed(1)}px"';
const natural = original.slice(0, -1) + ';--fall-x:${(-Math.sin(point.rotation * Math.PI / 180) * (48 + index % 4 * 5) / point.size).toFixed(1)}px;--fall-y:${(-Math.cos(point.rotation * Math.PI / 180) * (48 + index % 4 * 5) / point.size).toFixed(1)}px;--settle-x:${(Math.cos(point.rotation * Math.PI / 180) * (index % 3 - 1) * 2 / point.size).toFixed(1)}px;--settle-y:${(-Math.sin(point.rotation * Math.PI / 180) * (index % 3 - 1) * 2 / point.size).toFixed(1)}px;--piece-turn:${-7 + index % 5 * 3.5}deg;--fall-time:${520 + index % 5 * 18}ms;--fall-delay:${index * 13 % 19 * 7}ms"';
const pieceStart = '<g class="pizza__piece" ';
const shadow = '<g class="pizza__landing-shadow" style="--fall-time:${520 + index % 5 * 18}ms;--fall-delay:${index * 13 % 19 * 7}ms"><ellipse rx="${((shape.size || 20) * .4).toFixed(1)}" ry="${((shape.size || 20) * .18).toFixed(1)}" cy="1.5"/></g>';
const randomStyle = original.slice(0, -1) + ';${motion}"';
const randomShadow = shadow.replace(/style="[^"]*"/, 'style="${motion}"');
const mapperStart = '${points.map((point, index) => `<g transform=';
const randomMapperStart = '${points.map((point, index) => { const motion = landingMotion(point, index, entering); return `<g transform=';
const mapperEnd = "${piece}</g></g>`).join('')}</g>`;";
const randomMapperEnd = "${piece}</g></g>`; }).join('')}</g>`;";
const motionHelper = String.raw`// Begin randomized ingredient landing.
function landingMotion(point, index, entering) {
  // New motion per addition; static previews keep the same final geometry.
  const next = entering ? Math.random : random(hash('landing-' + index));
  const height = 44 + next() * 34;
  const drift = (next() - .5) * 24;
  const turn = (next() - .5) * 34;
  const skid = (next() - .5) * 3.6;
  const duration = Math.round(440 + Math.sqrt(height / 44) * 100 + next() * 60);
  const delay = index === 0 ? 0 : Math.round(next() * 150);
  const angle = point.rotation * Math.PI / 180;
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  // Invert each piece's resting rotation/scale so gravity stays screen-down.
  return [
    '--fall-x:' + ((cosine * drift - sine * height) / point.size).toFixed(1) + 'px',
    '--fall-y:' + ((-sine * drift - cosine * height) / point.size).toFixed(1) + 'px',
    '--settle-x:' + (cosine * skid / point.size).toFixed(1) + 'px',
    '--settle-y:' + (-sine * skid / point.size).toFixed(1) + 'px',
    '--piece-turn:' + turn.toFixed(1) + 'deg',
    '--fall-time:' + duration + 'ms',
    '--fall-delay:' + delay + 'ms',
  ].join(';');
}
// End randomized ingredient landing.
`;
const helper = motionHelper;
const helperBlock = /^\/\/ Begin randomized ingredient landing\.\r?\n[\s\S]*?\/\/ End randomized ingredient landing\.\r?\n/m;
export const withoutToppingDepth = source => source.replace(helperBlock, '').replace(randomMapperStart, mapperStart).replace(randomMapperEnd, mapperEnd).replace(randomStyle, original).replace(randomShadow, '').replace(natural, original).replace(depth, original).replace(shadow, '');
export function toppingDepth(source) {
  const baseline = withoutToppingDepth(source);
  const boundary = 'export function toppingMarkup(';
  for (const contract of [original, pieceStart, mapperStart, mapperEnd, boundary]) {
    if (baseline.split(contract).length !== 2) throw Error('Ingredient motion boundary changed: ' + contract);
  }
  const result = baseline.replace(boundary, helper + boundary).replace(original, randomStyle).replace(pieceStart, randomShadow + pieceStart).replace(mapperStart, randomMapperStart).replace(mapperEnd, randomMapperEnd);
  if (withoutToppingDepth(result) !== baseline) throw Error('Ingredient depth changed renderer behavior');
  return result;
}
