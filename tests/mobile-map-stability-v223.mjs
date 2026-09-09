import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js');
const camera=read('play-camera-v137.js');
const play=read('play-v108.js');
const publish=read('regional-auto-publish-v160.js');
const gpsSearch=read('gps-search-priority-v186.js');
const offline=read('offline-courses-v193.js');
const health=read('google-maps-health-v215.js');

assert.doesNotMatch(publish,/new MutationObserver/,'catalog publication must not react to Google Maps DOM mutations');
assert.match(publish,/alreadyPublished/,'catalog publication must be idempotent');
assert.match(gpsSearch,/s\?\.v!==['"]coursesView['"]/,'GPS search observer must stay out of the playing view');
assert.match(offline,/if\(playing\)return/,'offline decoration must stop before scanning course rows during play');
assert.match(offline,/decoratePending/,'offline decoration must coalesce mutation bursts');
assert.doesNotMatch(health,/document\.body\?\.innerText/,'map health checks must not scan the full page on every map mutation');
assert.doesNotMatch(health,/characterData:true/,'map health observer must ignore Google label text churn');

assert.doesNotMatch(play,/forceMaxGoogleTilt|setTimeout\(\(\)=>forceMaxGoogleTilt/,'legacy play layer must not compete with the camera controller');
assert.match(camera,/const appliedCamera=new WeakMap/,'camera changes must be deduplicated per map instance');
assert.match(camera,/applyParFolioHoleCamera/,'the play view needs one authoritative camera controller');
assert.doesNotMatch(camera,/setTimeout\(apply/,'camera controller must not schedule competing delayed moves');
assert.doesNotMatch(camera,/origin&&target\?bearingDegrees/,'GPS updates must not rotate the fixed tee-to-green camera');

assert.match(app,/function refreshLiveRoundUi\(/,'live score updates need an in-place UI refresh');
assert.match(app,/activeView==='round'&&refreshLiveRoundUi\(\)/,'Realtime and reconnect updates must preserve the active map');
assert.match(app,/window\.applyParFolioHoleCamera\(green,true\)/,'initial view and recenter must use the authoritative camera');
const cacheVersion=Number(read('service-worker.js').match(/parfolio-v(\d+)-/)?.[1]);
assert.ok(cacheVersion>=224,'Safari stability fix must remain active in a non-regressed cache');
assert.doesNotMatch(read('index.html'),/\?v=223/,'the page must not reference stale v223 assets');

let catalogWrites=0;
const timers=[];
const publicationContext={
  window:null,
  courses:[{state:'NY',holes:9,greens:Array.from({length:9},()=>({tee:{lat:1,lng:1},center:{lat:2,lng:2}}))}],
  localStorage:new Proxy({}, {set(target,key,value){catalogWrites++;target[key]=value;return true}}),
  setTimeout:callback=>{timers.push(callback);return timers.length}
};
publicationContext.window=publicationContext;
vm.createContext(publicationContext);
vm.runInContext(publish,publicationContext);
for(const callback of timers)callback();
assert.equal(catalogWrites,1,'repeated publication sweeps must serialize the catalog only once');
assert.equal(publicationContext.autoPublishRegionalGps(),0,'an unchanged published catalog must be a no-op');
assert.equal(catalogWrites,1,'a no-op publication must not rewrite localStorage');

console.log('Mobile map stability checks passed: observers, camera, Realtime refresh and cache are bounded.');
