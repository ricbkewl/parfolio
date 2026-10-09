import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const source=fs.readFileSync(new URL('google-maps-clean-v269.js',root),'utf8');

// Deterministic DOM/Maps doubles exercise the production renderer, not a copied controller.
// They do not emulate Safari's GPU or verify actual Google imagery.
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.events={};this.attrs={};this.className='';this.parent=null;this.clientHeight=800;this.clientWidth=390;this.isConnected=true;this.textContent='';this.classList={add:()=>{},remove:()=>{},toggle:()=>{}};}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node)}}
  appendChild(node){this.append(node);return node}
  replaceChildren(...nodes){for(const child of this.children)child.isConnected=false;this.children=[];this.append(...nodes)}
  remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
  setAttribute(k,v){this.attrs[k]=v}
  addEventListener(n,f,capture=false){(this.events[n]??=[]).push({f,capture})}
  removeEventListener(n,f){this.events[n]=(this.events[n]||[]).filter(x=>x.f!==f)}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  querySelectorAll(selector){const match=n=>selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):selector.startsWith('#')?n.id===selector.slice(1):n.tagName===selector.toUpperCase();const found=[];for(const child of this.children){if(match(child))found.push(child);found.push(...child.querySelectorAll(selector))}return found}
  set innerHTML(value){this.replaceChildren();for(const tag of ['b','span','small','i','em'])if(value.includes('<'+tag))this.append(new Element(tag))}
}
function setup(){
  let now=0,nextTimer=1;const timers=new Map(),maps=[],documentEvents={},windowEvents={};
  const body=new Element('body'),viewport=new Element(),container=new Element();viewport.className='live-map-viewport';container.id='liveHoleMap';viewport.append(container);body.append(viewport);
  for(const id of ['roundMapHole','roundMapDistance','roundMapPar','centerYards','roundHoleScore','roundScoreTotal','gpsStatus']){const e=new Element();e.id=id;body.append(e)}
  const document={body,head:new Element('head'),visibilityState:'visible',getElementById:id=>body.querySelector('#'+id),querySelector:s=>body.querySelector(s),querySelectorAll:s=>body.querySelectorAll(s),createElement:t=>new Element(t),addEventListener:(n,f)=>(documentEvents[n]??=[]).push(f)};
  function listen(target,name,fn,once=false){const entry={fn,once};(target.listeners??={})[name]??=[];target.listeners[name].push(entry);return{remove:()=>target.listeners[name]=target.listeners[name].filter(x=>x!==entry)}}
  function emit(target,name){for(const entry of [...(target.listeners?.[name]||[])]){if(entry.once)target.listeners[name]=target.listeners[name].filter(x=>x!==entry);entry.fn()}}
  class MapDouble {constructor(div,opts){this.div=div;this.opts={...opts};this.listeners={};this.cleared=false;maps.push(this);div.append(new Element('canvas'))}addListener(n,f){return listen(this,n,f)}moveCamera(camera){if(this.failCamera)throw new Error('lost GPU');Object.assign(this.opts,camera)}setMapTypeId(v){this.opts.mapTypeId=v}getDiv(){return this.div}getZoom(){return this.opts.zoom}getCenter(){return{lat:()=>this.opts.center.lat,lng:()=>this.opts.center.lng}}unbindAll(){this.unbound=true}}
  class Marker {constructor(o){this.position=o.position;this.map=o.map}setMap(m){this.map=m}setPosition(p){this.position=p}getPosition(){return{lat:()=>this.position.lat,lng:()=>this.position.lng}}addListener(n,f){return listen(this,n,f)}}
  class Polyline {constructor(o){this.map=o.map}setMap(m){this.map=m}setPath(){}}
  class OverlayView {setMap(m){this.map=m;if(m)this.onAdd?.();else this.onRemove?.()}getProjection(){return null}getMap(){return this.map}}
  const course={greens:Array.from({length:18},(_,i)=>({tee:{lat:33.74+i/1000,lng:-117.05},center:{lat:33.742+i/1000,lng:-117.052}}))};
  const c={document,console:{info:()=>{},warn:()=>{}},localStorage:{},innerHeight:800,innerWidth:390,
    setTimeout:(f,delay)=>(timers.set(nextTimer,{at:now+delay,f}),nextTimer++),clearTimeout:id=>timers.delete(id),
    addEventListener:(n,f)=>(windowEvents[n]??=[]).push(f),
    google:{maps:{Map:MapDouble,Marker,Polyline,OverlayView,RenderingType:{VECTOR:'VECTOR'},SymbolPath:{CIRCLE:'circle'},Size:class{},Point:class{},LatLng:class{},event:{addListenerOnce:(t,n,f)=>listen(t,n,f,true),clearInstanceListeners:t=>{t.listeners={};t.cleared=true}}}},
    s:{v:'round',hole:1,holes:18,pars:Array(18).fill(4),scores:{Rick:{1:5,2:4}},putts:{Rick:{1:2}},sharedRoundId:'round'},
    pendingScores:{one:{hole:1,strokes:5}},shotPlannerAims:{},inlineHoleMap:null,inlineHoleGreen:null,inlineGolferMarker:null,inlineGoogleOverlays:[],inlinePlannerMarker:null,inlinePlannerLines:[],inlinePlannerLabels:[],inlineUserMovedMap:false,inlineViewResetting:false,coursePreviewMode:false,liveMapStyle:'satellite',coursePreviewMaps:[],lastKnownPosition:null,lastGpsAccuracyYards:10,
    roundGeometryKey:()=>c.s.sharedRoundId,shotPlannerKey:()=>c.s.sharedRoundId+':'+c.s.hole,selectedRoundCourse:()=>course,selectedTee:g=>g?.tee,
    shotPlannerOrigin:g=>g.tee,shotPlannerAim:g=>g.center,remainingRoutePoints:(a,b,g)=>[b,g.center],distanceYards:()=>350,routeDistance:()=>350,suggestedClubFor:()=>null,driverAllowedForCurrentShot:()=>true,golferIsNearHole:()=>false,
    pointBetween:(a,b,t)=>({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t}),bearingDegrees:()=>45,mappedHoleDistance:()=>350,myRoundPlayerName:()=> 'Rick',scoreValue:()=>5,total:()=>9,
    stopLocation:()=>{c.stops++},startLocation:()=>{c.starts++},stops:0,starts:0,save:()=>{c.saved=JSON.stringify(c.s)},activeRouteSegment:()=>null,loadWeather:()=>{}};
  c.window=c;vm.createContext(c);vm.runInContext(source,c);
  const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
  const tick=async ms=>{now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.f()}await flush()};
  const fire=(events,n)=>{for(const f of events[n]||[])f({})};
  return{c,container,viewport,maps,emit,flush,tick,course,init:()=>c.initInlineHoleMap(course.greens[c.s.hole-1]),hide:()=>{document.visibilityState='hidden';fire(documentEvents,'visibilitychange')},show:()=>{document.visibilityState='visible';fire(documentEvents,'visibilitychange');fire(windowEvents,'pageshow')},lose:()=>{for(const {f,capture} of container.events.webglcontextlost||[]){assert.equal(capture,true);f({preventDefault(){}})}}};
}
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
