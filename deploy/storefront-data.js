import { appUrl, appPath } from '../../shared/runtime.js';

const slug = appPath.split('/')[2];
async function loadCatalog() {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(appUrl(`/api/public/shops/${encodeURIComponent(slug)}`), { cache: 'no-store', signal: controller.signal });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.message || 'הפיצרייה אינה זמינה כרגע');
        error.status = response.status;
        throw error;
      }
      if (!data.shop || !Array.isArray(data.products)) throw new Error('Invalid catalog response');
      return data;
    } catch (error) {
      if (attempt === 1 || error.status && error.status < 500) throw error;
    } finally {
      clearTimeout(timer);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

let data;
try {
  data = await loadCatalog();
} catch (error) {
  const message = error.status && error.status < 500 ? error.message : 'לא הצלחנו להתחבר לפיצרייה. נסו שוב.';
  window.dispatchEvent(new CustomEvent('pizza-startup-failed', { detail: { message } }));
  throw error;
}
export const shop = data.shop;
export const products = data.products;
let refreshSequence = 0;
export async function refreshCatalog() {
  const sequence = ++refreshSequence, controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(appUrl(`/api/public/shops/${encodeURIComponent(slug)}`), { cache: 'no-store', signal: controller.signal });
    const current = await response.json();
    if (!response.ok || !current.shop || !Array.isArray(current.products)) throw Error('Catalog refresh failed');
    if (sequence !== refreshSequence) return false;
    const prior = new Map(products.map(product => [product.id, product]));
    const next = current.products.map(product => {
      const existing = prior.get(product.id); prior.delete(product.id);
      return existing ? Object.assign(existing, product) : product;
    });
    // Retain deleted products as unavailable references for existing carts.
    products.splice(0, products.length, ...next, ...[...prior.values()].map(product => Object.assign(product, { active: false, available: false })));
    Object.assign(shop, current.shop);
    return true;
  } finally { clearTimeout(timer); }
}
export const findProduct = id => products.find(p => p.id === id);
export const activeProducts = () => products.filter(p => p.active);
export const demoFlags = () => ({ closed: false, payFail: false, multiple: activeProducts().length > 1 });
document.title = `${shop.name} | הזמנות`;
