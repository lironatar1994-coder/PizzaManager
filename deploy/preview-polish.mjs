// Only the enlarged editor's heading and visible placement copy change.
// Keep accessible labels, prices, selection handlers and catalog data intact.
const replacements = [
  ['<div class="preview-clear"><button type="button" data-preview-clear>', '<div class="preview-clear"><strong class="preview-clear__title">תוספות</strong><button type="button" data-preview-clear>'],
  ["`${PLACEMENTS[placement].label} · ${price ? money(price) : 'כלול'}`", "`${placement === 'whole' ? '' : placement === 'right' ? 'ימין · ' : 'שמאל · '}${price ? money(price) : 'כלול'}`"],
];
export const withoutPreviewPolish = source => replacements.reduce((app, [before, after]) => app.replace(after, before), source);
export function previewPolishApp(source) {
  let app = source;
  for (const [before, after] of replacements) {
    if (app.includes(after)) continue;
    if (app.split(before).length !== 2) throw Error('Enlarged editor presentation boundary changed');
    app = app.replace(before, after);
  }
  if (withoutPreviewPolish(app) !== withoutPreviewPolish(source)) throw Error('Editor polish changed application behavior');
  return app;
}
