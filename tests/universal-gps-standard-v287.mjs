import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const loader=read('universal-gps-course-loader-v287.js'),start=read('single-course-start-confirm-v199.js'),html=read('index.html'),sw=read('service-worker.js');

assert.match(loader,/p_state_code:null/,'the catalog must load every region through one RPC');
assert.match(loader,/parfolio_course_payload/,'GPS play must use the authoritative payload RPC');
assert.match(loader,/yards<20\|\|yards>1000/,'every hole needs a distance sanity check');
assert.match(start,/await window\.ensureParFolioGpsCourseReady\(course\)/,'course start must await the universal gate');
assert.ok(html.indexOf('universal-gps-course-loader-v287.js')<html.indexOf('single-course-start-confirm-v199.js'),'the universal gate must load before the final start handler');
assert.match(sw,/parfolio-v287-/);assert.match(sw,/\.\/universal-gps-course-loader-v287\.js/);

const allowedStartFiles=new Set(['app.js','california-catalog-v185.js','texas-catalog-v191.js','tennessee-catalog-v255.js','indonesia-catalog-v197.js','offline-courses-v193.js','smart-course-search-v176-fix.js','single-course-start-confirm-v199.js']);
for(const file of fs.readdirSync(root).filter(file=>file.endsWith('.js'))){
  if(allowedStartFiles.has(file))continue;
  assert.doesNotMatch(read(file),/(?:window\.)?startCourseFromLibrary\s*=/,`${file} adds a forbidden course-start wrapper; route every new region through the universal loader`);
}

const rows=[
  {catalog_id:'tn-ready',source_id:'tn-1',name:'Tennessee Ready',city:'Nashville',state_code:'TN',country_code:'US',holes:9,mapping_class:'gps_ready',mapped_holes:9,lat:36,lng:-86},
  {catalog_id:'future-ready',source_id:'future-1',name:'Future Region Ready',city:'Future City',state_code:'ZZ',country_code:'US',holes:9,mapping_class:'gps_ready',mapped_holes:9,lat:40,lng:-80}
];
const greens=Array.from({length:9},(_,index)=>({hole:index+1,par:4,tee:{lat:36+index/100,lng:-86},center:{lat:36.003+index/100,lng:-86},aim1:null,aim2:null,front:null,back:null,route:null,source:'test'}));
let catalogArgs=null,payloadCalls=0;
const context={window:null,courses:[],console:{...console,warn:()=>{}},document:{},localStorage:{},render:()=>{},setTimeout:()=>0,
  db:{rpc:async(name,args)=>{if(name==='parfolio_course_catalog_page'){catalogArgs=args;return{data:args.p_offset?[]:rows,error:null}}if(name==='parfolio_course_payload'){payloadCalls++;return{data:{catalog_id:args.p_course_id,holes:9,mapping_class:'gps_ready',greens},error:null}}throw new Error(name)}}};
context.window=context;vm.createContext(context);vm.runInContext(loader,context);
await context.loadParFolioUniversalCatalog();
assert.equal(catalogArgs.p_state_code,null);assert.equal(context.courses.length,2,'a future state must load without new JavaScript');
const future=context.courses.find(course=>course.state==='ZZ');await context.ensureParFolioGpsCourseReady(future);
assert.equal(payloadCalls,1);assert.equal(future.parfolioGeometryVersion,287);assert.equal(future.greens.length,9);assert.equal(future.catalogOnly,false);
await context.ensureParFolioGpsCourseReady(future);assert.equal(payloadCalls,1,'authoritative payload should be fetched once per course per session');

const bad={...future,parfolioCatalogId:'bad',greens:[],parfolioGeometryVersion:0};
context.db.rpc=async()=>({data:{catalog_id:'bad',holes:9,mapping_class:'gps_ready',greens:greens.map((hole,index)=>index?hole:{...hole,tee:{lat:0,lng:0}})},error:null});
await assert.rejects(()=>context.ensureParFolioGpsCourseReady(bad),/valid tee or green center/);

const stale={...future,parfolioCatalogId:'stale',parfolioGeometryVersion:287};
context.db.rpc=async()=>({data:{catalog_id:'stale',holes:9,mapping_class:'gps_ready',greens:greens.map((hole,index)=>index?hole:{...hole,center:{lat:0,lng:0}})},error:null});
await assert.rejects(()=>context.ensureParFolioGpsCourseReady(stale),/valid tee or green center/,'bad authoritative geometry cannot fall back to cached geometry');
const offline={...future,parfolioCatalogId:'offline',parfolioGeometryVersion:287};
context.db.rpc=async()=>({data:null,error:new Error('Network unavailable')});
assert.equal(await context.ensureParFolioGpsCourseReady(offline),true,'network failure may use current-version validated offline geometry');
const shared={...future,parfolioCatalogId:null,parfolioMappingClass:null,sharedMappingStatus:'published'};
assert.equal(await context.ensureParFolioGpsCourseReady(shared),true,'published shared courses must use the same validator');
assert.equal(shared.parfolioGeometryVersion,287);
await assert.rejects(()=>context.ensureParFolioGpsCourseReady({...shared,greens:[]}),/failed validation/);

context.db.rpc=async()=>({data:{catalog_id:'bad',holes:9,mapping_class:'gps_ready',greens:greens.map((hole,index)=>index?hole:{...hole,tee:{lat:0,lng:0}})},error:null});

let selected=false,warning='';
const startContext={...context,courses:[bad],confirm:()=>true,alert:message=>{warning=message},currentUser:{id:'golfer-1'},golferProfile:{first_name:'Rick'},
  roundDefault:{v:'home',players:[],scores:{},putts:{},pars:[]},s:{v:'home'},rememberRecentCourse:()=>{},save:()=>{},
  chooseCourse:()=>{selected=true},mappedCount:()=>9,startCourseFromLibrary:()=>{selected=true}};
startContext.window=startContext;startContext.ensureParFolioGpsCourseReady=context.ensureParFolioGpsCourseReady;
vm.createContext(startContext);vm.runInContext(start,startContext);await startContext.startCourseFromLibrary(0);
assert.equal(selected,false,'invalid GPS geometry must never reach course selection or Google Maps');
assert.match(warning,/validated hole map could not be loaded/);

console.log('Universal GPS course-loading standard v287 checks passed.');
