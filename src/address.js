import { shop } from './data.js?v=20260928-refine1';

const normalize = (text) => String(text || '').normalize('NFKC').trim().replace(/[\s\u05be\u2010-\u2015-]+/g, ' ');
const cache = new Map();
const pointValid = (point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && point[0] >= 34 && point[0] <= 36 && point[1] >= 29 && point[1] <= 34;

export function pointInPolygon(point, polygon) {
  if (!pointValid(point) || !Array.isArray(polygon) || polygon.length < 3 || !polygon.every(pointValid)) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    const cross = (y - yi) * (xj - xi) - (x - xi) * (yj - yi);
    if (Math.abs(cross) < 1e-10 && x >= Math.min(xi, xj) && x <= Math.max(xi, xj) && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) return true;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function zoneForAddress(place) {
  if (!place || place.countryCode !== shop.addressLookup.countryCode || !place.city || !place.street || !place.number || !pointValid(place.coordinates)) return null;
  return shop.deliveryZones.find((zone) => zone.cities.some((city) => normalize(city) === normalize(place.city)) && pointInPolygon(place.coordinates, zone.polygon)) || null;
}

function fromFeature(feature) {
  const properties = feature?.properties;
  const coordinates = feature?.geometry?.coordinates;
  if (!properties || !pointValid(coordinates) || properties.countrycode !== shop.addressLookup.countryCode || !properties.street || !properties.housenumber || !properties.city || !properties.osm_id || !/^[NWR]$/.test(properties.osm_type)) return null;
  return {
    id: `${properties.osm_type}:${properties.osm_id}`,
    countryCode: properties.countrycode,
    city: String(properties.city), street: String(properties.street), number: String(properties.housenumber),
    coordinates: [...coordinates],
    label: `${properties.street} ${properties.housenumber}, ${properties.city}`,
  };
}

export async function searchAddresses(query, { signal, fresh = false } = {}) {
  const text = String(query || '').trim().slice(0, 160);
  if (text.length < 4) return [];
  const stored = cache.get(text);
  if (!fresh && stored && Date.now() - stored.at < 60_000) return structuredClone(stored.places);
  const url = new URL(shop.addressLookup.endpoint);
  url.searchParams.set('q', text);
  url.searchParams.set('countrycode', shop.addressLookup.countryCode);
  url.searchParams.set('limit', '8');
  url.searchParams.set('lon', shop.addressLookup.center[0]);
  url.searchParams.set('lat', shop.addressLookup.center[1]);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, 8000);
  try {
    // כותרת בעברית משאירה שמות מקור מקומיים במקום תרגום אוטומטי לפי שפת הדפדפן.
    const response = await fetch(url, { signal: controller.signal, headers: { 'Accept-Language': 'he' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('address-lookup-unavailable');
    const data = await response.json();
    if (!Array.isArray(data.features)) throw new Error('invalid-address-response');
    const ids = new Set();
    const places = data.features.map(fromFeature).filter((place) => place && !ids.has(place.id) && ids.add(place.id)).slice(0, 6);
    if (cache.size >= 30) cache.delete(cache.keys().next().value);
    cache.set(text, { at: Date.now(), places });
    return places;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

// השיוך נבדק שוב מול שירות המפות. טקסט חופשי/שדה עיר/מספר שהוחלף לא מקבל אזור.
export async function verifySelectedAddress(address, { signal } = {}) {
  const selected = address.place;
  if (!selected || address.query !== selected.label || ['city', 'street', 'number'].some((key) => address[key] !== selected[key])) return { status: 'invalid' };
  try {
    const candidates = await searchAddresses(selected.label, { signal, fresh: true });
    const found = candidates.find((place) => place.id === selected.id);
    if (!found || ['city', 'street', 'number'].some((key) => found[key] !== selected[key])) return { status: 'invalid' };
    const zone = zoneForAddress(found);
    return zone ? { status: 'ok', zone, place: found } : { status: 'out', place: found };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: 'unavailable' };
  }
}
