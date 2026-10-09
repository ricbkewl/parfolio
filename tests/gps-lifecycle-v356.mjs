import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const watches=new Map(),cleared=[],status={textContent:'',classList:{toggle(){}}};let nextId=1,updates=0;
const c={s:{v:'round',hole:1},document:{visibilityState:'visible'},locationWatch:null,
  navigator:{geolocation:{watchPosition:f=>{const id=nextId++;watches.set(id,f);return id},clearWatch:id=>cleared.push(id)}},
  $:()=>status,shotPlannerKey:()=>String(c.s.hole),golferIsNearHole:()=>false,activeRouteSegment:()=>({origin:{},target:{}}),
  updateShotPlanner:()=>updates++,selectedTee:()=>({}),updateInlineGolferPosition:()=>{},orientInlineHoleMap:()=>{},loadWeather:()=>{}};
vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function startLocation('),source.indexOf('function refreshLocation(')),c);
const position={coords:{accuracy:5,latitude:33.74,longitude:-117.05}};
c.startLocation({});const old=watches.get(1);old(position);assert.equal(updates,1);
c.s.hole=2;c.startLocation({});assert.deepEqual(cleared,[1]);old(position);assert.equal(updates,1,'late callback from previous hole is ignored');
watches.get(2)(position);assert.equal(updates,2);
c.document.visibilityState='hidden';watches.get(2)(position);assert.equal(updates,2,'background GPS cannot mutate the map');
c.document.visibilityState='visible';c.s.v='recap';watches.get(2)(position);assert.equal(updates,2,'scorecard is protected from stale GPS');
c.stopLocation();assert.deepEqual(cleared,[1,2]);
console.log('GPS lifecycle: watch replacement and stale/background/navigation callbacks passed.');
