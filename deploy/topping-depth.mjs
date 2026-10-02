// Keep scatter/half placement untouched; compensate for each piece's rotation
// so the visual fall comes from above instead of from a random direction.
const original = 'style="--i:${index};--drift:${(point.x * .035).toFixed(1)}px"';
const depth = original.slice(0, -1) + ';--fall-x:${(-Math.sin(point.rotation * Math.PI / 180) * 64 / point.size).toFixed(1)}px;--fall-y:${(-Math.cos(point.rotation * Math.PI / 180) * 64 / point.size).toFixed(1)}px"';
export const withoutToppingDepth = source => source.replace(depth, original);
export function toppingDepth(source) {
  if (source.includes(depth)) return source;
  if (source.split(original).length !== 2) throw Error('Ingredient depth style boundary changed');
  const result = source.replace(original, depth);
  if (withoutToppingDepth(result) !== source) throw Error('Ingredient depth changed renderer behavior');
  return result;
}
