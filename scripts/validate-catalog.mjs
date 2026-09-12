// Run before publishing: node scripts/validate-catalog.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=fs.existsSync(path.join(root,'dist/catalog.js'))?path.join(root,'dist'):root;
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(dir,'catalog.js'),'utf8'),context,{timeout:1000});
const catalog=context.window.CATALOG;
const registry=JSON.parse(fs.readFileSync(path.join(dir,'id-registry.json'),'utf8'));
const codes=new Set(catalog.categories.map(c=>c.code));
assert.equal(codes.size,catalog.categories.length,'Category codes must be unique');
const ids=new Set();
for(const p of catalog.products){
  assert(!ids.has(p.id),'Duplicate costume ID: '+p.id);ids.add(p.id);
  assert(codes.has(p.categoryCode),'Unknown category for '+p.id);
  assert.equal(registry[p.id],p.categoryCode,'ID must retain its registered category: '+p.id);
  assert(p.id.startsWith(p.categoryCode+'-'),'Category/ID mismatch: '+p.id);
  assert(p.rent===null||(typeof p.rent==='number'&&Number.isFinite(p.rent)&&p.rent>=0),'Invalid rent: '+p.id);
  assert([true,false,null].includes(p.available),'Availability must be true, false or null: '+p.id);
  assert.equal(typeof p.retired,'boolean','Retired flag must be boolean: '+p.id);
  if(p.image&&!/^https:\/\//.test(p.image))assert(fs.existsSync(path.join(dir,p.image)),'Missing photo: '+p.image);
}
for(const id of Object.keys(registry))assert(ids.has(id),'Do not delete an ID; retire the entry instead: '+id);
console.log('Valid: '+catalog.categories.length+' categories, '+ids.size+' permanent IDs.');
