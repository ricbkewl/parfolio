const test=require('node:test');const assert=require('node:assert/strict');
const {buildNumberedRefreshReport,fetchNumberedRefreshReport}=require('../lib/gps-rollout/numbered-osm-refresh');
const fixture=require('./fixtures/talamore-numbered-refresh.json');
const snapshot=require('../audit/2026-10-20-talamore-existing-snapshot.json');
const {runSourceFirstRecovery}=require('../lib/gps-rollout/source-first-recovery');
function input(){return structuredClone({...fixture,course:snapshot.course,existingRows:snapshot.rows,holeCountEvidence:{course_id:snapshot.course.id,holes:18,verified:true,source_url:'https://talamoregolfresort.com/talamore-golf-club/'}});}
test('Talamore source refresh completes 18-hole candidate and preserves all 17 rows',()=>{
 const x=input(),r=buildNumberedRefreshReport(x);
 assert.equal(r.status,'complete_candidate_requires_review');assert.deepEqual(r.missing_before,[12]);
 assert.equal(r.proposals[0].osm_hole_uri,'https://www.openstreetmap.org/way/1087502869');
 assert.equal(r.whole_course_validation.ok,true);assert.equal(r.promotable,false);assert.equal(r.armed,false);
 assert.deepEqual(r.combined_rows.filter(h=>h.hole_number!==12),x.existingRows);
});
test('unknown hole count and protected courses stop before any fetch',async()=>{
 for(const mutate of [x=>delete x.holeCountEvidence,x=>x.course.mapping_class='gps_ready',x=>x.course.osm_course_uri='https://attacker.test/way/1']){
  const x=input();mutate(x);let calls=0;
  const r=await fetchNumberedRefreshReport(x,{fetchImpl:async()=>{calls++;throw Error('unexpected');}});
  assert.equal(r.status,'review');assert.equal(calls,0);
 }
});
test('duplicate numbering and reversed tee/green endpoints cannot fill missing hole',()=>{
 for(const mutate of [x=>{const w=x.mapData.elements.find(e=>e.tags?.golf==='hole');x.mapData.elements.push({...w,id:w.id+100});},x=>x.mapData.elements.find(e=>e.tags?.golf==='hole').nodes.reverse()]){
  const x=input();mutate(x);const r=buildNumberedRefreshReport(x);assert.equal(r.proposals.length,0);assert.equal(r.whole_course_validation.ok,false);
 }
});
test('missing nodes, wrong identity and duplicate existing rows fail closed',()=>{
 for(const mutate of [x=>x.mapData.elements.shift(),x=>x.course.name='Unrelated Resort',x=>x.existingRows.push(x.existingRows[0])]){
  const x=input();mutate(x);const r=buildNumberedRefreshReport(x);assert.equal(r.status,'review');assert.deepEqual(r.proposals,[]);
 }
});
test('bounded public retrieval produces report and provenance without writes',async()=>{
 const x=input(),calls=[];
 const r=await fetchNumberedRefreshReport(x,{fetchImpl:async(url,opts)=>{
  calls.push(url);assert.equal(opts.redirect,'error');assert.ok(opts.signal);
  return new Response(JSON.stringify(url.includes('/full.json')?x.boundaryData:x.mapData));
 }});
 assert.equal(calls.length,2);assert.ok(calls.every(url=>url.startsWith('https://api.openstreetmap.org/api/0.6/')));
 assert.equal(r.status,'complete_candidate_requires_review');assert.equal(r.sources[1].sha256.length,64);
});
test('oversized response and HTTP failure stop refresh without fallback requests',async()=>{
 for(const response of [()=>new Response('x',{headers:{'content-length':'9000000'}}),()=>new Response('',{status:429})]){
  let calls=0;const r=await fetchNumberedRefreshReport(input(),{fetchImpl:async()=>{calls++;return response();}});
  assert.equal(r.status,'review');assert.deepEqual(r.proposals,[]);assert.equal(calls,1);
 }
});
test('source-first orchestration skips AI on complete candidate or source review',async()=>{
 for(const numbered of [buildNumberedRefreshReport(input()),{status:'review',reason:'invalid_hole_count'}]){
  const r=await runSourceFirstRecovery(input(),{refresh:async()=>numbered,visualReport:async()=>{throw Error('AI must not run');}});
  assert.equal(r.visual,null);assert.equal(r.promotable,false);
 }
});
test('visual handoff requests only unresolved holes and labels source candidates separately',async()=>{
 const x=input(),calls=[];
 const numbered={status:'incomplete',missing_before:[12,13],proposals:[{hole_number:12,accepted:false}]};
 const r=await runSourceFirstRecovery(x,{refresh:async()=>{calls.push('source');return numbered;},visualReport:async args=>{
  calls.push('visual');assert.deepEqual(args.missing_holes,[13]);assert.deepEqual(args.existingRows,x.existingRows);assert.equal(args.report_only,true);assert.deepEqual(args.numbered_candidates,numbered.proposals);return {status:'insufficient_evidence'};
 }});
 assert.deepEqual(calls,['source','visual']);assert.equal(r.promotable,false);
});
