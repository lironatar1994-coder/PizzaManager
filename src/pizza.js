// מציג בסיס פיצה מצולם עם תוספות מצולמות מתוך התצורה; כל מסכי ההזמנה משתמשים באותה תצוגה.
import { selectedVariant } from './order.js?v=20260928-convenience1';

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
    const size = 0.76 + next() * 0.42;
    if (points.every((point) => (point.x - x) ** 2 + (point.y - y) ** 2 > gap * gap)) points.push({ x, y, rotation, size });
  }
  return points;
}

const SHAPES = {
  olive: { count: 21, gap: 26, size: 22, src: './assets/toppings/olive.webp' },
  mushroom: { count: 14, gap: 34, size: 29, src: './assets/toppings/mushroom.webp' },
  corn: { count: 34, gap: 17, size: 13, src: './assets/toppings/corn.webp' },
  onion: { count: 15, gap: 30, size: 29, src: './assets/toppings/onion.webp' },
  jalapeno: { count: 15, gap: 29, size: 23, src: './assets/toppings/jalapeno.webp' },
  feta: { count: 18, gap: 25, size: 17, src: './assets/toppings/feta.webp' },
};
const FALLBACK_SHAPE = { count: 14, gap: 30, draw: '<circle r="7" fill="#e7c9a0"/>' };

export function shapeIcon(shape) {
  const ingredient = SHAPES[shape];
  return ingredient
    ? `<img class="ingredient-photo" src="${ingredient.src}" alt="" loading="lazy" aria-hidden="true" />`
    : `<svg class="shape-icon" viewBox="-15 -15 30 30" aria-hidden="true">${FALLBACK_SHAPE.draw}</svg>`;
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
  const piece = shape.src
    ? `<image href="${shape.src}" x="${-shape.size / 2}" y="${-shape.size / 2}" width="${shape.size}" height="${shape.size}" />`
    : shape.draw;
  const points = scatter(topping.id, shape.count, SCATTER_RADIUS, shape.gap)
    .filter((point) => topping.placement === 'whole' || (topping.placement === 'right' ? point.x > 6 : point.x < -6));
  return `<g class="pizza__topping${entering ? ' is-entering' : ''}" data-topping="${topping.id}" data-shape="${topping.shape}" data-placement="${topping.placement}">${points.map((point, index) => `<g transform="translate(${(C + point.x).toFixed(1)} ${(C + point.y).toFixed(1)}) rotate(${point.rotation.toFixed(0)}) scale(${point.size.toFixed(2)})"><g class="pizza__piece" style="--i:${index};--drift:${(point.x * .035).toFixed(1)}px">${piece}</g></g>`).join('')}</g>`;
}

export function pizzaSVG(state, { uid = `p${Math.random().toString(36).slice(2, 8)}`, rings = [], label = '', editable = false } = {}) {
  const inner = R - CRUST.thin;
  const hasHalf = state.toppings.some((topping) => topping.placement !== 'whole');
  const baseImage = state.crust === 'thin' ? './assets/pizza-base-thin-v2.webp' : './assets/pizza-base-v2.webp';
  return `<svg class="pizza" viewBox="0 0 400 400" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>
    <defs>
      <clipPath id="${uid}-inner"><circle class="pizza__inner-clip" cx="${C}" cy="${C}" r="${R - CRUST[state.crust] - 7}"/></clipPath>
    </defs>
    ${rings.map((scale) => `<circle class="pizza__ring" cx="${C}" cy="${C}" r="${(R * scale).toFixed(1)}"/>`).join('')}
    <g class="pizza__disc" style="--scale:${state.scale}">
      <image class="pizza__photo" href="${baseImage}" x="0" y="0" width="400" height="400" />
      <g class="pizza__toppings" clip-path="url(#${uid}-inner)">${state.toppings.map((topping) => toppingMarkup(topping)).join('')}</g>
      ${editable ? `<g class="pizza__focus" aria-hidden="true"><path class="pizza__focus-right" d="M${C} ${C - inner}a${inner} ${inner} 0 0 1 0 ${inner * 2}Z"/><path class="pizza__focus-left" d="M${C} ${C - inner}a${inner} ${inner} 0 0 0 0 ${inner * 2}Z"/></g>` : ''}
      <line class="pizza__cut${hasHalf ? ' is-visible' : ''}" x1="${C}" y1="${C - inner}" x2="${C}" y2="${C + inner}"/>
    </g>
  </svg>`;
}

// עדכון חי במסך ההרכבה: רק מה שהשתנה נכנס או יוצא, כדי שהתוספות "ינחתו" על הפיצה.
export function updatePizza(svg, previous, next) {
  const disc = svg.querySelector('.pizza__disc');
  disc.style.setProperty('--scale', next.scale);
  if (previous.crust !== next.crust) {
    svg.querySelector('.pizza__photo').setAttribute('href', next.crust === 'thin' ? './assets/pizza-base-thin-v2.webp' : './assets/pizza-base-v2.webp');
    svg.querySelector('.pizza__inner-clip').setAttribute('r', R - CRUST[next.crust] - 7);
  }
  const layer = svg.querySelector('.pizza__toppings');
  const before = new Map(previous.toppings.map((topping) => [topping.id, topping.placement]));
  const after = new Map(next.toppings.map((topping) => [topping.id, topping.placement]));
  for (const [id, placement] of before) {
    if (after.get(id) === placement) continue;
    const node = layer.querySelector(`[data-topping="${CSS.escape(id)}"]:not(.is-leaving)`);
    if (!node) continue;
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
  }
  for (const topping of next.toppings) {
    if (before.get(topping.id) === topping.placement) continue;
    // insertAdjacentHTML בתוך אלמנט SVG מפרסר את הקטע בהקשר SVG.
    layer.insertAdjacentHTML('beforeend', toppingMarkup(topping, true));
  }
  svg.querySelector('.pizza__cut').classList.toggle('is-visible', next.toppings.some((topping) => topping.placement !== 'whole'));
}
