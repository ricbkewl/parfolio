import assert from 'node:assert/strict';
import {setup,Element} from './helpers/map-harness.mjs';
let scenarios=0;
{
  const t=setup();await t.init();t.emit(t.maps[0],'tilesloaded');
  const state=JSON.stringify(t.c.s),pending=JSON.stringify(t.c.pendingScores);t.hide();t.show();await t.tick(120);
  assert.equal(t.maps.length,2,'resume must replace the suspended graphics surface once');
  assert.ok(t.maps[0].cleared&&t.maps[0].unbound);assert.equal(t.container.querySelectorAll('canvas').length,1);
  assert.equal(JSON.stringify(t.c.s),state);assert.equal(JSON.stringify(t.c.pendingScores),pending);
  t.emit(t.maps[1],'tilesloaded');assert.equal(t.container.dataset.mapState,'tiles');scenarios++;
}
{
  const t=setup();await t.init();t.emit(t.maps[0],'tilesloaded');t.lose();assert.equal(t.container.dataset.mapState,'lost');await t.tick(120);assert.equal(t.maps.length,2);
  t.emit(t.maps[1],'tilesloaded');assert.equal(t.container.dataset.mapState,'tiles');scenarios++;
}
{
  const t=setup();await t.init();t.hide();t.lose();await t.tick(120);assert.equal(t.maps.length,1,'do not rebuild in background');t.show();await t.tick(120);assert.equal(t.maps.length,2);scenarios++;
}
{
  const t=setup();await t.init();const scores=JSON.stringify(t.c.s.scores);
  for(let h=2;h<=18;h++){t.c.s.hole=h;assert.equal(t.c.updateGoogleRoundHole(),true);t.emit(t.maps[0],'tilesloaded')}
  assert.equal(t.maps.length,1,'healthy next-hole changes reuse the renderer');assert.equal(JSON.stringify(t.c.s.scores),scores);assert.equal(t.c.s.hole,18);scenarios++;
}
{
  const t=setup();await t.init();t.lose();t.c.s.hole=2;assert.equal(t.c.updateGoogleRoundHole(),true);await t.flush();await t.tick(120);
  assert.equal(t.maps.length,2,'lost map and next-hole must not create duplicate replacements');assert.equal(t.c.inlineHoleGreen,t.course.greens[1]);scenarios++;
}
{
  const t=setup();await t.init();t.maps[0].failCamera=true;t.c.s.hole=2;t.c.updateGoogleRoundHole();await t.flush();assert.equal(t.maps.length,2);scenarios++;
}
{
  const t=setup();await t.init();await t.tick(12000);assert.equal(t.maps.length,2);await t.tick(12000);assert.equal(t.maps.length,2,'only one automatic tile retry');
  assert.equal(t.container.dataset.mapState,'failed');assert.ok(t.viewport.querySelector('.pf-map-recovery-status').querySelector('button'));
  await t.c.parfolioRecoverLiveMap();assert.equal(t.maps.length,3);t.emit(t.maps[2],'tilesloaded');assert.equal(t.container.dataset.mapState,'tiles');scenarios++;
}
{
  const t=setup();let resolve;t.c.loadGoogleMaps=()=>new Promise(r=>resolve=r);const first=t.init();t.c.s.hole=2;
  resolve(t.c.google.maps);await first;assert.equal(t.maps.length,0,'late initialization cannot mount the previous hole');
  t.c.loadGoogleMaps=async()=>t.c.google.maps;await t.init();assert.equal(t.maps.length,1);assert.equal(t.c.inlineHoleGreen,t.course.greens[1]);scenarios++;
}
{
  const t=setup();await t.init();t.hide();t.c.s.v='recap';t.show();await t.tick(120);assert.equal(t.maps.length,1,'resume cannot navigate over a scorecard');scenarios++;
}
{
  const t=setup();await t.init();t.hide();t.show();t.c.parfolioDisposeLiveMap('navigation');t.c.s.v='home';await t.tick(13000);
  assert.equal(t.maps.length,1);assert.equal(t.container.events.webglcontextlost.length,0);assert.equal(t.container.children.length,0);scenarios++;
}
{
  const t=setup();await t.init();t.c.inlineHoleMap.container=new Element();await t.init();assert.equal(t.maps.length,2,'disposing a stale container must not invalidate its replacement mount');scenarios++;
}
{
  const t=setup();t.c.google.maps.Marker=class{constructor(){throw new Error('marker initialization failed')}};
  assert.equal(await t.init(),true,'a planner failure must preserve the base map');
  t.emit(t.maps[0],'tilesloaded');assert.equal(t.container.dataset.mapState,'tiles');
  assert.ok(t.c.inlineHoleMap);assert.match(t.viewport.querySelector('.pf-planner-error').textContent,/marker initialization failed/);scenarios++;
}
{
  const t=setup();t.c.google.maps.Map=class{constructor(){throw new Error('graphics initialization failed')}};
  assert.equal(await t.init(),false);assert.equal(t.container.dataset.mapState,'failed');
  const panel=t.container.querySelector('.parfolio-google-error');
  assert.match(panel.querySelector('small').textContent,/GOOGLE_MAP_CREATE: graphics initialization failed/);
  assert.ok(panel.querySelector('button'));assert.equal(t.viewport.querySelector('.pf-map-recovery-status'),null,'recovery must not hide the real error');scenarios++;
}
{
  const t=setup();await t.init();t.c.suggestedClubFor=()=>{throw new Error('club calculation failed')};
  assert.doesNotThrow(()=>t.c.updateShotPlanner(t.course.greens[0]));
  assert.ok(t.c.inlineHoleMap);assert.match(t.viewport.querySelector('.pf-planner-error').textContent,/club calculation failed/);scenarios++;
}
console.log(`Map lifecycle: ${scenarios} scenarios passed with DOM/Google Maps doubles (device GPU validation remains required).`);
