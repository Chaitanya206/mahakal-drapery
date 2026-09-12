import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Product, Photo, Availability } from './types';
let adminClient: SupabaseClient | undefined;
let publicClient: SupabaseClient | undefined;
export const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export function db(publicOnly = false): SupabaseClient {
  if (!configured) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild the application.');
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key.startsWith('sb_secret_')) throw new Error('Use a Supabase publishable key, never a secret key.');
  if (publicOnly) return publicClient ??= createClient(import.meta.env.VITE_SUPABASE_URL, key, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'mahakal-public'}});
  return adminClient ??= createClient(import.meta.env.VITE_SUPABASE_URL, key);
}
export const states: Availability[] = ['Available','Rented','Unavailable','Coming Soon'];
export const selectProduct = '*,category:categories!inner(*),images:product_images(*)';
export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const s=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
export function failure(error:unknown):string {
  const message = error instanceof Error ? error.message : typeof error==='object' && error && 'message' in error ? String(error.message) : String(error);
  return message.includes('EDIT_CONFLICT') ? 'This product changed in another session. Reload it before saving again.' : message;
}
export async function photos(items:Product[], publicOnly=false) {
  const paths=[...new Set(items.flatMap(p=>p.images.map(i=>i.path)))];
  const urls=new Map<string,string>();
  // Sign in bounded batches; private objects remain subject to Storage RLS.
  for(let i=0;i<paths.length;i+=100){
    const {data,error}=await db(publicOnly).storage.from('product-images').createSignedUrls(paths.slice(i,i+100),600);
    if(error) throw error;
    for(const image of data??[]) if(image.path && image.signedUrl) urls.set(image.path,image.signedUrl);
  }
  return items.map(p=>({...p,images:p.images.sort((a,b)=>a.sort_order-b.sort_order).map(i=>({...i,url:urls.get(i.path)}))}));
}
export async function product(id:string, publicOnly=false, bySlug=false) {
  let q=db(publicOnly).from('products').select(selectProduct).eq(bySlug?'slug':'id',id);
  if(publicOnly) q=q.eq('published',true).eq('category.active',true);
  const {data,error}=await q.maybeSingle(); if(error) throw error;
  return data ? (await photos([data as unknown as Product],publicOnly))[0] : null;
}
export type Filters = { search?:string; category?:string; availability?:string; sort?:string; min?:string; max?:string; size?:string; color?:string; publication?:string; page?:number };
export async function products(filters:Filters={},publicOnly=false) {
  let q=db(publicOnly).from('products').select(selectProduct,{count:'exact'});
  if(publicOnly) q=q.eq('published',true).eq('category.active',true);
  if(filters.search?.trim()) q=q.textSearch('search_document',filters.search.trim(),{config:'simple',type:'websearch'});
  if(filters.category) q=q.eq('category_id',filters.category);
  if(filters.availability) q=q.eq('availability',filters.availability);
  if(filters.publication) q=q.eq('published',filters.publication==='published');
  if(filters.min) q=q.gte('price',Number(filters.min)); if(filters.max) q=q.lte('price',Number(filters.max));
  if(filters.size) q=q.contains('sizes',[filters.size.trim()]); if(filters.color) q=q.contains('colors',[filters.color.trim()]);
  const sorting=filters.sort||'new';
  q=q.order(sorting==='name'?'name':sorting.startsWith('price')?'price':'created_at',{ascending:sorting==='name'||sorting==='price-up',nullsFirst:false}).order('id');
  const page=filters.page??0;
  const {data,count,error}=await q.range(page*24,page*24+23); if(error) throw error;
  return {items:await photos(data as unknown as Product[],publicOnly),count:count??0};
}
export async function categories(publicOnly=false) {
  let q=db(publicOnly).from('categories').select('*').order('sort_order').order('code');
  if(publicOnly) q=q.eq('active',true);
  const {data,error}=await q; if(error) throw error; return data;
}
export async function settings(publicOnly=false) {
  const {data,error}=await db(publicOnly).from('settings').select('*').eq('id',true).single(); if(error) throw error; return data;
}
export async function requireAdmin() {
  const client=db(); const {data,error}=await client.auth.getUser(); if(error) throw error;
  if(!data.user) throw new Error('Please sign in.');
  const {data:allowed,error:denied}=await client.rpc('is_admin'); if(denied) throw denied;
  if(!allowed) throw new Error('This account is not an administrator. Contact the shop owner.');
  return data.user;
}
const cleanupKey='mahakal-pending-image-cleanup';
function pending():string[] {try{return JSON.parse(localStorage.getItem(cleanupKey)||'[]');}catch{return [];}}
function remember(paths:string[]) {localStorage.setItem(cleanupKey,JSON.stringify([...new Set(paths)]));}
export function trackUploads(paths:string[]) {remember([...pending(),...paths]);}
export function forgetUploads(paths:string[]) {remember(pending().filter(p=>!paths.includes(p)));}
export async function cleanup(paths:string[]) {
  const unique=[...new Set(paths)]; if(!unique.length) return;
  trackUploads(unique);
  for(let i=0;i<unique.length;i+=100){
    const batch=unique.slice(i,i+100);
    const {data,error}=await db().from('product_images').select('path').in('path',batch); if(error) throw error;
    const used=new Set(data.map(x=>x.path)); const unused=batch.filter(p=>!used.has(p));
    if(unused.length){const {error:removeError}=await db().storage.from('product-images').remove(unused);if(removeError) throw removeError;}
    forgetUploads(batch);
  }
}
export async function retryCleanup(){await cleanup(pending());}
export async function deleteProduct(p:Product) {
  // Remember paths before the database delete so cleanup can be retried if interrupted.
  trackUploads(p.images.map(i=>i.path));
  const {data,error}=await db().from('products').delete().eq('id',p.id).eq('updated_at',p.updated_at).select('id');
  if(error) throw error; if(!data.length) throw new Error('Product changed or was already deleted. Refresh and try again.');
  changed();
  try {await cleanup(p.images.map(i=>i.path));return '';} catch(e){return 'Product deleted. Image cleanup needs retry: '+failure(e);}
}
export async function setAvailability(p:Product,availability:Availability) {
  const {data,error}=await db().from('products').update({availability}).eq('id',p.id).eq('updated_at',p.updated_at).select('id');
  if(error) throw error; if(!data.length) throw new Error('Product changed. Refresh and try again.'); changed();
}
export function changed(){window.dispatchEvent(new Event('catalog-changed'));const channel=new BroadcastChannel('mahakal-catalog');channel.postMessage('changed');channel.close();}
export function watchChanges(refresh:()=>void,publicOnly=false) {
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  const channel=new BroadcastChannel('mahakal-catalog');channel.onmessage=visible;
  let realtime=db(publicOnly).channel('catalog-'+uuid());
  for(const table of ['products','product_images','categories','settings']) realtime=realtime.on('postgres_changes',{event:'*',schema:'public',table},visible);
  realtime.subscribe(); const timer=setInterval(visible,15000);
  window.addEventListener('focus',visible);window.addEventListener('catalog-changed',visible);document.addEventListener('visibilitychange',visible);
  return ()=>{clearInterval(timer);channel.close();void db(publicOnly).removeChannel(realtime);window.removeEventListener('focus',visible);window.removeEventListener('catalog-changed',visible);document.removeEventListener('visibilitychange',visible);};
}
export function money(p:Pick<Product,'price'|'price_type'>) {return p.price_type==='Contact for Price'||p.price==null?'Contact for price':new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(p.price);}
