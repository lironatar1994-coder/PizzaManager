// מצייר כל פיצה מתוך התצורה שלה: מסך ההרכבה, הסל, התפריט וכרטיס ההזמנה משתמשים באותו ציור.
import { selectedVariant } from './order.js';

const C = 200;
const R = 188;
const CRUST = { classic: 26, thin: 12 };
const SCATTER_RADIUS = R - CRUST.classic - 16;

function hash(text) {
  let h = 2166136261;
  for (const character of text) {
    h ^= character.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function random(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// פיזור קבוע לפי מזהה: אותה תוספת נוחתת תמיד באותם מקומות, גם כשמוסיפים או מורידים אחרות.
function scatter(key, count, radius, gap) {
  const next = random(hash(key));
  const points = [];
  for (let tries = 0; points.length < count && tries < count * 80; tries += 1) {
    const angle = next() * Math.PI * 2;
    const distance = Math.sqrt(next()) * radius;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const rotation = next() * 360;
    const size = 0.86 + next() * 0.28;
    if (points.every((point) => (point.x - x) ** 2 + (point.y - y) ** 2 > gap * gap)) points.push({ x, y, rotation, size });
  }
  return points;
}

const SHAPES = {
  olive: {
    count: 17, gap: 30,
    draw: '<path d="M0-8.4a8.4 8.4 0 1 1 0 16.8a8.4 8.4 0 1 1 0-16.8Zm0 4.9a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7Z" fill="#221c19" fill-rule="evenodd"/><path d="M-5.6-4a6.6 6.6 0 0 1 4.6-3.2" fill="none" stroke="#6d625b" stroke-width="1.5" stroke-linecap="round"/>',
  },
  mushroom: {
    count: 12, gap: 38,
    draw: '<path d="M-12.5 1.5c0-9.4 5.8-13.5 12.5-13.5s12.5 4.1 12.5 13.5c-3 1.3-6.2 1.3-8.6.2l.9 9.6c-3 1.4-6.6 1.4-9.6 0l.9-9.6c-2.4 1.1-5.6 1.1-8.6-.2Z" fill="#b58d6b"/><path d="M-8.8-.4c.7-6.3 4.2-9 8.8-9s8.1 2.7 8.8 9" fill="none" stroke="#e9d3b8" stroke-width="2.4" stroke-linecap="round"/>',
  },
  corn: {
    count: 28, gap: 19,
    draw: '<rect x="-4.4" y="-5" width="8.8" height="10" rx="3.2" fill="#f2a20c" stroke="#a86a00" stroke-width="1"/><rect x="-2.2" y="-3.2" width="2.8" height="3.8" rx="1.4" fill="#ffd66b"/>',
  },
  onion: {
    count: 12, gap: 34,
    draw: '<path d="M-13 5a14 14 0 0 1 26 0" fill="none" stroke="#8a2c68" stroke-width="3.6" stroke-linecap="round"/><path d="M-8.6 5.6a9.6 9.6 0 0 1 17.2 0" fill="none" stroke="#dcaacb" stroke-width="1.7" stroke-linecap="round"/>',
  },
  jalapeno: {
    count: 12, gap: 32,
    draw: '<circle r="8.8" fill="#3a7a31"/><circle r="6.2" fill="#c7dc8e"/><circle cx="-2.1" cy="-1.7" r="1.25" fill="#f6f2da"/><circle cx="2.3" cy="-.4" r="1.25" fill="#f6f2da"/><circle cy="2.5" r="1.25" fill="#f6f2da"/>',
  },
  feta: {
    count: 15, gap: 28,
    draw: '<rect x="-5.8" y="-5.8" width="11.6" height="11.6" rx="2.2" fill="#fbf6ea"/><path d="M-5.8 2.6h11.6v1a2.2 2.2 0 0 1-2.2 2.2h-7.2a2.2 2.2 0 0 1-2.2-2.2Z" fill="#e3d6bd"/>',
  },
};
const FALLBACK_SHAPE = { count: 14, gap: 30, draw: '<circle r="7" fill="#e7c9a0"/>' };

export function shapeIcon(shape) {
  return `<svg class="shape-icon" viewBox="-15 -15 30 30" aria-hidden="true">${(SHAPES[shape] || FALLBACK_SHAPE).draw}</svg>`;
}

// מצב הציור נגזר מהתצורה: גודל, סוג בצק ותוספות עם מיקום.
export function pizzaState(product, config) {
  const state = { scale: selectedVariant(product, config).scale ?? 1, crust: 'classic', toppings: [] };
  for (const group of product.optionGroups || []) {
    const value = config.options[group.id];
    if (group.type === 'single' && group.visualRole === 'crust') {
      state.crust = group.choices.find((choice) => choice.id === value)?.crust || 'classic';
    } else if (group.type === 'multi') {
      for (const choice of group.choices) {
        if (value?.[choice.id] && choice.shape) state.toppings.push({ id: choice.id, shape: choice.shape, placement: value[choice.id] });
      }
    }
  }
  return state;
}

export function toppingMarkup(topping, entering = false) {
  const shape = SHAPES[topping.shape] || FALLBACK_SHAPE;
  const points = scatter(topping.id, shape.count, SCATTER_RADIUS, shape.gap)
    .filter((point) => topping.placement === 'whole' || (topping.placement === 'right' ? point.x > 6 : point.x < -6));
  return `<g class="pizza__topping${entering ? ' is-entering' : ''}" data-topping="${topping.id}" data-placement="${topping.placement}">${points.map((point, index) => `<g transform="translate(${(C + point.x).toFixed(1)} ${(C + point.y).toFixed(1)}) rotate(${point.rotation.toFixed(0)}) scale(${point.size.toFixed(2)})"><g class="pizza__piece" style="--i:${index}">${shape.draw}</g></g>`).join('')}</g>`;
}

function crustMarkup(crust, uid) {
  const width = CRUST[crust] || CRUST.classic;
  const next = random(hash(`char-${crust}`));
  const spots = Array.from({ length: 22 }, () => {
    const angle = next() * Math.PI * 2;
    const distance = R - width * (0.3 + next() * 0.4);
    const rx = 3 + next() * (crust === 'thin' ? 4 : 7);
    return `<ellipse cx="${(C + Math.cos(angle) * distance).toFixed(1)}" cy="${(C + Math.sin(angle) * distance).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * (0.45 + next() * 0.25)).toFixed(1)}" transform="rotate(${((angle * 180) / Math.PI + 90).toFixed(0)} ${(C + Math.cos(angle) * distance).toFixed(1)} ${(C + Math.sin(angle) * distance).toFixed(1)})" opacity="${(0.35 + next() * 0.4).toFixed(2)}"/>`;
  }).join('');
  return `<g class="pizza__crust" data-crust="${crust}">
    <circle cx="${C}" cy="${C}" r="${R}" fill="url(#${uid}-crust)"/>
    <circle cx="${C}" cy="${C}" r="${R - width * 0.55}" fill="none" stroke="#f9dfa6" stroke-opacity=".32" stroke-width="${(width * 0.3).toFixed(1)}"/>
    <g fill="#3a2316">${spots}</g>
    <circle cx="${C}" cy="${C}" r="${R - width}" fill="url(#${uid}-sauce)"/>
  </g>`;
}

const dot = (point, radius) => `<circle cx="${(C + point.x).toFixed(1)}" cy="${(C + point.y).toFixed(1)}" r="${radius.toFixed(1)}"/>`;

// שכבת גבינה מותכת אחת עם שוליים גליים, רוטב שמציץ דרכה וכתמי השחמה.
function cheeseMarkup(uid) {
  const cheeseR = SCATTER_RADIUS - 2;
  const next = random(hash('cheese-edge'));
  const edge = Array.from({ length: 30 }, (_, index) => {
    const angle = (index / 30) * Math.PI * 2 + next() * 0.15;
    const distance = cheeseR - 4 + next() * 10;
    return dot({ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }, 9 + next() * 9);
  }).join('');
  const peeks = scatter('sauce-peek', 16, cheeseR - 10, 34).map((point, index) => dot(point, 4 + (index % 4) * 2.2 * point.size)).join('');
  const browned = scatter('browned', 34, cheeseR, 17).map((point, index) => dot(point, 1.8 + (index % 5) * 1.1)).join('');
  const sheen = scatter('sheen', 10, cheeseR - 20, 40).map((point) => dot(point, 5 + point.size * 5)).join('');
  return `<g clip-path="url(#${uid}-inner)">
    <circle cx="${C}" cy="${C}" r="${cheeseR - 6}" fill="url(#${uid}-cheese)"/>
    <g fill="#eab86b">${edge}</g>
    <g fill="#b9331c" opacity=".78">${peeks}</g>
    <g fill="#b8732f" opacity=".42">${browned}</g>
    <g fill="#fff4d2" opacity=".22">${sheen}</g>
  </g>`;
}

export function pizzaSVG(state, { uid = `p${Math.random().toString(36).slice(2, 8)}`, rings = [], label = '' } = {}) {
  const inner = R - CRUST.thin;
  const hasHalf = state.toppings.some((topping) => topping.placement !== 'whole');
  return `<svg class="pizza" viewBox="0 0 400 400" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>
    <defs>
      <radialGradient id="${uid}-crust"><stop offset=".8" stop-color="#f0bf73"/><stop offset=".93" stop-color="#d4924a"/><stop offset="1" stop-color="#9a5624"/></radialGradient>
      <radialGradient id="${uid}-cheese"><stop offset="0" stop-color="#f6d28e"/><stop offset=".75" stop-color="#eebf72"/><stop offset="1" stop-color="#e5ad60"/></radialGradient>
      <radialGradient id="${uid}-sauce"><stop offset=".72" stop-color="#bd3520"/><stop offset="1" stop-color="#8f2414"/></radialGradient>
      <clipPath id="${uid}-inner"><circle class="pizza__inner-clip" cx="${C}" cy="${C}" r="${R - CRUST[state.crust] - 7}"/></clipPath>
    </defs>
    ${rings.map((scale) => `<circle class="pizza__ring" cx="${C}" cy="${C}" r="${(R * scale).toFixed(1)}"/>`).join('')}
    <g class="pizza__disc" style="--scale:${state.scale}">
      <g class="pizza__base">${crustMarkup(state.crust, uid)}${cheeseMarkup(uid)}</g>
      <g class="pizza__toppings" clip-path="url(#${uid}-inner)">${state.toppings.map((topping) => toppingMarkup(topping)).join('')}</g>
      <line class="pizza__cut${hasHalf ? ' is-visible' : ''}" x1="${C}" y1="${C - inner}" x2="${C}" y2="${C + inner}"/>
    </g>
  </svg>`;
}

// עדכון חי במסך ההרכבה: רק מה שהשתנה נכנס או יוצא, כדי שהתוספות "ינחתו" על הפיצה.
export function updatePizza(svg, previous, next) {
  const disc = svg.querySelector('.pizza__disc');
  disc.style.setProperty('--scale', next.scale);
  if (previous.crust !== next.crust) {
    const uid = svg.querySelector('radialGradient').id.replace(/-crust$/, '');
    const template = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    template.innerHTML = crustMarkup(next.crust, uid);
    svg.querySelector('.pizza__crust').replaceWith(template.firstElementChild);
    svg.querySelector('.pizza__inner-clip').setAttribute('r', R - CRUST[next.crust] - 7);
  }
  const layer = svg.querySelector('.pizza__toppings');
  const before = new Map(previous.toppings.map((topping) => [topping.id, topping.placement]));
  const after = new Map(next.toppings.map((topping) => [topping.id, topping.placement]));
  for (const [id, placement] of before) {
    if (after.get(id) === placement) continue;
    const node = layer.querySelector(`[data-topping="${id}"]:not(.is-leaving)`);
    if (!node) continue;
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 260);
  }
  for (const topping of next.toppings) {
    if (before.get(topping.id) === topping.placement) continue;
    // insertAdjacentHTML בתוך אלמנט SVG מפרסר את הקטע בהקשר SVG.
    layer.insertAdjacentHTML('beforeend', toppingMarkup(topping, true));
  }
  svg.querySelector('.pizza__cut').classList.toggle('is-visible', next.toppings.some((topping) => topping.placement !== 'whole'));
}
