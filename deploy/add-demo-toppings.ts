import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pool, platformPool, tenant } from '../server/db.js';
import { productSchema } from '../shared/domain.js';
import { priceLine } from '../shared/pricing.js';
import { audit } from '../server/orders.js';

// Install in the active platform's deploy directory. This deliberate catalog
// edit is separate from the UI release's catalog-preservation checks.
const [baselineFile, choicesFile, backupFile, revision] = process.argv.slice(2);
if (!baselineFile || !choicesFile || !backupFile || !/^[a-f0-9]{40}$/.test(revision || '')) throw Error('Expected catalog baseline, choices, backup and Git revision');
const expected = JSON.parse(readFileSync(resolve(baselineFile), 'utf8').replace(/^\uFEFF/, ''));
const additions = JSON.parse(readFileSync(resolve(choicesFile), 'utf8'));
const shopId = '2052e635-2c07-462b-8f81-0a958e3eb2b7';
const productId = 'house-pizza';
if (expected.shop.id !== shopId || expected.shop.slug !== 'oven-demo' || !expected.shop.demoOnly) throw Error('This edit is restricted to the known demonstration shop');
try {
  const result = await tenant(shopId, async db => {
    const shop = (await db.query('SELECT slug,settings FROM shops WHERE id=$1 FOR SHARE', [shopId])).rows[0];
    if (shop?.slug !== 'oven-demo' || !shop.settings.demoOnly) throw Error('Expected demonstration shop');
    const row = (await db.query('SELECT data FROM products WHERE shop_id=$1 AND id=$2 FOR UPDATE', [shopId, productId])).rows[0];
    if (!row) throw Error('Expected existing pizza product');
    const before = row.data;
    const expectedProduct = expected.products.find((p:any) => p.id === productId);
    const next = structuredClone(expectedProduct);
    const index = next.optionGroups.findIndex((g:any) => g.id === 'toppings' && g.type === 'multi' && g.placement);
    if (index < 0) throw Error('Expected existing half-enabled topping group');
    const ids = new Set(next.optionGroups[index].choices.map((c:any) => c.id));
    for (const choice of additions) {
      if (ids.has(choice.id)) throw Error('New ingredient overlaps an existing choice');
      ids.add(choice.id);
      next.optionGroups[index].choices.push(choice);
    }
    productSchema.parse(next); // Validate without stripping existing managed fields.
    if (isDeepStrictEqual(before, next)) return {alreadyApplied:true};
    if (!isDeepStrictEqual(before, expectedProduct)) throw Error('Pizza was edited since the baseline; refusing to overwrite managed content');
    const options = Object.fromEntries(next.optionGroups.filter((g:any) => g.type === 'single').map((g:any) => [g.id, g.choices[0].id]));
    const config = { productId, variantId: next.variants[0].id, options, note:'', label:'' };
    const base = priceLine(next, config, 1, shop.settings.halfToppingFactor).total;
    for (const choice of additions) for (const placement of ['whole', 'left', 'right']) {
      const priced = priceLine(next, {...config, options:{...options, toppings:{[choice.id]:placement}}}, 2, shop.settings.halfToppingFactor);
      const delta = placement === 'whole' ? choice.price : Math.ceil(choice.price * shop.settings.halfToppingFactor);
      if (priced.total !== (base + delta) * 2) throw Error('Server ingredient pricing mismatch');
    }
    writeFileSync(resolve(backupFile), JSON.stringify({shopId,productId,revision,before},null,2)+'\n', {flag:'wx',mode:0o600});
    await db.query("UPDATE products SET data=jsonb_set(data,ARRAY['optionGroups',$3::text,'choices'],$4::jsonb) WHERE shop_id=$1 AND id=$2", [shopId,productId,String(index),JSON.stringify(next.optionGroups[index].choices)]);
    const after = (await db.query('SELECT data FROM products WHERE shop_id=$1 AND id=$2', [shopId,productId])).rows[0].data;
    if (!isDeepStrictEqual(after,next)) throw Error('Unexpected catalog change');
    await audit(db,shopId,null,'demo_toppings_added:'+revision.slice(0,12),productId);
    return {added:additions.map((c:any)=>({id:c.id,name:c.name,price:c.price})),existingChoicesPreserved:true};
  });
  console.log(JSON.stringify(result));
} finally { await pool.end(); await platformPool.end(); }
