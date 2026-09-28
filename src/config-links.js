import { normalizeConfig } from './order.js?v=20260928-convenience1';

// קישור מכיל הרכב וכמות בלבד. הערות, סל, פרטי קשר וכתובת אינם נכנסים אליו.
export function encodeConfiguration(product, config, qty) {
  const normalized = normalizeConfig(product, config);
  const payload = JSON.stringify({ version: 1, variant: normalized.variantId, options: normalized.options, qty: Math.max(1, Math.min(99, Math.floor(Number(qty) || 1))) });
  const bytes = new TextEncoder().encode(payload);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeConfiguration(product, token) {
  try {
    if (typeof token !== 'string' || token.length > 6000 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
    const json = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(token.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0)));
    const payload = JSON.parse(json);
    if (payload.version !== 1 || typeof payload.variant !== 'string' || !payload.options || typeof payload.options !== 'object' || Array.isArray(payload.options) || !Number.isInteger(payload.qty) || payload.qty < 1 || payload.qty > 99) return null;
    return { config: normalizeConfig(product, { variantId: payload.variant, options: payload.options, note: '' }), qty: payload.qty };
  } catch { return null; }
}

export function configurationLink(baseUrl, product, config, qty, includeDemoProduct = false) {
  const url = new URL(baseUrl);
  url.search = includeDemoProduct ? '?demo=multiple' : '';
  url.hash = `/product/${encodeURIComponent(product.id)}/share/${encodeConfiguration(product, config, qty)}`;
  return url.href;
}
