import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js'),html=read('index.html'),googleClean=read('google-maps-clean-v269.js'),camera=read('parfolio-camera-flyover-v270.js'),sw=read('service-worker.js');
const publicConfig=JSON.parse(read('parfolio-public-config.json'));

const localRefs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(match=>match[1].split('?')[0])
  .filter(ref=>!/^https?:/i.test(ref));
for(const ref of new Set(localRefs))assert.ok(fs.existsSync(path.join(root,ref)),`index asset is missing: ${ref}`);

const appShell=new Set([...sw.matchAll(/'\.\/([^']*)'/g)].map(match=>match[1]));
for(const ref of appShell)assert.ok(!ref||fs.existsSync(path.join(root,ref)),`offline shell references a missing asset: ${ref}`);
for(const ref of ['','index.html','manifest.webmanifest','app.js','tennessee-catalog-v255.js'])assert.ok(appShell.has(ref),`offline core shell is missing: ${ref||'site root'}`);
assert.match(sw,/ignoreSearch:true/,'versioned asset requests must match the offline shell');
assert.ok(Number(sw.match(/parfolio-v(\d+)-/)?.[1])>=255,'service-worker cache must include the Tennessee release');
const courseMapBrowser=read('course-map-browser-v163.js');
assert.match(courseMapBrowser,/await window\.loadGoogleMaps\(\)/,'the course browser must use the shared Google Maps loader');
assert.match(courseMapBrowser,/new google\.maps\.Map\(/,'the course browser must initialize a Google map');
assert.doesNotMatch(courseMapBrowser,/\bL\.(?:map|tileLayer)\(/,'the production course browser must not depend on Leaflet');
const configuredGoogleKey=app.match(/const GOOGLE_MAPS_API_KEY = '([^']*)';/)?.[1];
assert.equal(configuredGoogleKey,publicConfig.google_maps_browser_key,'the live app and ParFolio public configuration must use the same Google Maps browser key');

const nyGeometry=JSON.parse(read('data/ny-osm-gps-drafts-v159.json'));
const nyMappings=Object.values(nyGeometry.courses||{});
const validPoint=point=>point&&Number.isFinite(Number(point.lat))&&Number.isFinite(Number(point.lng))&&Math.abs(Number(point.lat))<=90&&Math.abs(Number(point.lng))<=180&&!(Number(point.lat)===0&&Number(point.lng)===0);
const usableNyMappings=nyMappings.filter(mapping=>(mapping.greens||[]).some(hole=>validPoint(hole.tee)&&validPoint(hole.center)));
assert.equal(nyMappings.length,551,'NY geometry source count changed unexpectedly');
assert.equal(usableNyMappings.length,551,'every NY geometry source needs at least one valid tee/center pair');
assert.equal(usableNyMappings.reduce((sum,mapping)=>sum+(mapping.greens||[]).filter(hole=>validPoint(hole.tee)&&validPoint(hole.center)).length,0),8343,'NY mapped-hole count changed unexpectedly');
const nyLoader=read('ny-gps-draft-loader-v159.js');
assert.match(nyLoader,/hydrateAllNyGpsGeometry/,'NY geometry must hydrate the golfer-facing catalog');
assert.match(nyLoader,/lat===0&&lng===0/,'NY geometry must reject the null-island coordinate');
assert.match(nyLoader,/autoPublishRegionalGps/,'complete NY geometry must enter the regional publication policy');

const corrections=read('course-corrections-v147.js');
assert.match(corrections,/p_source_app:'parfolio'/,'shared corrections must identify ParFolio as the source app');
assert.match(corrections,/submit_parfolio_course_correction/,'catalog-only courses must have a correction submission path');
assert.match(corrections,/courseCorrectionButton/,'correction control must be reusable by all course views');
const smartSearch=read('smart-course-search-v176.js'),smartSearchCss=read('smart-course-search-v176.css');
assert.match(smartSearch,/smartCourseGpsState/,'course search needs one reusable GPS state classifier');
assert.match(smartSearch,/No GPS Location/,'courses without geometry or location need an explicit red state');
assert.match(smartSearch,/search\.relevance\+gps\.priority/,'search ranking must boost GPS-ready courses');
assert.match(smartSearch,/smart-search-status/,'autocomplete suggestions need a floating GPS state');
assert.match(smartSearchCss,/smart-search-status\.ready/,'GPS-ready suggestions need a green state');
assert.match(smartSearchCss,/smart-search-status\.located/,'located suggestions need a yellow state');
assert.match(smartSearchCss,/smart-search-status\.missing/,'unlocated suggestions need a red state');
const correctionMigration=read('supabase/migrations/20260902000003_parfolio_v183_course_corrections.sql')+read('supabase/migrations/20260902000004_parfolio_v183_course_correction_invoker.sql');
assert.match(correctionMigration,/enable row level security/i,'course corrections must use row-level security');
assert.match(correctionMigration,/security invoker/i,'course correction RPC must execute as its caller');

assert.match(app,/function playedScoreSummary\(/,'partial score helper is required');
assert.match(app,/score-playedPar/,'live scorecard must compare score with played-hole par');
assert.doesNotMatch(app,/total\(x\)-parTotal\(s\.holes\)/,'live scorecard must not compare a partial score with full-round par');

assert.match(html,/google-maps-clean-v269\.js/,'the active Google-only renderer must be loaded');
assert.doesNotMatch(html,/parfolio-google-vector-v149\.js|google-marker-compat-v263\.js/,'retired Google renderer layers must not be loaded');
assert.match(googleClean,/Google Maps is the only map provider/,'the active renderer must preserve the Google-only policy');
assert.match(googleClean,/loading=async&callback=/,'Google Maps must request asynchronous loading');
assert.match(googleClean,/window\.loadGoogleMaps=function/,'the active renderer must install the shared Google Maps loader');
assert.match(googleClean,/new google\.maps\.Map\(/,'the active renderer must initialize Google maps');
assert.doesNotMatch(googleClean,/\bL\.(?:map|tileLayer)\(/,'the active renderer must not depend on Leaflet');
assert.match(camera,/center:pointBetween\(tee,center,\.5\)/,'the active camera must center tee-to-green');
assert.match(camera,/heading:bearingDegrees\(tee,center\)/,'the active camera must place tee and green on the 6–12 axis');
assert.match(camera,/No flyover animation/,'the active camera must preserve the stable static-camera policy');

for(const legacyRpc of ['create_parfolio_round','join_parfolio_round','resume_parfolio_round']){
  assert.doesNotMatch(app,new RegExp(`rpc\\(['\"]${legacyRpc}`),`frontend still calls retired RPC ${legacyRpc}`);
}

console.log(`ParFolio static checks passed: ${new Set(localRefs).size} index assets exist, the core offline shell is valid, and GPS-prioritized search data is validated.`);
