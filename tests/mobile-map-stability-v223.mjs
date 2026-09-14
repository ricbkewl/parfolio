import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js');
const html=read('index.html');
const camera=read('parfolio-camera-flyover-v270.js');
const googleClean=read('google-maps-clean-v269.js');
const publish=read('regional-auto-publish-v160.js');
const gpsSearch=read('gps-search-priority-v186.js');
const offline=read('offline-courses-v193.js');
const roundCss=read('round-full-bleed-v280.css');

assert.doesNotMatch(publish,/new MutationObserver/,'catalog publication must not react to Google Maps DOM mutations');
assert.match(publish,/alreadyPublished/,'catalog publication must be idempotent');
assert.match(gpsSearch,/s\?\.v!==['"]coursesView['"]/,'GPS search observer must stay out of the playing view');
assert.match(offline,/if\(!inCoursesArea\)return/,'offline decoration must stop before scanning course rows outside the Courses view');
assert.match(offline,/decoratePending/,'offline decoration must coalesce mutation bursts');
assert.doesNotMatch(googleClean,/new MutationObserver/,'the active Google renderer must not observe map DOM churn');
assert.doesNotMatch(googleClean,/document\.body\?\.innerText/,'map health checks must not scan the full page');
assert.doesNotMatch(html,/play-camera-v137\.js|google-maps-health-v215\.js/,'retired map controllers must not load in production');

assert.match(camera,/const applied=new WeakMap/,'camera changes must be deduplicated per map instance');
assert.match(camera,/applyParFolioHoleCamera/,'the play view needs one authoritative camera controller');
assert.match(camera,/No flyover animation/,'camera changes must remain static rather than scheduling competing travel animations');
assert.match(camera,/heading:bearingDegrees\(tee,center\)/,'GPS updates must preserve the fixed tee-to-green camera');
assert.match(camera,/const SAFE_ZOOM_BOOST=\.55/,'every mapped hole should receive one conservative zoom boost');
assert.match(camera,/all mapped holes/,'the bounded camera rule must be global rather than region-specific');
assert.doesNotMatch(camera,/OverlayView|correctEdgeFrame|scheduleEdgeFrame|panBy/,'the play camera must never run projection feedback loops on iPhone Safari');
assert.match(camera,/all-courses-single-pass/,'each mapped hole must use the single-pass camera rule');
assert.match(html,/parfolio-camera-flyover-v270\.js\?v=286/,'production must load the bounded global camera');
assert.match(roundCss,/top:max\(6px,calc\(env\(safe-area-inset-top\) \+ 6px\)\)!important/,'live-round HUD must sit just below the iPhone safe area');
assert.match(html,/round-full-bleed-v280\.css\?v=285/,'production must load the tightened live-round layout');

assert.match(app,/function refreshLiveRoundUi\(/,'live score updates need an in-place UI refresh');
assert.match(app,/activeView==='round'&&refreshLiveRoundUi\(\)/,'Realtime and reconnect updates must preserve the active map');
assert.match(app,/window\.applyParFolioHoleCamera\(green,true\)/,'initial view and recenter must use the authoritative camera');
const cacheVersion=Number(read('service-worker.js').match(/parfolio-v(\d+)-/)?.[1]);
assert.ok(cacheVersion>=224,'Safari stability fix must remain active in a non-regressed cache');
assert.doesNotMatch(html,/\?v=223/,'the page must not reference stale v223 assets');

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
