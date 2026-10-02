const importLine = /import \{ EXTRA_SHAPES \} from '\.\/extra-toppings\.js(?:\?[^']*)?';\r?\n/g;
const spread = /^  \.\.\.EXTRA_SHAPES,\r?\n/m;

export function withoutExtraToppings(source) {
  return source.replace(importLine, '').replace(spread, '');
}

export function extraToppings(source, tag) {
  const baseline = withoutExtraToppings(source);
  const marker = /const SHAPES = \{(\r?\n)/g;
  if ([...baseline.matchAll(marker)].length !== 1) throw Error('Expected one incumbent ingredient registry');
  const output = `import { EXTRA_SHAPES } from './extra-toppings.js?v=${tag}';\n` + baseline.replace(marker, (header, newline) => header + '  ...EXTRA_SHAPES,' + newline);
  if (withoutExtraToppings(output) !== baseline) throw Error('Ingredient extension changed renderer behavior');
  return output;
}
