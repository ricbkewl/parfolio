import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const rows=[
  {catalog_id:'a',source_id:'1',name:'Ready Club',city:'Austin',state_code:'TX',lat:30,lng:-97,holes:18,mapping_class:'gps_ready',mapped_holes:18},
  {catalog_id:'b',source_id:'2',name:'Partial Club',city:'Dallas',state_code:'TX',lat:32,lng:-96,holes:null,mapping_class:'partial_gps',mapped_holes:7},
  {catalog_id:'c',source_id:'3',name:'Located Club',city:'Waco',state_code:'TX',lat:31,lng:-97,holes:null,mapping_class:'course_located',mapped_holes:0},
  {catalog_id:'d',source_id:'4',name:'Review Club',city:'Tyler',state_code:'TX',lat:32,lng:-95,holes:null,mapping_class:'quarantined',mapped_holes:0}
];
const greens=Array.from({length:18},(_,i)=>({hole:i+1,tee:{lat:30+i/1000,lng:-97},center:{lat:30+i/1000+.001,lng:-97},par:4,route:{type:'LineString',coordinates:[[-97,30],[-97,30.001]]}}));
const context={
  window:null,courses:[],console,localStorage:{},document:{},
  setTimeout:fn=>{Promise.resolve().then(fn);return 0;},render:()=>{},mappedCount:()=>0,startCourseFromLibrary:index=>index,
  db:{rpc:async(name,args)=>{
    if(name==='parfolio_course_catalog_page')return{data:args.p_offset===0?rows:[],error:null};
    if(name==='parfolio_course_payload')return{data:{holes:18,greens},error:null};
    throw new Error(name);
  }}
};
context.window=context;
vm.createContext(context);
vm.runInContext(read('texas-catalog-v191.js'),context);
await context.loadParFolioTexasCatalog();
assert.equal(context.PARFOLIO_TX_CATALOG.rows,4);
assert.equal(context.PARFOLIO_TX_CATALOG.gpsReady,1);
assert.equal(context.PARFOLIO_TX_CATALOG.partialGps,1);
assert.equal(context.PARFOLIO_TX_CATALOG.courseLocated,1);
assert.equal(context.PARFOLIO_TX_CATALOG.quarantined,1);
assert.equal(context.mappedCount(context.courses.find(c=>c.openGolfApiId==='1')),18);
assert.equal(context.mappedCount(context.courses.find(c=>c.openGolfApiId==='2')),7);
assert.equal(context.mappedCount(context.courses.find(c=>c.openGolfApiId==='3')),0);
const ready=context.courses.find(c=>c.openGolfApiId==='1');
await context.hydrateParFolioTexasCourse(ready);
assert.equal(ready.greens.length,18);
assert.ok(ready.greens.every(g=>g.tee&&g.center));
assert.equal(ready.catalogOnly,false);
console.log('Texas catalog v191 checks passed.');
