// Read-only live smoke check. Uses only the publishable key from local environment.
// This script NEVER signs in, writes inventory, uploads files, or alters schemas.
import { createServer } from 'vite';
import assert from 'node:assert/strict';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const api=await server.ssrLoadModule('/src/api.ts');
 const categories=await api.categories(true);console.log('PASS: anonymous category read:',categories.length);
 const settings=await api.settings(true);assert.ok(settings.business_name);console.log('PASS: anonymous shop settings read');
 const {items,count}=await api.products({},true);console.log('PASS: public product read:',count);
 if(!items.length){console.log('SKIP: no published product available for search/detail/image checks');}
 else{
  const first=items[0];const detail=await api.product(first.slug,true,true);assert.equal(detail.id,first.id);console.log('PASS: product detail lookup by slug');
  const found=await api.products({search:first.costume_id,category:first.category_id,availability:first.availability},true);assert.ok(found.items.some(p=>p.id===first.id));console.log('PASS: ID search + category + availability filters');
  for(const image of detail.images){assert.ok(image.url,'Missing signed URL');const response=await fetch(image.url,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);assert.ok(response.headers.get('content-type')?.startsWith('image/'));const bytes=await response.arrayBuffer();assert.ok(bytes.byteLength>0);}
  console.log('PASS: signed private image reads:',detail.images.length);
 }
 const {error}=await api.db(true).rpc('save_product',{payload:{}});assert.ok(error);console.log('PASS: anonymous product-save RPC rejected');
}finally{await server.close();}
