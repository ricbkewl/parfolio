import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260907000000_parfolio_v220_course_images.sql',import.meta.url),'utf8');
const ca=fs.readFileSync(new URL('../california-catalog-v185.js',import.meta.url),'utf8');
const tx=fs.readFileSync(new URL('../texas-catalog-v191.js',import.meta.url),'utf8');
const id=fs.readFileSync(new URL('../indonesia-catalog-v197.js',import.meta.url),'utf8');

assert.match(app,/imageStatus!=='official_approved'/,'unapproved official photos must never render');
assert.match(app,/parsed\.protocol==='https:'/,'remote course photos and source links must require HTTPS');
assert.match(app,/new maps\.Map\(node,[\s\S]*mapTypeId:'satellite'/,'coordinate fallback must use Google satellite imagery');
assert.match(app,/catch\(\(\)=>streetFallback\(node\)\)/,'map failure must retain an OpenStreetMap fallback');
assert.match(migration,/course_catalog_approved_image_metadata_check/,'database must enforce complete approval metadata');
assert.match(migration,/image_status.*official_approved/s,'catalog RPC must return image approval status');
for(const [name,source] of [['California',ca],['Texas',tx],['Indonesia',id]]){
  assert.match(source,/imageStatus:row\.image_status/ ,`${name} loader must merge image approval status`);
  assert.match(source,/imageReviewedAt:row\.image_reviewed_at/,`${name} loader must merge review timestamp`);
}

console.log('course images v220 checks passed');
