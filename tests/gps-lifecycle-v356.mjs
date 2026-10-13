import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=source.indexOf('let locationWatchGeneration'),end=source.indexOf('function distanceYards',start);
assert.ok(start>=0&&end>start,'exercise production GPS state, functions, and lifecycle listeners');
const gps=source.slice(start,end);
const position=(latitude=33.74,accuracy=5)=>({coords:{accuracy,latitude,longitude:-117.05}});

function harness(){
  const watches=new Map(),cleared=[],updates=[],warnings=[],flags={};let nextId=0,attempts=0,now=10000,statusText='';
  function eventTarget(){
    const listeners=new Map();
    return {addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(listener)},
      emit(type,event={}){for(const listener of listeners.get(type)||[])listener({type,...event})}};
  }
  const document=Object.assign(eventTarget(),{visibilityState:'visible'}),window=eventTarget();
  const status={get textContent(){return statusText},set textContent(text){if(flags.statusThrows)throw Error('DOM detached');statusText=text},
    classList:{toggle(){if(flags.classListThrows)throw Error('classList detached')}}};
  const course={greens:Array.from({length:18},(_,index)=>({name:`green ${index+1}`,center:{lat:1,lng:1},tee:{lat:0,lng:0}}))};
  const c={s:{v:'round',hole:1,courseId:'course-1',teeSet:'black',sharedRoundId:'round-1',ownerUserId:'golfer-1',scores:{Me:{1:4}},done:false},
    document,window,locationWatch:null,lastKnownPosition:null,lastGpsAccuracyYards:null,
    console:{warn:(...args)=>warnings.push(args)},Date:{now:()=>now},
    navigator:{geolocation:{watchPosition(success,error,options){attempts++;if(flags.startThrows)throw Error('Geolocation start failed');
      const id=nextId++;watches.set(id,{success,error,options});if(flags.onStart)flags.onStart(success,error);return id},
      clearWatch(id){cleared.push(id);if(flags.onClear)flags.onClear(watches.get(id));if(flags.clearThrows)throw Error('Geolocation clear failed')}}},
    $:()=>flags.noStatus?null:status,shotPlannerKey:()=>`${c.s.courseId}:${c.s.hole}:${c.s.teeSet}`,
    selectedRoundCourse:()=>{if(flags.courseThrows)throw Error('Course unavailable');return course},
    golferIsNearHole:()=>true,activeRouteSegment:(_here,green)=>({origin:green.tee,target:green.center}),selectedTee:green=>green.tee};
  for(const method of ['updateShotPlanner','updateInlineGolferPosition','orientInlineHoleMap','loadWeather'])c[method]=(...args)=>{
    updates.push({method,args});if(flags.onUpdate)flags.onUpdate(method);if(flags.throwMethod===method)throw Error(`${method} renderer failed`);
    if(method==='loadWeather'&&flags.weatherRejects)return Promise.reject(Error('Weather rejected'));
  };
  vm.createContext(c);vm.runInContext(gps,c);
  let mapEvents=0;document.addEventListener('visibilitychange',()=>mapEvents++);window.addEventListener('pageshow',()=>mapEvents++);window.addEventListener('pagehide',()=>mapEvents++);
  return {c,course,watches,cleared,updates,warnings,flags,status,document,window,
    start(){c.startLocation(course.greens[c.s.hole-1]);return watches.get(c.locationWatch)},
    current(){return watches.get(c.locationWatch)},advance(ms){now+=ms},get attempts(){return attempts},get mapEvents(){return mapEvents},
    snapshot(){return JSON.stringify({position:c.lastKnownPosition,accuracy:c.lastGpsAccuracyYards,status:status.textContent,updates:updates.length})}};
}

// Replacing a watch on the SAME hole must reject both queued successes and errors.
{
  const h=harness(),old=h.start();old.success(position());assert.equal(h.c.locationWatch,0,'watch ID zero is valid');
  const fresh=h.start();assert.deepEqual(h.cleared,[0]);fresh.success(position(34));const before=h.snapshot();
  old.success(position(20,500));old.error({code:1});assert.equal(h.snapshot(),before,'stale same-hole callbacks cannot overwrite fresh coordinates, accuracy, or status');
  fresh.error({code:1});assert.match(h.status.textContent,/permission was denied/);fresh.success(position(35));assert.equal(h.c.lastKnownPosition.lat,35);
  assert.deepEqual({...h.current().options},{enableHighAccuracy:true,maximumAge:3000,timeout:15000});
}

// Navigation, tee changes, new round IDs, and replacement round objects are guarded.
for(const change of [c=>c.s.hole++,c=>c.s.teeSet='white',c=>c.s.sharedRoundId='round-2',c=>c.s.ownerUserId='golfer-2',c=>c.s={...c.s}]){
  const h=harness(),old=h.start();old.success(position());change(h.c);const before=h.snapshot();
  old.success(position(40));old.error({code:1});assert.equal(h.snapshot(),before,'a different round/hole cannot consume the old session');
  const fresh=h.start();fresh.success(position(41));assert.equal(h.c.lastKnownPosition.lat,41);
}

// Hidden, preview, recap, and completed rounds never start or accept GPS callbacks.
for(const mode of ['hidden','coursePreview','recap','done']){
  const h=harness(),old=h.start();old.success(position());
  if(mode==='hidden')h.document.visibilityState='hidden';else if(mode==='done')h.c.s.done=true;else h.c.s.v=mode;
  const before=h.snapshot();old.success(position(40));old.error({code:1});assert.equal(h.snapshot(),before);
  h.c.startLocation(h.course.greens[0]);h.c.refreshLocation();h.window.emit('pageshow',{persisted:true});h.document.emit('visibilitychange');
  assert.equal(h.watches.size,1,`${mode} did not start a watch`);assert.equal(h.c.locationWatch,null);
}

// Actual lifecycle listeners, alternating event order, latest geometry, and repeated unlocks.
{
  const h=harness();h.start();const saved=JSON.stringify(h.c.s.scores);
  for(let cycle=0;cycle<12;cycle++){
    const old=h.current(),count=h.watches.size;h.document.visibilityState='hidden';h.document.emit('visibilitychange');h.window.emit('pagehide',{persisted:true});
    assert.equal(h.c.locationWatch,null);h.c.s.hole=cycle+2;
    h.course.greens[h.c.s.hole-1]={name:`updated ${cycle}`,center:{lat:2,lng:2},tee:{lat:1,lng:1}};
    const hidden=h.snapshot();old.success(position(10));old.error({code:1});assert.equal(h.snapshot(),hidden);
    h.advance(10000);h.document.visibilityState='visible';
    if(cycle%2){h.window.emit('pageshow',{persisted:true});h.document.emit('visibilitychange')}
    else{h.document.emit('visibilitychange');h.window.emit('pageshow',{persisted:true})}
    h.document.emit('visibilitychange');h.window.emit('pageshow',{persisted:true});
    assert.equal(h.watches.size,count+1,'visible/pageshow and repeated notifications share one resumed watch');
    h.current().success(position(35+cycle));assert.equal(h.updates.findLast(row=>row.method==='updateShotPlanner').args[0],h.course.greens[h.c.s.hole-1],'resume resolves the latest selected green');
    const fresh=h.snapshot();old.success(position(20));old.error({code:2});assert.equal(h.snapshot(),fresh);
  }
  assert.equal(JSON.stringify(h.c.s.scores),saved,'scores are untouched');assert.equal(h.mapEvents,72,'independent map lifecycle listener receives every event');
}

// Genuine quick lock/unlock cycles bypass notification coalescing even at one timestamp.
{
  const h=harness();h.start();
  for(let cycle=0;cycle<3;cycle++){
    h.document.visibilityState='hidden';h.document.emit('visibilitychange');
    h.document.visibilityState='visible';h.document.emit('visibilitychange');h.window.emit('pageshow',{persisted:true});
    assert.equal(h.watches.size,cycle+2,'every real hide gets a new watch immediately');
  }
}

// A persisted pageshow alone can recover a frozen watch, including later restores.
{
  const h=harness(),old=h.start();h.window.emit('pageshow',{persisted:true});assert.equal(h.watches.size,2);
  const fresh=h.current();fresh.success(position(42));old.error({code:1});old.success(position(20));assert.equal(h.c.lastKnownPosition.lat,42);
  h.window.emit('pageshow',{persisted:true});h.document.emit('visibilitychange');assert.equal(h.watches.size,2);
  h.advance(1001);h.window.emit('pageshow',{persisted:true});assert.equal(h.watches.size,3,'a later persisted restore with missing hide events still reacquires');
  h.window.emit('pagehide');assert.equal(h.c.locationWatch,null,'pagehide suspends even before visibility changes');
  const paused=h.snapshot();h.current()?.success(position(15));fresh.success(position(15));assert.equal(h.snapshot(),paused);
  h.document.visibilityState='hidden';h.window.emit('pageshow',{persisted:true});assert.equal(h.watches.size,3);
  h.document.visibilityState='visible';h.document.emit('visibilitychange');assert.equal(h.watches.size,4);
}

// Browser API exceptions must not prevent another owner from handling lifecycle events.
{
  const h=harness();h.flags.startThrows=true;
  assert.doesNotThrow(()=>h.window.emit('pageshow',{persisted:true}));assert.equal(h.attempts,1);assert.equal(h.c.locationWatch,null);assert.equal(h.mapEvents,1);assert.match(h.status.textContent,/Unable/);
  h.flags.startThrows=false;h.document.emit('visibilitychange');assert.equal(h.watches.size,1,'next visible notification retries a failed registration');
  const old=h.current();old.success(position(44));const before=h.snapshot();h.flags.clearThrows=true;
  h.flags.onClear=watch=>{watch.success(position(12));watch.error({code:1});assert.equal(h.snapshot(),before,'invalidation happens before clearWatch invokes late callbacks')};
  assert.doesNotThrow(()=>h.window.emit('pagehide'));assert.equal(h.c.locationWatch,null);assert.equal(h.mapEvents,3);
  old.success(position(13));old.error({code:1});assert.equal(h.snapshot(),before);
}

// Rendering is best-effort. GPS coordinates keep advancing despite DOM/map errors.
for(const method of ['updateShotPlanner','updateInlineGolferPosition','orientInlineHoleMap','loadWeather']){
  const h=harness();h.flags.throwMethod=method;const watch=h.start();
  assert.doesNotThrow(()=>watch.success(position(50)));assert.equal(h.c.lastKnownPosition.lat,50);
  assert.doesNotThrow(()=>watch.success(position(51)));assert.equal(h.c.lastKnownPosition.lat,51);assert.equal(h.watches.size,1);assert.ok(h.warnings.length>=2);
  h.window.emit('pagehide');h.window.emit('pageshow',{persisted:true});assert.equal(h.watches.size,2);assert.equal(h.mapEvents,2);
}
for(const flag of ['statusThrows','classListThrows','noStatus']){
  const h=harness();h.flags[flag]=true;const watch=h.start();watch.success(position(52));assert.equal(h.c.lastKnownPosition.lat,52);
  assert.ok(h.updates.some(row=>row.method==='updateShotPlanner'),'missing/broken status DOM does not block GPS/map updates');
}
{
  const h=harness();h.flags.weatherRejects=true;h.start().success(position(53));await Promise.resolve();assert.ok(h.warnings.some(row=>row[0]==='GPS weather update deferred.'));
  h.c.navigator.geolocation=null;assert.doesNotThrow(()=>h.c.refreshLocation());assert.match(h.status.textContent,/not supported/);assert.equal(h.c.locationWatch,null);
}

// Synchronous browser callbacks cannot strand a watch after navigation or revive it.
{
  const h=harness();h.flags.onStart=success=>success(position(54));h.flags.onUpdate=()=>{h.c.s.v='recap'};
  h.start();assert.equal(h.c.locationWatch,null);assert.deepEqual(h.cleared,[0]);h.c.s.v='round';h.flags.onUpdate=null;
  const before=h.snapshot();h.watches.get(0).success(position(55));h.watches.get(0).error({code:1});assert.equal(h.snapshot(),before);
}

console.log('GPS lifecycle: independent suspend/resume, 12 lock/unlock cycles, same-hole/round success+error guards, persisted restore, latest geometry, and API/render failure isolation passed.');
