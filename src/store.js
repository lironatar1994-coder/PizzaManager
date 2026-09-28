import { findProduct } from './data.js?v=20260928-family1';
import { lineTotal, normalizeConfig } from './order.js?v=20260928-family1';

const CART_KEY = 'pizza-demo-cart-v1';
const ORDER_KEY = 'pizza-demo-last-order-v1';
const DRAFT_KEY = 'pizza-demo-builder-drafts-v1';
const MODE_KEY = 'pizza-demo-order-mode-v1';
const FAVORITES_KEY = 'pizza-demo-favorites-v1';
const DRAFT_LIFETIME = 24 * 60 * 60 * 1000;
const listeners = new Set();
let removedLines = [];

// הגישה ל־storage עצמה יכולה לזרוק שגיאה כשהדפדפן חוסם אחסון.
function storageOf(name) {
  try {
    return window[name];
  } catch {
    return null;
  }
}

function read(storageName, key, fallback) {
  try {
    const raw = storageOf(storageName)?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(storageName, key, value) {
  try {
    const storage = storageOf(storageName);
    if (!storage) return false;
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // אחסון חסום (למשל גלישה פרטית): הסל ממשיך לעבוד בזיכרון.
    return false;
  }
}

const savedCart = read('localStorage', CART_KEY, []);
let cart = (Array.isArray(savedCart) ? savedCart : [])
  .filter((line) => line && findProduct(line.config?.productId))
  .map((line) => ({ id: String(line.id), qty: Math.max(1, Math.min(99, Number(line.qty) || 1)), config: normalizeConfig(findProduct(line.config.productId), line.config) }));

const newId = () => Math.random().toString(36).slice(2, 10);

// טיוטות נפרדות לכל מוצר ולעריכה של שורה קיימת. המחירים תמיד מחושבים מחדש.
const savedDrafts = read('localStorage', DRAFT_KEY, {});
const drafts = savedDrafts && typeof savedDrafts === 'object' && !Array.isArray(savedDrafts) ? savedDrafts : {};
const boundedQty = (qty) => Math.max(1, Math.min(99, Math.floor(Number(qty) || 1)));

export function getDraft(key, product) {
  const draft = drafts[key];
  if (!draft || draft.config?.productId !== product.id || !Number.isFinite(draft.updatedAt) || Date.now() - draft.updatedAt > DRAFT_LIFETIME) {
    delete drafts[key];
    return null;
  }
  return {
    config: normalizeConfig(product, draft.config),
    qty: boundedQty(draft.qty),
    scroll: Number.isFinite(draft.scroll) ? Math.max(0, draft.scroll) : 0,
  };
}

export function saveDraft(key, product, { config, qty, scroll }) {
  drafts[key] = { config: normalizeConfig(product, config), qty: boundedQty(qty), scroll: Math.max(0, scroll || 0), updatedAt: Date.now() };
  for (const [id, draft] of Object.entries(drafts)) if (!draft || Date.now() - draft.updatedAt > DRAFT_LIFETIME) delete drafts[id];
  write('localStorage', DRAFT_KEY, drafts);
}

export function clearDraft(key) {
  delete drafts[key];
  write('localStorage', DRAFT_KEY, drafts);
}

export const getMode = () => read('sessionStorage', MODE_KEY, 'delivery') === 'pickup' ? 'pickup' : 'delivery';
export const saveMode = (mode) => write('sessionStorage', MODE_KEY, mode === 'pickup' ? 'pickup' : 'delivery');

const savedFavorites = read('localStorage', FAVORITES_KEY, []);
let favorites = (Array.isArray(savedFavorites) ? savedFavorites : [])
  .filter((item) => item && typeof item.id === 'string' && findProduct(item.config?.productId))
  .slice(0, 12);
const favoriteListeners = new Set();
let favoritesPersistent = true;
const cleanFavorite = (item) => ({
  id: item.id,
  name: String(item.name || 'ההרכב שלי').slice(0, 40),
  qty: boundedQty(item.qty),
  config: normalizeConfig(findProduct(item.config.productId), item.config),
});

export const getFavorites = () => favorites.map(cleanFavorite);
export const getFavorite = (id) => { const item = favorites.find((favorite) => favorite.id === id); return item ? cleanFavorite(item) : null; };
export const favoriteStorageIsPersistent = () => favoritesPersistent;
export function onFavoritesChange(listener) { favoriteListeners.add(listener); return () => favoriteListeners.delete(listener); }
const favoriteSignature = (config, qty) => JSON.stringify([config, boundedQty(qty)]);
export const matchingFavorite = (product, config, qty) => getFavorites().find((item) => favoriteSignature(item.config, item.qty) === favoriteSignature(normalizeConfig(product, config), qty));

export function saveFavorite(product, { name, config, qty }) {
  const normalized = normalizeConfig(product, config);
  const existing = matchingFavorite(product, normalized, qty);
  if (!existing && favorites.length >= 12) return { ok: false, reason: 'limit' };
  const favorite = { id: existing?.id || newId(), name: String(name || 'ההרכב שלי').trim().slice(0, 40) || 'ההרכב שלי', config: normalized, qty: boundedQty(qty) };
  favorites = [favorite, ...favorites.filter((item) => item.id !== favorite.id)];
  favoritesPersistent = write('localStorage', FAVORITES_KEY, favorites);
  favoriteListeners.forEach((listener) => listener());
  return { ok: true, favorite: cleanFavorite(favorite), persisted: favoritesPersistent };
}

export function removeFavorite(id) {
  favorites = favorites.filter((item) => item.id !== id);
  favoritesPersistent = write('localStorage', FAVORITES_KEY, favorites);
  favoriteListeners.forEach((listener) => listener());
}

function commit(detail) {
  write('localStorage', CART_KEY, cart);
  listeners.forEach((listener) => listener(detail));
}

export const getCart = () => cart;
export const getLine = (id) => cart.find((line) => line.id === id);
export const cartCount = () => cart.reduce((sum, line) => sum + line.qty, 0);
export const cartSubtotal = () => cart.reduce((sum, line) => sum + lineTotal(line, findProduct(line.config.productId)), 0);

export function onCartChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addLine(config, qty) {
  const line = { id: newId(), config: normalizeConfig(findProduct(config.productId), config), qty: boundedQty(qty) };
  cart = [...cart, line];
  commit({ type: 'add', line });
  return line;
}

export function updateLine(id, changes) {
  cart = cart.map((line) => (line.id === id ? { ...line, ...changes, qty: Math.max(1, Math.min(99, changes.qty ?? line.qty)) } : line));
  commit({ type: 'update', id });
}

export function removeLine(id) {
  const index = cart.findIndex((line) => line.id === id);
  if (index < 0) return;
  removedLines.push({ index, line: structuredClone(cart[index]) });
  removedLines = removedLines.slice(-20);
  cart = cart.filter((line) => line.id !== id);
  commit({ type: 'remove', id });
}

export const lastRemovedLine = () => removedLines.length ? structuredClone(removedLines.at(-1).line) : null;

export function undoRemoveLine() {
  const removed = removedLines.pop();
  if (!removed) return false;
  const product = findProduct(removed.line.config.productId);
  if (!product || cart.some((line) => line.id === removed.line.id)) { commit({ type: 'undo-unavailable' }); return false; }
  const line = { ...removed.line, qty: boundedQty(removed.line.qty), config: normalizeConfig(product, removed.line.config) };
  cart.splice(Math.min(removed.index, cart.length), 0, line);
  commit({ type: 'restore', id: line.id });
  return line;
}

export function clearCart() {
  removedLines = [];
  cart = [];
  commit({ type: 'clear' });
}

export const saveLastOrder = (order) => write('sessionStorage', ORDER_KEY, order);
export const getLastOrder = () => read('sessionStorage', ORDER_KEY, null);
