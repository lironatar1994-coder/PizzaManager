// Narrow, idempotent adapter: retain the live SVG and full pizza editor.
export function floatingPreviewApp(source) {
  let app = source;
  const dependency = "import { setupFloatingPreview } from './floating-preview.js?v=20260929-dock1';";
  if (!app.includes('import { setupFloatingPreview }')) app = dependency + '\n' + app;
  if (!app.includes('data-preview-collapse')) {
    const expand = '${icon(\'expand\')}</button>` : \'\'}';
    if (!app.includes(expand)) throw Error('Pizza expand control boundary changed');
    app = app.replace(expand, '${icon(\'expand\')}</button><button type="button" class="stage__collapse" data-preview-collapse aria-label="צמצום תצוגת הפיצה" aria-expanded="true" aria-controls="stage-art">${icon(\'down\')}</button>` : \'\'}');
  }
  if (!app.includes('data-preview-open')) {
    const canvas = '<div class="stage__canvas">';
    if (!app.includes(canvas)) throw Error('Pizza canvas boundary changed');
    app = app.replace(canvas, canvas + '${isPizza ? \'<button type="button" class="stage__view" data-preview-open aria-label="פתיחת הפיצה ועריכת חצאים" aria-haspopup="dialog"></button>\' : \'\'}');
  }
  const first = app.indexOf('function setupStage(stage) {');
  const last = app.indexOf('function flyToCart(', first);
  if (first < 0 || last < 0) throw Error('Pizza stage lifecycle boundary changed');
  app = app.slice(0, first) + 'function setupStage(stage) {\n  return setupFloatingPreview(stage);\n}\n\n' + app.slice(last);
  app = app.replace('// במובייל הפיצה מתכווצת לפינה בזמן גלילה, כדי שתישאר גלויה ליד הבחירות.', '// במובייל הפיצה צפה מעל פעולת ההוספה; בדסקטופ היא נשארת בטור שלה.');
  return app;
}

export function floatingPreviewStyles(source, styles) {
  const first = source.indexOf('/* Floating mobile pizza preview. */');
  if (first >= 0) {
    const marker = '/* End floating mobile pizza preview. */';
    const last = source.indexOf(marker, first);
    if (last < 0) throw Error('Floating preview stylesheet boundary changed');
    source = source.slice(0, first) + source.slice(last + marker.length);
  }
  return source.trimEnd() + '\n\n' + styles.trim() + '\n';
}
