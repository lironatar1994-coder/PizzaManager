import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

// Extend only the supported shape enum and its existing admin dropdown.
const [source, output, manifest] = process.argv.slice(2).map(value => resolve(value));
if (!source || !output || !manifest) throw Error('Expected platform source, inactive output and ingredient manifest');
const choices = JSON.parse(readFileSync(manifest, 'utf8'));
const enumBefore = "['olive','mushroom','corn','onion','jalapeno','feta']";
const enumAfter = enumBefore.slice(0, -1) + choices.map(c => `,'${c.shape}'`).join('') + ']';
const namesBefore = "{olive:'זיתים',mushroom:'פטריות',corn:'תירס',onion:'בצל',jalapeno:'חלפיניו',feta:'בולגרית'}";
const namesAfter = namesBefore.slice(0, -1) + choices.map(c => `,'${c.shape}':'${c.name}'`).join('') + '}';
for (const [path, before, after] of [['shared/domain.ts', enumBefore, enumAfter], ['admin/main.tsx', namesBefore, namesAfter]]) {
  const incumbent = readFileSync(join(source, path), 'utf8');
  if (incumbent.includes(after)) continue;
  if (incumbent.split(before).length !== 2) throw Error(`Ingredient support contract changed in ${path}`);
  const next = incumbent.replace(before, after);
  if (next.replace(after, before) !== incumbent) throw Error(`Unrelated platform change in ${path}`);
  mkdirSync(dirname(join(output, path)), { recursive: true });
  writeFileSync(join(output, path), next);
}
console.log('Extended ingredient schema and admin selector; all other platform source preserved.');
