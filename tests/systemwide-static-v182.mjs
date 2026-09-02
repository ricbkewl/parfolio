import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js'),html=read('index.html'),loader=read('parfolio-google-vector-v149.js'),sw=read('service-worker.js');

const localRefs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(match=>match[1].split('?')[0])
  .filter(ref=>!/^https?:/i.test(ref));
for(const ref of new Set(localRefs))assert.ok(fs.existsSync(path.join(root,ref)),`index asset is missing: ${ref}`);

const appShell=new Set([...sw.matchAll(/'\.\/([^']*)'/g)].map(match=>match[1]));
for(const ref of new Set(localRefs))assert.ok(appShell.has(ref),`offline shell is missing: ${ref}`);
assert.match(sw,/ignoreSearch:true/,'versioned asset requests must match the offline shell');
assert.match(sw,/parfolio-v182-/,'service-worker cache must use the v182 namespace');

assert.match(app,/function playedScoreSummary\(/,'partial score helper is required');
assert.match(app,/summary\.relative/,'live scorecard must compare score with played-hole par');
assert.doesNotMatch(app,/total\(x\)-parTotal\(s\.holes\)/,'live scorecard must not compare a partial score with full-round par');

assert.match(loader,/loading:'async'/,'Google Maps loader must request asynchronous loading');
assert.match(loader,/libraries:'marker'/,'Google Maps loader must include the advanced marker library');
assert.match(app,/function moveGoogleCamera\(/,'all live camera overrides need one capability boundary');
assert.match(app,/renderingType:google\.maps\.RenderingType\.VECTOR/,'live satellite map must use the vector camera');
assert.match(read('play-camera-v137.js'),/center:pointBetween\(tee,green\.center,\.5\)/,'hole camera must center tee-to-green');
assert.match(read('play-camera-v137.js'),/heading:bearingDegrees\(tee,green\.center\)/,'hole camera must place the tee and green on the 6–12 axis');
assert.match(read('hole-flyover-v129.js'),/const FLYOVER_MS=/,'between-hole helicopter transition must remain enabled');
for(const file of ['play-v108.js','play-camera-v137.js','hole-flyover-v129.js']){
  const source=read(file);
  assert.doesNotMatch(source,/\.moveCamera\(/,`${file} bypasses the shared camera capability boundary`);
}
for(const file of fs.readdirSync(root).filter(file=>file.endsWith('.js'))){
  assert.doesNotMatch(read(file),/new google\.maps\.Marker\s*\(/,`${file} still uses deprecated google.maps.Marker`);
}

for(const legacyRpc of ['create_parfolio_round','join_parfolio_round','resume_parfolio_round']){
  assert.doesNotMatch(app,new RegExp(`rpc\\(['\"]${legacyRpc}`),`frontend still calls retired RPC ${legacyRpc}`);
}

console.log(`ParFolio v182 static checks passed: ${new Set(localRefs).size} index assets covered offline.`);
