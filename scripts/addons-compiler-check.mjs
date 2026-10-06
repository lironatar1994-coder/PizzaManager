import {readFileSync,writeFileSync,mkdirSync,cpSync,copyFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),platform=resolve(root,'../PizzaManagerPlatform');
const sources=[...(process.argv[2]?[resolve(process.argv[2])]:[]),join(platform,'storefront')];
const revision=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
const normalize=s=>s.replace(/\r\n/g,'\n').replace(/(\.\/[^'"\s]+\.js)\?[^'"\s]+/g,'$1');
const outcomes=[];
for(const [index,source] of sources.entries()){
 let previous=source;
 for(let pass=0;pass<2;pass++){
  const output=join(root,'.deploy','addons-compiler',`${index}-${pass}`),finalOutput=join(root,'.deploy','addons-compiler',`${index}-${pass}-product`);
  mkdirSync(join(output,'src'),{recursive:true});mkdirSync(join(output,'assets'),{recursive:true});
  cpSync(join(previous,'src'),join(output,'src'),{recursive:true});copyFileSync(join(previous,'index.html'),join(output,'index.html'));
  const result=spawnSync(process.execPath,['deploy/platform-storefront.mjs',root,previous,output,revision],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  cpSync(output,finalOutput,{recursive:true});
  const productBuild=spawnSync(process.execPath,['deploy/platform-product.mjs',root,output,finalOutput,revision],{cwd:root,encoding:'utf8'});assert.equal(productBuild.status,0,productBuild.stderr);
  const manifest=JSON.parse(readFileSync(join(finalOutput,'assets/menu-ui-version.json'),'utf8'));
  for(const [file,digest] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(readFileSync(join(finalOutput,file))).digest('hex'),digest,'Final menu artifact hash '+file);
  const app=readFileSync(join(finalOutput,'src/app.js'),'utf8');assert.equal((app.match(/addonFlow.menuMarkup/g)||[]).length,1);
  assert.ok(app.includes('products as catalogProducts'));assert.ok(app.includes('addonFlow.openStep({ line })'));
  for(const file of ['store.js','address.js','services.js','config-links.js'])assert.equal(normalize(readFileSync(join(finalOutput,'src',file),'utf8')),normalize(readFileSync(join(previous,'src',file),'utf8')),`Managed adapter changed: ${file}`);
  assert.ok(readFileSync(join(finalOutput,'src/store.js'),'utf8').includes('`pizza-${shop.id}-cart-v1`'));
  if(pass)assert.equal(normalize(app),normalize(readFileSync(join(previous,'src/app.js'),'utf8')),'Compilation is not idempotent');
  outcomes.push({source:index,pass,protectedAdapters:true,singleMenu:true,productCustomizer:true});previous=finalOutput;
 }
 const refusal=spawnSync(process.execPath,['deploy/platform-storefront.mjs',root,source,source,revision],{cwd:root,encoding:'utf8'});
 assert.notEqual(refusal.status,0);assert.match(refusal.stderr,/inactive storefront/);
}
writeFileSync(join(root,'.deploy','addons-compiler','result.json'),JSON.stringify({ok:true,outcomes,activeSourceRefused:true},null,2));
console.log(`Add-on compiler checks passed: ${outcomes.length} compilations, idempotence, tenant adapters and active-source refusal.`);
