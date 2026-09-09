import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const audit=JSON.parse(read('data/tn-osm-gps-v255.json'));
if(Array.isArray(audit.courseShards)){
  audit.courses={};
  for(const shard of audit.courseShards)Object.assign(audit.courses,JSON.parse(read(`data/${shard}`)));
}
const all=Object.values(audit.courses||{});
const validPoint=point=>point&&Number.isFinite(Number(point.lat))&&Number.isFinite(Number(point.lng))&&Math.abs(Number(point.lat))<=90&&Math.abs(Number(point.lng))<=180&&!(Number(point.lat)===0&&Number(point.lng)===0);

assert.equal(audit.rawTennesseeRows,80);
assert.equal(audit.auditedCourses,181);
assert.equal(all.length,181);
assert.equal(all.filter(course=>course.mappingClass==='gps_ready').length,55);
assert.equal(all.filter(course=>course.mappingClass==='partial_gps').length,21);
assert.equal(all.filter(course=>course.mappingClass==='course_located').length,89);
assert.equal(all.filter(course=>course.mappingClass==='location_pending').length,0);
assert.equal(all.filter(course=>course.mappingClass==='quarantined').length,16);
assert.equal(all.reduce((sum,course)=>sum+course.mappedHoleCount,0),1396);
assert.equal(audit.rejectedRecords.length,0);
assert.equal(audit.duplicateRecords.length,15);
assert.equal(audit.failedTiles.length,0);
assert.ok(all.every(course=>validPoint({lat:course.latitude,lng:course.longitude})));

for(const course of all){
  const holes=course.greens||[];
  assert.equal(new Set(holes.map(hole=>hole.hole)).size,holes.length,`${course.name} has duplicate stored hole numbers`);
  for(const hole of holes){
    assert.ok(validPoint(hole.tee),`${course.name} hole ${hole.hole} has an invalid tee`);
    assert.ok(validPoint(hole.center),`${course.name} hole ${hole.hole} has an invalid green center`);
    for(const optional of ['aim1','aim2','front','back'])if(hole[optional])assert.ok(validPoint(hole[optional]),`${course.name} hole ${hole.hole} has invalid ${optional}`);
    assert.ok(hole.yards>=45&&hole.yards<=850,`${course.name} hole ${hole.hole} has implausible distance`);
    assert.equal(hole.route?.type,'LineString');
    assert.ok(Array.isArray(hole.route?.coordinates)&&hole.route.coordinates.length>=2);
  }
  if(course.mappingClass==='gps_ready'){
    assert.ok([9,18].includes(course.playableHoles));
    assert.deepEqual(course.numberedHoles,Array.from({length:course.playableHoles},(_,index)=>index+1));
    assert.equal(holes.length,course.playableHoles);
    assert.equal(course.issues.length,0);
    assert.equal(course.ambiguousBoundary,false);
    assert.equal(course.sharedBoundary,false);
  }
  if(course.mappingClass==='partial_gps')assert.ok(holes.length>0);
  if(course.mappingClass==='course_located')assert.equal(holes.length,0);
  if(course.mappingClass==='quarantined')assert.ok(holes.length>0);
}

const rows=[
  {catalog_id:'a',source_id:'1',name:'Ready Club',city:'Nashville',state_code:'TN',lat:36,lng:-86,holes:18,mapping_class:'gps_ready',mapped_holes:18},
  {catalog_id:'b',source_id:'2',name:'Partial Club',city:'Knoxville',state_code:'TN',lat:36,lng:-84,holes:18,mapping_class:'partial_gps',mapped_holes:7},
  {catalog_id:'c',source_id:'3',name:'Located Club',city:'Memphis',state_code:'TN',lat:35,lng:-90,holes:null,mapping_class:'course_located',mapped_holes:0},
  {catalog_id:'d',source_id:'4',name:'Review Club',city:'Chattanooga',state_code:'TN',lat:35,lng:-85,holes:null,mapping_class:'quarantined',mapped_holes:12}
];
const greens=Array.from({length:18},(_,index)=>({hole:index+1,tee:{lat:36+index/1000,lng:-86},center:{lat:36+index/1000+.001,lng:-86},par:4,route:{type:'LineString',coordinates:[[-86,36],[-86,36.001]]}}));
const context={
  window:null,courses:[],console,localStorage:{},document:{},
  setTimeout:callback=>{Promise.resolve().then(callback);return 0;},render:()=>{},mappedCount:()=>0,startCourseFromLibrary:index=>index,
  db:{rpc:async(name,args)=>{
    if(name==='parfolio_course_catalog_page')return{data:args.p_offset===0?rows:[],error:null};
    if(name==='parfolio_course_payload')return{data:{holes:18,greens},error:null};
    throw new Error(name);
  }}
};
context.window=context;
vm.createContext(context);
vm.runInContext(read('tennessee-catalog-v255.js'),context);
await context.loadParFolioTennesseeCatalog();
assert.deepEqual(
  {rows:context.PARFOLIO_TN_CATALOG.rows,ready:context.PARFOLIO_TN_CATALOG.gpsReady,partial:context.PARFOLIO_TN_CATALOG.partialGps,located:context.PARFOLIO_TN_CATALOG.courseLocated,quarantined:context.PARFOLIO_TN_CATALOG.quarantined},
  {rows:4,ready:1,partial:1,located:1,quarantined:1}
);
assert.equal(context.mappedCount(context.courses.find(course=>course.openGolfApiId==='1')),18);
assert.equal(context.mappedCount(context.courses.find(course=>course.openGolfApiId==='2')),7);
assert.equal(context.mappedCount(context.courses.find(course=>course.openGolfApiId==='3')),0);
const ready=context.courses.find(course=>course.openGolfApiId==='1');
await context.hydrateParFolioTennesseeCourse(ready);
assert.equal(ready.greens.length,18);
assert.ok(ready.greens.every(hole=>hole.tee&&hole.center));
assert.equal(ready.catalogOnly,false);

const html=read('index.html'),sw=read('service-worker.js'),vector=read('parfolio-google-vector-v149.js');
assert.match(html,/tennessee-catalog-v255\.js\?v=255/);
assert.match(sw,/parfolio-v255-/);
assert.match(sw,/\.\/tennessee-catalog-v255\.js/);
assert.match(vector,/new URL\('\.\/parfolio-public-config\.json',document\.baseURI\)/);\nassert.doesNotMatch(vector,/script\.src='\/api\/runtime-config/);\nassert.match(html,/parfolio-google-vector-v149\.js\?v=256/);\nassert.match(sw,/parfolio-v256-/);\nassert.match(read('play-camera-v137.js'),/heading:bearingDegrees\(tee,green\.center\)/);
assert.match(read('hole-flyover-v129.js'),/const FLYOVER_MS=2750/);
assert.match(read('course-corrections-v147.js'),/submit_parfolio_course_correction/);
assert.match(read('course-corrections-v147.js'),/p_source_app:'parfolio'/);

console.log('Tennessee v255 data, loader, correction, camera, and flyover checks passed.');
