import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const legacyGreens=Array.from({length:18},(_,i)=>({
  tee:{lat:33.974+i/10000,lng:-117.437},
  center:{lat:33.975+i/10000,lng:-117.436},
  _review:'published-gps'
}));
const authoritativeGreens=Array.from({length:18},(_,i)=>({
  hole:i+1,
  tee:{lat:33.976+i/10000,lng:-117.438},
  center:{lat:33.979+i/10000,lng:-117.434},
  par:4,
  source:'openstreetmap_qlever'
}));
const rows=[{
  catalog_id:'bca70a76-0e8f-489d-acee-0d703772921c',
  source_id:'575474c1-f7e7-437d-a798-32277bf82a51',
  name:'Jurupa Hills Country Club',city:'Riverside',state_code:'CA',
  lat:33.9746831,lng:-117.4392759,holes:18,mapping_class:'gps_ready',mapped_holes:18
}];
let payloadCalls=0;
const context={
  window:null,console,localStorage:{},
  courses:[{id:'catalog-jurupa-hills',name:'Jurupa Hills Country Club',city:'Riverside',holes:18,gps_key:'jurupa',greens:legacyGreens}],
  document:{documentElement:{},querySelectorAll:()=>[]},
  MutationObserver:class{observe(){}},requestAnimationFrame:fn=>fn(),
  setTimeout:fn=>{Promise.resolve().then(fn);return 0;},render:()=>{},mappedCount:()=>0,startCourseFromLibrary:index=>index,alert:()=>{},
  db:{rpc:async(name,args)=>{
    if(name==='parfolio_course_catalog_page')return{data:args.p_offset===0?rows:[],error:null};
    if(name==='parfolio_course_payload'){payloadCalls++;return{data:{holes:18,greens:authoritativeGreens},error:null};}
    throw new Error(name);
  }}
};
context.window=context;
vm.createContext(context);
vm.runInContext(read('california-catalog-v185.js'),context);
await context.loadParFolioCaliforniaCatalog();

const jurupa=context.courses.find(course=>course.name==='Jurupa Hills Country Club');
assert.equal(jurupa.parfolioPreferCatalogGeometry,true);
assert.equal(jurupa.parfolioPreservedVerifiedGeometry,false);
assert.equal(jurupa.greens.length,0);

await context.hydrateParFolioCaliforniaCourse(jurupa);
assert.equal(payloadCalls,1);
assert.equal(jurupa.greens.length,18);
assert.equal(jurupa.greens[14].tee.lat,authoritativeGreens[14].tee.lat);
assert.equal(jurupa.greens[14]._review,'parfolio-california-osm-validated');
assert.equal(jurupa.parfolioPreferCatalogGeometry,false);
assert.equal(jurupa.parfolioPreservedVerifiedGeometry,true);

await context.hydrateParFolioCaliforniaCourse(jurupa);
assert.equal(payloadCalls,1);
console.log('California authoritative GPS geometry regression checks passed.');

let resumedPayloadCalls=0;
const resumed={
  window:null,console,localStorage:{},
  courses:[{id:'catalog-jurupa-hills',name:'Jurupa Hills Country Club',city:'Riverside',holes:18,gps_key:'jurupa',greens:legacyGreens}],
  document:{documentElement:{},querySelectorAll:()=>[]},
  MutationObserver:class{observe(){}},requestAnimationFrame:fn=>fn(),
  setTimeout:fn=>{Promise.resolve().then(fn);return 0;},render:()=>{},mappedCount:()=>0,startCourseFromLibrary:index=>index,alert:()=>{},
  db:{rpc:async(name,args)=>{
    if(name==='parfolio_course_catalog_page')return{data:args.p_offset===0?rows:[],error:null};
    if(name==='parfolio_course_payload'){resumedPayloadCalls++;return{data:{holes:18,greens:authoritativeGreens},error:null};}
    throw new Error(name);
  }}
};
resumed.window=resumed;
resumed.selectedRoundCourse=()=>resumed.courses.find(course=>course.name==='Jurupa Hills Country Club');
vm.createContext(resumed);
vm.runInContext(read('california-catalog-v185.js'),resumed);
await resumed.loadParFolioCaliforniaCatalog();
const resumedJurupa=resumed.selectedRoundCourse();
assert.equal(resumedPayloadCalls,1);
assert.equal(resumedJurupa.greens[14].tee.lat,authoritativeGreens[14].tee.lat);
assert.equal(resumedJurupa.parfolioPreferCatalogGeometry,false);
console.log('California resumed-round GPS refresh checks passed.');
