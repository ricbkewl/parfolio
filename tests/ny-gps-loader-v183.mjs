import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const payload=JSON.parse(read('data/ny-osm-gps-drafts-v159.json'));
const courses=Object.values(payload.courses).map(mapping=>({
  id:`opengolf-ny-${mapping.openGolfApiId}`,
  openGolfApiId:mapping.openGolfApiId,
  name:mapping.name,
  state:'NY',
  holes:mapping.playableHoles||18,
  greens:[],
  pars:[],
  catalogOnly:true
}));

const context={
  window:null,
  courses,
  fetch:async()=>({ok:true,json:async()=>payload}),
  console,
  setTimeout:()=>0,
  MutationObserver:function(){this.observe=()=>{}},
  document:{documentElement:{}},
  localStorage:{}
};
context.window=context;
vm.createContext(context);
vm.runInContext(read('ny-gps-draft-loader-v159.js'),context);
vm.runInContext(read('regional-auto-publish-v160.js'),context);

const loaded=await context.hydrateAllNyGpsGeometry();
const complete=courses.filter(course=>course.mappingStatus==='published').length;
const partial=courses.filter(course=>course.mappingStatus==='gps_draft').length;
const activeHoles=courses.reduce((sum,course)=>sum+course.greens.filter(hole=>hole?.tee&&hole?.center).length,0);

assert.equal(loaded,551);
assert.equal(complete,503,'complete 9/18-hole maps should publish');
assert.equal(partial,48,'incomplete maps should remain visibly partial');
assert.equal(activeHoles,8218,'geometry outside a declared 9-hole layout must not leak into play');
assert.deepEqual(
  JSON.parse(JSON.stringify(context.PARFOLIO_NY_GPS_GEOMETRY)),
  {...context.PARFOLIO_NY_GPS_GEOMETRY,version:183,sourceCourses:551,loaded:551,complete:503,partial:48,locationOnly:0}
);

console.log('NY GPS loader checks passed: 551 geometry courses; 503 complete and 48 partial.');
