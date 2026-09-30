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
export const findProduct = id => products.find(p => p.id === id);
export const activeProducts = () => products.filter(p => p.active);
export const demoFlags = () => ({ closed: false, payFail: false, multiple: activeProducts().length > 1 });
document.title = `${shop.name} | הזמנות`;
