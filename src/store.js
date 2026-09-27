import { findProduct } from './data.js';
import { lineTotal, normalizeConfig } from './order.js';

const CART_KEY = 'pizza-demo-cart-v1';
const ORDER_KEY = 'pizza-demo-last-order-v1';
const listeners = new Set();

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
    if (!storage) return;
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
  } catch {
    // אחסון חסום (למשל גלישה פרטית): הסל ממשיך לעבוד בזיכרון.
  }
}

const savedCart = read('localStorage', CART_KEY, []);
let cart = (Array.isArray(savedCart) ? savedCart : [])
  .filter((line) => line && findProduct(line.config?.productId))
  .map((line) => ({ id: String(line.id), qty: Math.max(1, Math.min(99, Number(line.qty) || 1)), config: normalizeConfig(findProduct(line.config.productId), line.config) }));

const newId = () => Math.random().toString(36).slice(2, 10);

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
  const line = { id: newId(), config, qty };
  cart = [...cart, line];
  commit({ type: 'add', line });
  return line;
}

export function updateLine(id, changes) {
  cart = cart.map((line) => (line.id === id ? { ...line, ...changes, qty: Math.max(1, Math.min(99, changes.qty ?? line.qty)) } : line));
  commit({ type: 'update', id });
}

export function removeLine(id) {
  cart = cart.filter((line) => line.id !== id);
  commit({ type: 'remove', id });
}

export function clearCart() {
  cart = [];
  commit({ type: 'clear' });
}

export const saveLastOrder = (order) => write('sessionStorage', ORDER_KEY, order);
export const getLastOrder = () => read('sessionStorage', ORDER_KEY, null);
