import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const rows=[
  {id:'a',source_id:'osm-a',name:'Ready Indonesia Club',city:'Jakarta',country_code:'ID',latitude:-6.2,longitude:106.8,holes:18,mapping_class:'gps_ready',osm_course_uri:'https://www.openstreetmap.org/way/1'},
  {id:'b',source_id:'osm-b',name:'Partial Indonesia Club',city:'Bandung',country_code:'ID',latitude:-6.9,longitude:107.6,holes:null,mapping_class:'partial_gps',osm_course_uri:'https://www.openstreetmap.org/way/2'},
  {id:'c',source_id:'osm-c',name:'Located Indonesia Club',city:'Surabaya',country_code:'ID',latitude:-7.2,longitude:112.7,holes:null,mapping_class:'course_located',osm_course_uri:'https://www.openstreetmap.org/way/3'},
  {id:'d',source_id:'osm-d',name:'Review Indonesia Club',city:'Bali',country_code:'ID',latitude:-8.6,longitude:115.2,holes:null,mapping_class:'quarantined',osm_course_uri:'https://www.openstreetmap.org/way/4'}
];
const greens=Array.from({length:18},(_,i)=>({hole:i+1,tee:{lat:-6.2+i/1000,lng:106.8},center:{lat:-6.199+i/1000,lng:106.8},par:4,route:{type:'LineString',coordinates:[[106.8,-6.2],[106.8,-6.199]]}}));

function queryBuilder(){
  const q={select(){return q;},eq(){return q;},is(){return q;},async range(from){return{data:from===0?rows:[],error:null};}};
  return q;
}
const context={
  window:null,courses:[],console,localStorage:{},document:{},
  setTimeout:fn=>{Promise.resolve().then(fn);return 0;},render:()=>{},mappedCount:()=>0,startCourseFromLibrary:index=>index,
  db:{from:name=>{assert.equal(name,'course_catalog');return queryBuilder();},rpc:async(name)=>{
    if(name==='parfolio_course_payload')return{data:{holes:18,greens},error:null};
    throw new Error(name);
  }}
};
context.window=context;
vm.createContext(context);
vm.runInContext(read('indonesia-catalog-v197.js'),context);
await context.loadParFolioIndonesiaCatalog();
assert.equal(context.PARFOLIO_ID_CATALOG.rows,4);
assert.equal(context.PARFOLIO_ID_CATALOG.gpsReady,1);
assert.equal(context.PARFOLIO_ID_CATALOG.partialGps,1);
assert.equal(context.PARFOLIO_ID_CATALOG.courseLocated,1);
assert.equal(context.PARFOLIO_ID_CATALOG.quarantined,1);
const ready=context.courses.find(c=>c.parfolioCatalogId==='a');
const partial=context.courses.find(c=>c.parfolioCatalogId==='b');
const located=context.courses.find(c=>c.parfolioCatalogId==='c');
assert.equal(ready.country,'Indonesia');
assert.equal(ready.country_code,'ID');
assert.equal(context.mappedCount(ready),18);
assert.equal(context.mappedCount(partial),1);
assert.equal(context.mappedCount(located),0);
await context.hydrateParFolioIndonesiaCourse(ready);
assert.equal(ready.greens.length,18);
assert.ok(ready.greens.every(g=>g.tee&&g.center));
assert.equal(ready.catalogOnly,false);
console.log('Indonesia catalog v197 checks passed.');
