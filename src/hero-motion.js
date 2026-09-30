// A tiny, optional Higgsfield steam layer over the original hero photograph.
// Finish loading the photograph before requesting the 20–25 KB motion layer.
const app = document.querySelector('#app');
const compact = window.matchMedia('(max-width: 700px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
let mounted;

function mayAnimate() {
  return !document.hidden && !reducedMotion.matches && !connection?.saveData;
}

function mount(hero) {
  const picture = hero.querySelector('.hero__media');
  const poster = picture?.querySelector('img');
  if (!poster || !/hero-pizzeria-(?:mobile|desktop)-v2\.webp(?:\?|$)/.test(poster.currentSrc || poster.src)) return () => {};

  const video = document.createElement('video');
  video.className = 'hero__vapor';
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;
  video.preload = 'none';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  const visual = document.createElement('div');
  visual.className = 'hero__visual';
  picture.before(visual);
  visual.append(picture, video);

  let gone = false;
  let failed = false;
  let inView = true;
  let queued = false;
  let idleId;
  let timerId;

  const eligible = () => !gone && !failed && hero.isConnected && inView && mayAnimate();
  const asset = () => new URL(`hero-vapor-${compact.matches ? 'mobile' : 'desktop'}-v1.mp4`, poster.currentSrc || poster.src).href;

  function stop(unload = false) {
    video.pause();
    video.classList.remove('is-ready');
    if (unload && video.hasAttribute('src')) {
      video.removeAttribute('src');
      video.load();
    }
  }

  function play() {
    if (!eligible() || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    video.play().then(() => {
      if (eligible()) video.classList.add('is-ready');
      else stop();
    }).catch(() => stop());
  }

  function load() {
    queued = false;
    if (!eligible() || video.hasAttribute('src')) return;
    video.src = asset();
    video.load();
  }

  function schedule() {
    if (!eligible() || queued || video.hasAttribute('src')) return;
    if (!poster.complete || !poster.naturalWidth) return;
    if (document.readyState !== 'complete') return;
    queued = true;
    if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(load, { timeout: 3000 });
    else timerId = window.setTimeout(load, 1000);
  }

  function sync() {
    if (!eligible()) { stop(!mayAnimate()); return; }
    if (video.hasAttribute('src')) play();
    else schedule();
  }

  function onBreakpoint() {
    stop(true);
    sync();
  }

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0.05 })
    : null;
  observer?.observe(hero);
  video.addEventListener('loadeddata', play);
  video.addEventListener('error', () => { failed = true; stop(true); }, { once: true });
  poster.addEventListener('load', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('visibilitychange', sync);
  compact.addEventListener('change', onBreakpoint);
  reducedMotion.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  schedule();

  return () => {
    gone = true;
    observer?.disconnect();
    if (idleId !== undefined) window.cancelIdleCallback(idleId);
    if (timerId !== undefined) window.clearTimeout(timerId);
    poster.removeEventListener('load', schedule);
    window.removeEventListener('load', schedule);
    document.removeEventListener('visibilitychange', sync);
    compact.removeEventListener('change', onBreakpoint);
    reducedMotion.removeEventListener('change', sync);
    connection?.removeEventListener?.('change', sync);
    stop(true);
    video.remove();
  };
}

function syncHero() {
  const hero = app?.querySelector('.hero--luxury') || null;
  if (hero === mounted?.hero) return;
  mounted?.cleanup();
  mounted = hero ? { hero, cleanup: mount(hero) } : null;
}

if (app) {
  new MutationObserver(syncHero).observe(app, { childList: true });
  syncHero();
}
