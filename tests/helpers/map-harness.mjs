import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=process.env.PARFOLIO_TEST_SOURCE_ROOT?new URL('file://'+process.env.PARFOLIO_TEST_SOURCE_ROOT.replace(/\/$/,'')+'/'):new URL('../../',import.meta.url);
const source=fs.readFileSync(new URL('google-maps-clean-v269.js',root),'utf8');

// Deterministic DOM/Maps doubles exercise the production renderer, not a copied controller.
// They do not emulate Safari's GPU or verify actual Google imagery.
export class Element {
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
export function setup({gps=false}={}){
  let now=0,nextTimer=1;const timers=new Map(),maps=[],documentEvents={},windowEvents={},watches=new Map(),activeWatches=new Set();let nextWatch=1;
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
  const c={document,Date:class extends Date{static now(){return now}},console:{info:()=>{},warn:()=>{}},localStorage:{},innerHeight:800,innerWidth:390,
    setTimeout:(f,delay)=>(timers.set(nextTimer,{at:now+delay,f}),nextTimer++),clearTimeout:id=>timers.delete(id),
    addEventListener:(n,f)=>(windowEvents[n]??=[]).push(f),
    google:{maps:{Map:MapDouble,Marker,Polyline,OverlayView,RenderingType:{VECTOR:'VECTOR'},SymbolPath:{CIRCLE:'circle'},Size:class{},Point:class{},LatLng:class{},event:{addListenerOnce:(t,n,f)=>listen(t,n,f,true),clearInstanceListeners:t=>{t.listeners={};t.cleared=true}}}},
    s:{v:'round',hole:1,holes:18,pars:Array(18).fill(4),scores:{Rick:{1:5,2:4}},putts:{Rick:{1:2}},sharedRoundId:'round'},
    pendingScores:{one:{hole:1,strokes:5}},shotPlannerAims:{},inlineHoleMap:null,inlineHoleGreen:null,inlineGolferMarker:null,inlineGoogleOverlays:[],inlinePlannerMarker:null,inlinePlannerLines:[],inlinePlannerLabels:[],inlineUserMovedMap:false,inlineViewResetting:false,coursePreviewMode:false,liveMapStyle:'satellite',coursePreviewMaps:[],lastKnownPosition:null,lastGpsAccuracyYards:10,
    roundGeometryKey:()=>c.s.sharedRoundId,shotPlannerKey:()=>c.s.sharedRoundId+':'+c.s.hole,selectedRoundCourse:()=>course,selectedTee:g=>g?.tee,
    shotPlannerOrigin:g=>g.tee,shotPlannerAim:g=>g.center,remainingRoutePoints:(a,b,g)=>[b,g.center],distanceYards:()=>350,routeDistance:()=>350,suggestedClubFor:()=>null,driverAllowedForCurrentShot:()=>true,golferIsNearHole:()=>false,
    pointBetween:(a,b,t)=>({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t}),bearingDegrees:()=>45,mappedHoleDistance:()=>350,myRoundPlayerName:()=> 'Rick',scoreValue:()=>5,total:()=>9,
    stopLocation:()=>{c.stops++},startLocation:()=>{c.starts++},stops:0,starts:0,save:()=>{c.saved=JSON.stringify(c.s)},activeRouteSegment:()=>null,loadWeather:()=>{}};
  c.window=c;
  c.locationWatch=null;c.$=id=>document.getElementById(id);
  c.navigator={geolocation:{watchPosition:(success,error,options)=>{const id=nextWatch++;watches.set(id,{success,error,options});activeWatches.add(id);c.starts++;return id},clearWatch:id=>{activeWatches.delete(id);c.stops++}}};
  vm.createContext(c);
  if(gps){
    const app=fs.readFileSync(new URL('app.js',root),'utf8');
    const marker=app.indexOf('let locationWatchGeneration');
    vm.runInContext(app.slice(marker>=0?marker:app.indexOf('function startLocation('),app.indexOf('function distanceYards(')),c);
  }
  vm.runInContext(source,c);
  const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
  const tick=async ms=>{
    const end=now+ms;
    for(let guard=0;guard<10000;guard++){
      const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next){now=end;await flush();return}
      const [id,timer]=next;now=timer.at;timers.delete(id);timer.f();await flush();
    }
    throw new Error('Timer runaway in map test');
  };
  const fire=(events,n,event={})=>{for(const f of events[n]||[])f(event)};
  return{c,container,viewport,maps,emit,flush,tick,course,timers,watches,activeWatches,windowEvent:(name,event)=>fire(windowEvents,name,event),init:()=>c.initInlineHoleMap(course.greens[c.s.hole-1]),hide:()=>{document.visibilityState='hidden';fire(documentEvents,'visibilitychange')},show:()=>{document.visibilityState='visible';fire(documentEvents,'visibilitychange');fire(windowEvents,'pageshow')},restore:()=>{for(const {f,capture} of container.events.webglcontextrestored||[]){assert.equal(capture,true);f({})}},lose:()=>{for(const {f,capture} of container.events.webglcontextlost||[]){assert.equal(capture,true);f({preventDefault(){}})}}};
}
