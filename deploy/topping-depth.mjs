// Presentation only: final scatter positions and half placement stay intact.
const original = 'style="--i:${index};--drift:${(point.x * .035).toFixed(1)}px"';
const depth = original.slice(0, -1) + ';--fall-x:${(-Math.sin(point.rotation * Math.PI / 180) * 64 / point.size).toFixed(1)}px;--fall-y:${(-Math.cos(point.rotation * Math.PI / 180) * 64 / point.size).toFixed(1)}px"';
const natural = original.slice(0, -1) + ';--fall-x:${(-Math.sin(point.rotation * Math.PI / 180) * (48 + index % 4 * 5) / point.size).toFixed(1)}px;--fall-y:${(-Math.cos(point.rotation * Math.PI / 180) * (48 + index % 4 * 5) / point.size).toFixed(1)}px;--settle-x:${(Math.cos(point.rotation * Math.PI / 180) * (index % 3 - 1) * 2 / point.size).toFixed(1)}px;--settle-y:${(-Math.sin(point.rotation * Math.PI / 180) * (index % 3 - 1) * 2 / point.size).toFixed(1)}px;--piece-turn:${-7 + index % 5 * 3.5}deg;--fall-time:${520 + index % 5 * 18}ms;--fall-delay:${index * 13 % 19 * 7}ms"';
const pieceStart = '<g class="pizza__piece" ';
const shadow = '<g class="pizza__landing-shadow" style="--fall-time:${520 + index % 5 * 18}ms;--fall-delay:${index * 13 % 19 * 7}ms"><ellipse rx="${((shape.size || 20) * .4).toFixed(1)}" ry="${((shape.size || 20) * .18).toFixed(1)}" cy="1.5"/></g>';
export const withoutToppingDepth = source => source.replace(natural, original).replace(depth, original).replace(shadow, '');
export function toppingDepth(source) {
  if (source.includes(natural) && source.includes(shadow)) return source;
  const baseline = withoutToppingDepth(source);
  if (baseline.split(original).length !== 2 || baseline.split(pieceStart).length !== 2) throw Error('Ingredient depth style boundary changed');
  const result = baseline.replace(original, natural).replace(pieceStart, shadow + pieceStart);
  if (withoutToppingDepth(result) !== baseline) throw Error('Ingredient depth changed renderer behavior');
  return result;
}
