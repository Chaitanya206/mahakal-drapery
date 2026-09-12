import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
// Exercise the actual compression utility with deterministic canvas/bitmap stand-ins.
// Pixel quality, EXIF appearance and real browser upload remain manual checks.
const raw=(await readFile(new URL('../src/images.ts',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
const js=ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {compressImage}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('compression rejects unsupported files and oversized originals',async()=>{await assert.rejects(()=>compressImage({type:'image/svg+xml',size:100}),/JPG/);await assert.rejects(()=>compressImage({type:'image/jpeg',size:26*1024*1024}),/25 MB/);});
test('compression bounds longest edge to 1800, uses WebP 85%, releases bitmap',async()=>{let closed=false,canvas;globalThis.createImageBitmap=async()=>({width:4000,height:3000,close(){closed=true;}});globalThis.document={createElement(){return canvas={getContext(){return {drawImage(){}};},toBlob(callback,type,quality){assert.equal(type,'image/webp');assert.equal(quality,.85);callback(new Blob(['compressed'],{type}));}};}};const result=await compressImage({type:'image/jpeg',size:10000});assert.equal(canvas.width,1800);assert.equal(canvas.height,1350);assert.equal(result.type,'image/webp');assert.ok(closed);});
