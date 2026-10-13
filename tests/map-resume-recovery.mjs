import assert from 'node:assert/strict';
import test from 'node:test';
import {setup} from './helpers/map-harness.mjs';

// These execute production functions with deterministic browser/Maps doubles.
// They cannot certify Safari compositor health, physical GPS, or visible imagery.
const position={coords:{accuracy:5,latitude:33.74,longitude:-117.05}};

test('GPS resumes immediately even if foreground map creation fails',async()=>{
  const t=setup({gps:true});await t.init();t.c.startLocation(t.course.greens[0]);
  t.emit(t.maps[0],'tilesloaded');t.hide();assert.equal(t.activeWatches.size,0);
  t.c.google.maps.Map=class{constructor(){throw new Error('GPU unavailable')}};
  t.show();assert.equal(t.c.starts,2,'GPS must not wait for the map recovery timer');
  await t.tick(120);assert.equal(t.container.dataset.mapState,'failed');
  assert.equal(t.activeWatches.size,1);t.watches.get(2).success(position);
  assert.equal(t.c.lastKnownPosition.lat,position.coords.latitude);
});

test('GPS fix received while the replacement loads is drawn without waiting for another fix',async()=>{
  const t=setup({gps:true});await t.init();t.c.startLocation(t.course.greens[0]);
  t.hide();let resolve;t.c.loadGoogleMaps=()=>new Promise(r=>resolve=r);t.show();await t.tick(120);
  assert.equal(t.c.inlineHoleMap,null);t.watches.get(t.c.locationWatch).success(position);
  resolve(t.c.google.maps);await t.flush();
  assert.ok(t.c.inlineGolferMarker);assert.equal(t.c.inlineGolferMarker.raw.map,t.maps[1]);
  assert.equal(t.c.inlineGolferMarker.raw.position.lat,position.coords.latitude);
});

test('queued planner drags cannot overwrite the current hole after overlays are replaced',async()=>{
  const t=setup();await t.init();const marker=t.c.inlinePlannerMarker.raw;
  const drag=marker.listeners.drag[0].fn,end=marker.listeners.dragend[0].fn;
  t.c.s.hole=2;t.c.updateGoogleRoundHole();t.c.s.hole=1;t.c.updateGoogleRoundHole();
  const aims=JSON.stringify(t.c.shotPlannerAims);drag();end();
  assert.equal(JSON.stringify(t.c.shotPlannerAims),aims);assert.equal(t.c.inlineUserMovedMap,false);
});

test('twelve lock/unlock cycles between holes retain scores, aims and one GPS watch',async()=>{
  const t=setup({gps:true});await t.init();t.c.startLocation(t.course.greens[0]);
  t.c.shotPlannerAims['round:1']={lat:33.75,lng:-117.05};
  t.c.localStorage.parfolioRound='saved-round';t.c.localStorage.parfolioPendingScores='pending-scores';
  const scores=JSON.stringify(t.c.s.scores),putts=JSON.stringify(t.c.s.putts),pending=JSON.stringify(t.c.pendingScores),aims=JSON.stringify(t.c.shotPlannerAims);
  for(let hole=1;hole<=12;hole++){
    t.emit(t.maps.at(-1),'tilesloaded');const oldWatch=t.watches.get(t.c.locationWatch),maps=t.maps.length;
    t.hide();t.windowEvent('pagehide');t.show();t.windowEvent('pageshow');
    assert.equal(t.activeWatches.size,1);await t.tick(120);
    assert.equal(t.maps.length,maps+1,'exactly one foreground replacement');
    oldWatch.success({coords:{...position.coords,latitude:0}});oldWatch.error({code:1});
    const watch=t.watches.get(t.c.locationWatch);watch.success(position);
    assert.equal(t.c.lastKnownPosition.lat,position.coords.latitude);
    t.emit(t.maps.at(-1),'tilesloaded');t.c.s.hole=hole+1;
    assert.equal(t.c.updateGoogleRoundHole(),true);await t.flush();
    assert.equal(t.maps.length,maps+1,'healthy hole advance reuses only the fresh renderer');
    assert.equal(t.c.inlineHoleGreen,t.course.greens[hole]);assert.equal(t.activeWatches.size,1);
  }
  assert.equal(JSON.stringify(t.c.s.scores),scores);assert.equal(JSON.stringify(t.c.s.putts),putts);
  assert.equal(JSON.stringify(t.c.pendingScores),pending);assert.equal(JSON.stringify(t.c.shotPlannerAims),aims);
  assert.equal(t.c.localStorage.parfolioRound,'saved-round');assert.equal(t.c.localStorage.parfolioPendingScores,'pending-scores');
  assert.equal(t.container.querySelectorAll('canvas').length,1);
});

test('pre-lock API resolution cannot mount before the foreground owner',async()=>{
  const t=setup();let resolve;const api=new Promise(r=>resolve=r);t.c.loadGoogleMaps=()=>api;
  const first=t.init();t.hide();t.show();resolve(t.c.google.maps);await first;
  assert.equal(t.maps.length,0);await t.tick(120);assert.equal(t.maps.length,1);
});

test('Next Hole immediately after unlock replaces rather than reuses the suspended map',async()=>{
  const t=setup({gps:true});await t.init();t.c.startLocation(t.course.greens[0]);t.emit(t.maps[0],'tilesloaded');
  t.hide();assert.equal(t.c.parfolioLiveMapIsCurrent(),false);t.show();t.c.s.hole=2;
  t.c.updateGoogleRoundHole();await t.flush();await t.tick(120);
  assert.equal(t.maps.length,2);assert.ok(t.maps[0].cleared);assert.equal(t.c.inlineHoleGreen,t.course.greens[1]);
  assert.equal(t.activeWatches.size,1);assert.equal(t.c.parfolioLiveMapIsCurrent(),true);
});

test('zero-sized unlock surface waits for layout before constructing Google Maps',async()=>{
  const t=setup();await t.init();t.hide();t.container.clientWidth=0;t.container.clientHeight=0;
  t.show();await t.tick(120);assert.equal(t.maps.length,1);
  await t.tick(500);assert.equal(t.maps.length,1);
  t.container.clientWidth=390;t.container.clientHeight=800;await t.tick(100);
  assert.equal(t.maps.length,2);assert.equal(t.container.querySelectorAll('canvas').length,1);
});

test('layout wait is bounded and Retry map can recover without clearing storage',async()=>{
  const t=setup();t.container.clientWidth=0;const pending=t.init();await t.tick(5000);
  assert.equal(await pending,false);assert.equal(t.maps.length,0);assert.equal(t.container.dataset.mapState,'failed');
  assert.match(t.container.querySelector('.parfolio-google-error').querySelector('small').textContent,/ROUND_MAP_LAYOUT/);
  t.container.clientWidth=390;await t.c.parfolioRecoverLiveMap();assert.equal(t.maps.length,1);
});

test('a second lock cancels the old layout waiter',async()=>{
  const t=setup();await t.init();t.hide();t.container.clientWidth=0;t.show();await t.tick(120);
  t.hide();await t.flush();t.container.clientWidth=390;t.show();await t.tick(120);
  assert.equal(t.maps.length,2);await t.tick(6000);assert.equal(t.maps.length,2);
});

test('layout is checked again after a slow API load',async()=>{
  const t=setup();let resolve;t.c.loadGoogleMaps=()=>new Promise(r=>resolve=r);const pending=t.init();
  t.container.clientHeight=0;resolve(t.c.google.maps);await t.flush();assert.equal(t.maps.length,0);
  t.container.clientHeight=800;await t.tick(100);assert.equal(await pending,true);assert.equal(t.maps.length,1);
});

test('late API rejection cannot replace the new hole with an old error panel',async()=>{
  const t=setup();let reject;t.c.loadGoogleMaps=()=>new Promise((_,r)=>reject=r);const pending=t.init();
  t.c.s.hole=2;reject(new Error('old request failed'));await pending;
  assert.equal(t.container.querySelector('.parfolio-google-error'),null);
  t.c.loadGoogleMaps=async()=>t.c.google.maps;await t.init();assert.equal(t.c.inlineHoleGreen,t.course.greens[1]);
});

test('late API rejection while hidden is inert',async()=>{
  const t=setup();let reject;t.c.loadGoogleMaps=()=>new Promise((_,r)=>reject=r);const pending=t.init();
  t.hide();reject(new Error('background failure'));await pending;
  assert.equal(t.container.dataset.mapState,'suspended');assert.equal(t.container.querySelector('.parfolio-google-error'),null);
});

test('queued camera callbacks from the previous owner cannot mutate the new camera',async()=>{
  const t=setup();await t.init();t.c.s.hole=2;t.c.updateGoogleRoundHole();
  const oldIdle=t.maps[0].listeners.idle.map(e=>e.fn);
  await t.c.parfolioRecoverLiveMap();assert.equal(t.c.inlineViewResetting,true);
  for(const callback of oldIdle)callback();assert.equal(t.c.inlineViewResetting,true);
});

test('queued old-hole tile event cannot mark a later watch healthy after A-B-A navigation',async()=>{
  const t=setup();await t.init();const oldTiles=t.maps[0].listeners.tilesloaded[0].fn;
  t.c.s.hole=2;t.c.updateGoogleRoundHole();t.c.s.hole=1;t.c.updateGoogleRoundHole();
  oldTiles();assert.equal(t.container.dataset.mapState,'loading');
  t.emit(t.maps[0],'tilesloaded');assert.equal(t.container.dataset.mapState,'tiles');
});

test('context restoration waits for new tiles rather than declaring the map healthy',async()=>{
  const t=setup();await t.init();t.emit(t.maps[0],'tilesloaded');t.lose();t.restore();
  assert.equal(t.container.dataset.mapState,'loading');await t.tick(120);assert.equal(t.maps.length,1);
  t.emit(t.maps[0],'tilesloaded');assert.equal(t.container.dataset.mapState,'tiles');
  await t.tick(12000);assert.equal(t.maps.length,1);
});

test('context-restored but silent renderer exhausts its bounded tile retry',async()=>{
  const t=setup();await t.init();t.emit(t.maps[0],'tilesloaded');t.lose();t.restore();
  await t.tick(12000);assert.equal(t.maps.length,2);await t.tick(12000);
  assert.equal(t.maps.length,2);assert.equal(t.container.dataset.mapState,'failed');
});

test('old context-restored handler cannot touch a replacement renderer',async()=>{
  const t=setup();await t.init();const restored=t.container.events.webglcontextrestored[0].f;
  t.lose();await t.tick(120);t.emit(t.maps[1],'tilesloaded');restored();
  assert.equal(t.container.dataset.mapState,'tiles');assert.equal(t.container.events.webglcontextrestored.length,1);
});

test('context loss remains recoverable after healthy Next Hole renderer reuse',async()=>{
  const t=setup();await t.init();t.emit(t.maps[0],'tilesloaded');
  t.c.s.hole=2;t.c.updateGoogleRoundHole();t.emit(t.maps[0],'tilesloaded');
  t.lose();assert.equal(t.container.dataset.mapState,'lost');await t.tick(120);
  assert.equal(t.maps.length,2);assert.equal(t.c.inlineHoleGreen,t.course.greens[1]);
});

test('context restoration on a reused map watches the current hole',async()=>{
  const t=setup();await t.init();t.emit(t.maps[0],'tilesloaded');
  t.c.s.hole=2;t.c.updateGoogleRoundHole();t.emit(t.maps[0],'tilesloaded');
  t.lose();t.restore();assert.equal(t.container.dataset.mapState,'loading');
  await t.tick(120);assert.equal(t.maps.length,1);t.emit(t.maps[0],'tilesloaded');
  assert.equal(t.container.dataset.mapState,'tiles');assert.equal(t.c.inlineHoleGreen,t.course.greens[1]);
});

test('queued gestures from a disposed renderer cannot change the new camera state',async()=>{
  const t=setup();await t.init();const drag=t.maps[0].listeners.dragstart[0].fn,zoom=t.maps[0].listeners.zoom_changed[0].fn;
  await t.c.parfolioRecoverLiveMap();t.c.inlineViewResetting=false;
  drag();zoom();assert.equal(t.c.inlineUserMovedMap,false);
});

test('BFCache pageshow restores map and GPS even without an earlier pagehide',async()=>{
  const t=setup({gps:true});await t.init();t.c.startLocation(t.course.greens[0]);
  t.windowEvent('pageshow',{persisted:true});await t.tick(120);
  assert.equal(t.maps.length,2);assert.equal(t.c.starts,2);assert.equal(t.activeWatches.size,1);
});

test('course preview recovers its map without acquiring golfer GPS',async()=>{
  const t=setup({gps:true});t.c.s.v='coursePreview';t.c.coursePreviewMode=true;
  await t.init();t.hide();t.show();await t.tick(120);
  assert.equal(t.maps.length,2);assert.equal(t.c.starts,0);
});

test('leaving a layout wait cannot create a map over the scorecard',async()=>{
  const t=setup();t.container.clientWidth=0;const pending=t.init();
  t.c.s.v='recap';t.c.parfolioDisposeLiveMap('render-replace');t.container.clientWidth=390;
  assert.equal(await pending,false);await t.tick(6000);assert.equal(t.maps.length,0);
});

test('same-hole round identity change invalidates pending initialization',async()=>{
  const t=setup();t.c.shotPlannerKey=()=>String(t.c.s.hole);let resolve;
  t.c.loadGoogleMaps=()=>new Promise(r=>resolve=r);const pending=t.init();
  t.c.s.sharedRoundId='new-round';resolve(t.c.google.maps);await pending;assert.equal(t.maps.length,0);
});

test('runtime config that never completes gets a bounded error and a clean retry',async()=>{
  const t=setup();delete t.c.google;const pending=t.init();const script=t.c.document.head.children[0];
  const oldLoad=script.onload,oldError=script.onerror;await t.tick(10000);
  assert.equal(await pending,false);assert.equal(t.container.dataset.mapState,'failed');
  assert.match(t.container.querySelector('.parfolio-google-error').querySelector('small').textContent,/runtime config timed out/);
  const retry=t.c.parfolioRecoverLiveMap();const replacement=t.c.document.head.children.at(-1);
  assert.notEqual(replacement,script);oldError();oldLoad();
  t.c.PARFOLIO_GOOGLE_MAPS_CONFIGURED=true;t.c.PARFOLIO_GOOGLE_MAPS_API_KEY='test-only-key';replacement.onload();
  await t.flush();const api=t.c.document.head.children.at(-1);
  assert.match(api.src,/maps.googleapis.com/);api.onerror();await retry;
  assert.equal(t.container.dataset.mapState,'failed');
});
