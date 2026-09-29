// A brief pizza cue acknowledges opening an order. Rendering never waits for it.
export function createNavigator({ reducedMotion, pizzaSrc }) {
  const cue = document.createElement('div');
  cue.className = 'navigation-cue';
  cue.hidden = true;
  cue.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.className = 'navigation-cue__pizza';
  image.alt = '';
  image.width = 88;
  image.height = 88;
  image.decoding = 'async';
  image.src = pizzaSrc;
  cue.append(image);
  document.body.append(cue);

  let imageReady = false;
  if (typeof image.decode === 'function') {
    image.decode().then(() => { imageReady = Boolean(image.naturalWidth); }).catch(() => {});
  } else {
    imageReady = image.complete && Boolean(image.naturalWidth);
    image.addEventListener('load', () => { imageReady = Boolean(image.naturalWidth); }, { once: true });
  }

  let animation = null;
  let transition = null;
  let generation = 0;
  const dismissCue = () => {
    animation?.cancel();
    animation = null;
    cue.hidden = true;
  };
  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) dismissCue();
  });

  return function navigatePage(render, { pizza = false } = {}) {
    const current = ++generation;
    transition?.skipTransition();
    transition = null;
    dismissCue();
    if (reducedMotion.matches) { render(); return; }

    if (pizza) {
      render();
      // An unloaded image must never turn a fast route into an empty loader.
      if (!imageReady || !image.complete || !image.naturalWidth || typeof image.animate !== 'function') return;
      cue.hidden = false;
      const effect = image.animate([
        { opacity: 0, transform: 'rotate(-45deg) scale(.86)', offset: 0 },
        { opacity: 1, transform: 'rotate(-15deg) scale(1)', offset: .18 },
        { opacity: 1, transform: 'rotate(30deg) scale(1)', offset: .72 },
        { opacity: 0, transform: 'rotate(45deg) scale(.96)', offset: 1 },
      ], { duration: 260, easing: 'cubic-bezier(.16, 1, .3, 1)' });
      animation = effect;
      effect.finished.catch(() => {}).finally(() => {
        if (animation === effect) { animation = null; cue.hidden = true; }
      });
      return;
    }

    if (typeof document.startViewTransition !== 'function') { render(); return; }
    const effect = document.startViewTransition(() => {
      if (current === generation) render();
    });
    transition = effect;
    effect.finished.catch(() => {}).finally(() => {
      if (transition === effect) transition = null;
    });
  };
}
