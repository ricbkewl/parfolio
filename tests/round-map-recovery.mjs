import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const app=fs.readFileSync(new URL('app.js',root),'utf8');
const loader=fs.readFileSync(new URL('universal-gps-course-loader-v287.js',root),'utf8');
const section=(from,to)=>app.slice(app.indexOf(from),app.indexOf(to,app.indexOf(from)));
const greens=Array.from({length:18},(_,i)=>({hole:i+1,par:4,tee:{lat:33.76+i/1000,lng:-117.9},center:{lat:33.763+i/1000,lng:-117.9}}));
const course=()=>({id:'df4efa6f-64da-4a01-bba8-05be8160ea23',name:'River View Golf Course',holes:18,pars:Array(18).fill(4),greens:structuredClone(greens),parfolioCatalogId:'riverview',parfolioMappingClass:'gps_ready',parfolioGeometryVersion:287});
function setup(){
  const events={};let renders=0;
  const c={console:{...console,warn:()=>{}},setTimeout,clearTimeout,localStorage:{},courses:[course()],cloudError:'',currentUser:{id:'rick'},adminRole:'super_admin',
    s:{v:'round',courseId:course().id,course:course().name,hole:7,holes:18,scores:{Rick:{7:5}},putts:{Rick:{7:2}}},
    courseMatchKey:s=>s.toLowerCase(),royaleRouteFromCourseName:()=>null,LISTED_COURSE_CATALOG:[],isLegacyRoyaleCourse:()=>false,
    render:()=>{renders++},document:{visibilityState:'visible',addEventListener:(n,f)=>{events[n]=f}},addEventListener:(n,f)=>{events[n]=f},
    syncPendingScores:async()=>{},syncPendingHoleStats:async()=>{},loadSharedRound:async()=>{},refreshLiveRoundUi:()=>true,
    db:{from:()=>({select:()=>({order:async()=>({data:[],error:null})})}),rpc:async()=>({error:new Error('offline')})}};
  c.window=c;vm.createContext(c);
  vm.runInContext(section('const courseById=','function avatarUrl'),c);
  vm.runInContext(section('function promiseDeadline(','async function hydrateCloudData'),c);
  vm.runInContext(section('function mergeListedCourseCatalog(','const WEATHER_CACHE_MS'),c);
  vm.runInContext(section('async function loadCourses(','async function loadClubDistances'),c);
  vm.runInContext(loader.replace('setTimeout(loadCatalog,0);',''),c);
  vm.runInContext(section("window.addEventListener('online'","window.addEventListener('offline'"),c);
  return {c,events,renders:()=>renders};
}

// Reproduce the original refresh bug with the real production loadCourses body.
{
  const {c}=setup();c.db.from=()=>({select:()=>({order:async()=>({data:[{id:course().id,name:course().name,holes:18,pars:Array(18).fill(4),greens:[]}],error:null})})});
  const before=JSON.stringify(c.s);await c.loadCourses();
  assert.equal(c.courses[0].greens.length,18,'a reconnect must preserve hydrated UUID-backed geometry');
  assert.equal(c.courses[0].parfolioCatalogId,'riverview','refresh must preserve catalog identity');
  assert.equal(JSON.stringify(c.s),before,'refresh must not change scores, putts or current hole');
}
// The playing round remains usable if the catalog object is replaced or removed.
{
  const {c}=setup();c.selectedRoundCourse();c.courses[0].greens=[];
  assert.equal(c.selectedRoundCourse().greens.length,18);
  c.courses=[];assert.equal(c.selectedRoundCourse().greens.length,18);
  c.s.courseId='other';c.s.course='Other Course';assert.equal(c.selectedRoundCourse(),undefined,'never reuse another course snapshot');
}
// New valid geometry wins; invalid geometry cannot replace the active snapshot.
{
  const {c}=setup();c.selectedRoundCourse();const replacement=course();replacement.greens[0].center.lat+=.001;c.courses=[replacement];
  assert.equal(c.selectedRoundCourse().greens[0].center.lat,replacement.greens[0].center.lat);
  c.courses[0].greens[0].center=null;assert.ok(c.selectedRoundCourse().greens[0].center);
}
// Overlapping reloads cannot let an older response overwrite a newer one.
{
  const {c}=setup();const finish=[];c.db.from=()=>({select:()=>({order:()=>new Promise(r=>finish.push(r))})});
  const old=c.loadCourses(),fresh=c.loadCourses();const latest=course();latest.name='Newest';
  finish[1]({data:[latest]});await fresh;finish[0]({data:[{...course(),name:'Stale'}]});await old;
  assert.equal(c.courses[0].name,'Newest');
}
// In-flight payload must hydrate the current record as well as its old object.
{
  const {c}=setup();const original=c.courses[0];original.greens=[];let finish;
  c.db.rpc=()=>new Promise(r=>finish=r);
  const request=c.ensureParFolioGpsCourseReady(original);
  const replacement={...original,greens:[]};c.courses=[replacement];
  const duplicate=c.ensureParFolioGpsCourseReady(replacement);
  finish({data:{catalog_id:'riverview',mapping_class:'gps_ready',holes:18,greens}});
  await Promise.all([request,duplicate]);assert.equal(replacement.greens.length,18);
}
// Recovery stays bounded after an error, can retry, and never touches scoring.
{
  const {c,renders}=setup();c.courses[0].greens=[];const before=JSON.stringify(c.s);
  assert.equal(await c.recoverRoundMap(),false);
  assert.match(c.missingRoundMapPanel(7),/Retry map/);
  assert.doesNotMatch(c.missingRoundMapPanel(7),/administrator needs to map/);
  const failedRenders=renders();assert.equal(await c.recoverRoundMap(),false);assert.equal(renders(),failedRenders,'no render/retry loop');
  c.db.rpc=async()=>({data:{catalog_id:'riverview',mapping_class:'gps_ready',holes:18,greens}});
  assert.equal(await c.recoverRoundMap(true),true);assert.equal(c.selectedRoundCourse().greens.length,18);
  assert.equal(JSON.stringify(c.s),before);
}
// Returning from the background retries a missing map without restarting the app.
{
  const {c,events}=setup();c.courses[0].greens=[];await c.recoverRoundMap();
  c.db.rpc=async()=>({data:{catalog_id:'riverview',mapping_class:'gps_ready',holes:18,greens}});
  events.visibilitychange();await new Promise(r=>setTimeout(r,5));assert.equal(c.selectedRoundCourse().greens.length,18);
}
// A late recovery cannot navigate or render over a different course.
{
  const {c,renders}=setup();c.courses[0].greens=[];let finish;c.db.rpc=()=>new Promise(r=>finish=r);
  const request=c.recoverRoundMap();c.s.courseId='other';c.s.course='Other';c.s.v='coursesView';const count=renders();
  finish({data:{catalog_id:'riverview',mapping_class:'gps_ready',holes:18,greens}});await request;
  assert.equal(renders(),count);assert.equal(c.s.courseId,'other');
}
// Connectivity transitions preserve all 18 holes and existing round state.
{
  const {c,events}=setup();const before=JSON.stringify(c.s);
  c.db.from=()=>({select:()=>({order:async()=>({data:[{...course(),greens:[]}],error:null})})});
  await events.online();assert.equal(JSON.stringify(c.s),before);
  for(let h=1;h<=18;h++){c.s.hole=h;assert.ok(c.selectedRoundCourse().greens[h-1].center);}
}
// A hung payload times out and releases the pending request so retry can succeed.
{
  const {c}=setup();c.courses[0].greens=[];c.setTimeout=(fn,ms)=>setTimeout(fn,Math.min(ms,15));
  c.db.rpc=()=>new Promise(()=>{});assert.equal(await c.recoverRoundMap(),false);
  c.db.rpc=async()=>({data:{catalog_id:'riverview',mapping_class:'gps_ready',holes:18,greens}});
  assert.equal(await c.recoverRoundMap(true),true);
}
// Shared-library hydration must not downgrade a validated round's geometry.
{
  const {c}=setup();c.courses[0].sharedCourseId='shared-river';
  c.supabase={createClient:()=>({rpc:async name=>name==='shared_course_catalog_page'
    ?{data:[{shared_course_id:'shared-river',name:course().name,mapping_status:'published'}]}
    :{data:{holes:9,mapping_status:'published',greens:greens.slice(0,9).map(g=>({...g,center:{lat:0,lng:0}}))}}})};
  const shared=fs.readFileSync(new URL('shared-course-library-v145.js',root),'utf8');
  vm.runInContext(shared.replace('setTimeout(()=>loadSharedCourseLibrary({rerender:true}),0);',''),c);
  await c.loadSharedCourseLibrary({rerender:false});
  assert.equal(c.courses[0].holes,18);assert.equal(c.courses[0].greens.length,18);assert.notEqual(c.courses[0].greens[0].center.lat,0);
}
// A background catalog refresh cannot replace a healthy playing map.
{
  const {c,renders}=setup();const before=JSON.stringify(c.s);
  c.parfolioLiveMapIsCurrent=()=>true;c.db.rpc=async()=>({data:[]});
  assert.equal(await c.loadParFolioUniversalCatalog(true),true);
  assert.equal(renders(),0);assert.equal(JSON.stringify(c.s),before);
}
console.log('Round map recovery: 12 interruption/regression scenarios passed.');

