'use strict';
/* Offline-capable diagnostic: no staging, promotion, imagery or AI dependencies. */
const {createHash}=require('node:crypto');
const {select}=require('./read-only-supabase');
const {fetchOne,rowsFor}=require('./authoritative-osm-input');
const {classifyAuthoritativeStage}=require('./authoritative-stage-classifier');
const {hav,recoverFromHoleTraceEndpoints}=require('./osm-feature-recovery');
const {validateTeeCenterCourse}=require('./gps-rollout-engine');
const FIELDS=['tee_lat','tee_lng','green_center_lat','green_center_lng'];
function fail(code){throw Object.assign(new Error(code),{code});}
function digest(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
function snapshot(rows){return digest(canonical([...rows].sort((a,b)=>Number(a.hole_number)-Number(b.hole_number))));}
function validCoordinate(v,max){return typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=max;}
function validRow(r){return FIELDS.every((k,i)=>validCoordinate(r[k],i%2?180:90))&&!(r.tee_lat===0&&r.tee_lng===0)&&!(r.green_center_lat===0&&r.green_center_lng===0);}
function summary(values){
  if(!values.length)return {count:0,mean_m:null,median_m:null,p95_m:null,max_m:null,rmse_m:null};
  const sorted=[...values].sort((a,b)=>a-b),n=sorted.length;
  return {count:n,mean_m:values.reduce((a,b)=>a+b,0)/n,median_m:n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2,p95_m:sorted[Math.ceil(n*.95)-1],max_m:sorted[n-1],rmse_m:Math.sqrt(values.reduce((s,v)=>s+v*v,0)/n)};
}
function compare(baseline,recovered){
  if(baseline.length!==18||baseline.some(r=>!validRow(r))||!validateTeeCenterCourse(baseline,18).ok)fail('invalid_verified_answer_key');
  const seen=new Set();
  for(const r of recovered){if(!Number.isInteger(r.hole_number)||r.hole_number<1||r.hole_number>18||seen.has(r.hole_number)||!validRow(r))fail('invalid_recovered_geometry');seen.add(r.hole_number);}
  const holes=[...baseline].sort((a,b)=>a.hole_number-b.hole_number).map(b=>{
    const r=recovered.find(r=>r.hole_number===b.hole_number);
    if(!r)return {hole_number:b.hole_number,status:'missing',tee_error_m:null,green_error_m:null};
    const tee={lat:r.tee_lat,lng:r.tee_lng},green={lat:r.green_center_lat,lng:r.green_center_lng};
    const distances=baseline.map(x=>({hole_number:x.hole_number,d:hav(green,{lat:x.green_center_lat,lng:x.green_center_lng})})).sort((a,b)=>a.d-b.d);
    return {hole_number:b.hole_number,status:'compared',tee_error_m:hav(tee,{lat:b.tee_lat,lng:b.tee_lng}),green_error_m:hav(green,{lat:b.green_center_lat,lng:b.green_center_lng}),nearest_verified_green_hole:distances[0].hole_number,possible_sequence_mismatch:distances[0].hole_number!==b.hole_number,recovered:r,verified:Object.fromEntries(FIELDS.map(k=>[k,b[k]]))};
  });
  const matched=holes.filter(h=>h.status==='compared');
  return {coverage:{expected_holes:18,compared_holes:matched.length,missing_holes:holes.filter(h=>h.status==='missing').map(h=>h.hole_number)},metrics:{tee:summary(matched.map(h=>h.tee_error_m)),green:summary(matched.map(h=>h.green_error_m)),combined:summary(matched.flatMap(h=>[h.tee_error_m,h.green_error_m]))},holes};
}
// Explicit allowlist: GPS-ready status and verified geometry never reach recovery.
function recoveryInput(course){return Object.freeze(Object.fromEntries(['id','name','holes','latitude','longitude','city','state_code','country_code'].map(k=>[k,course[k]])));}
async function reconstruct(course,{fetchOsm=fetchOne}={}){
  const raw=await fetchOsm(course,0);
  if(!Array.isArray(raw?.elements)||raw.remark)fail('incomplete_osm_response');
  const staged=rowsFor(course,raw);
  const classification=classifyAuthoritativeStage({course,...staged});
  // Diagnostics can score an unapproved candidate, but never choose among duplicate traces.
  // Keep the production classifier's review decision verbatim; scoring is not approval.
  const strict=staged.holeRows.length===18&&staged.holeRows.every(r=>/^(?:[1-9]|1[0-8])$/.test(String(r.raw?.tags?.ref||'')))&&new Set(staged.holeRows.map(r=>r.hole_number)).size===18;
  const diagnostic=strict?recoverFromHoleTraceEndpoints({rows:staged.holeRows,declaredHoles:18}):{ok:false,rows:[]};
  return {rows:diagnostic.ok?diagnostic.rows:[],classification,source:{provider:'openstreetmap',query_radius_m:1600,sha256:digest(raw),osm_base:raw.osm3s?.timestamp_osm_base||null,course_objects:staged.courseRows.length,hole_objects:staged.holeRows.length,feature_objects:staged.featureRows.length},raw};
}
async function runSierraShadow({read=select,recover=reconstruct}={}){
  const query={select:'id,name,city,state_code,country_code,latitude,longitude,holes,mapping_class',name:'ilike.*Sierra Lakes*',country_code:'eq.US',state_code:'eq.CA',is_active:'eq.true',limit:'100'};
  const matches=await read('course_catalog',query);
  if(!Array.isArray(matches)||matches.length!==1)fail('sierra_lakes_identity_requires_review');
  const course=matches[0];
  if(!/^sierra lakes(?: golf club)?$/i.test(course.name)||course.country_code!=='US'||course.state_code!=='CA'||!/^fontana$/i.test(course.city)||Number(course.holes)!==18||!['gps_ready','verified_gps','published'].includes(course.mapping_class)||!validCoordinate(course.latitude,90)||!validCoordinate(course.longitude,180))fail('invalid_sierra_lakes_benchmark');
  const geometryQuery={select:'*',course_id:'eq.'+course.id,order:'hole_number',limit:'100'};
  const before=await read('course_hole_geometry',geometryQuery);
  compare(before,[]); // Validate the answer key before network work; never pass it to recovery.
  const beforeHash=snapshot(before);
  let result,error=null;
  try{result=await recover(recoveryInput(course));}catch(e){error='authoritative_recovery_failed';}
  const after=await read('course_hole_geometry',geometryQuery);
  const afterCourse=await read('course_catalog',{...query,id:'eq.'+course.id});
  const unchanged=beforeHash===snapshot(after)&&digest(canonical(matches))===digest(canonical(afterCourse));
  if(!unchanged)fail('benchmark_changed_during_run');
  const comparison=compare(before,result?.rows||[]);
  const uri=value=>String(value||'').replace(/^osm:(way|node|relation):/, 'https://www.openstreetmap.org/$1/');
  const shared=before.filter(b=>b.osm_hole_uri&&(result?.rows||[]).some(r=>r.hole_number===b.hole_number&&uri(r.osm_hole_uri)===uri(b.osm_hole_uri))).length;
  const baseline_provenance={sources:[...new Set(before.map(r=>r.source||'unknown'))],validation_states:[...new Set(before.map(r=>r.validation_state||'unknown'))],shared_osm_hole_uris:shared,independent_ground_truth:false};
  return {schema_version:1,mode:'gold_standard_shadow',generated_at:new Date().toISOString(),benchmark:course,baseline_provenance,read_only:true,report_only:true,armed:false,promotable:false,promoted:0,status:error?'failed':comparison.coverage.compared_holes===18?(result.classification?.status==='promotable'?'compared':'compared_requires_review'):'requires_review',error,production_integrity:{before_sha256:beforeHash,after_sha256:snapshot(after),unchanged},recovery_input:recoveryInput(course),classification:result?.classification||null,source:result?.source||null,...comparison,warnings:['Errors measure agreement with the verified answer key, not surveyed positional accuracy.','The answer key may share OSM provenance; this is not an independent imagery accuracy test.','Trace endpoints may represent a different tee choice or green point; no best-fit rematching is performed.','Scored candidates remain unapproved whenever the production classifier requires review.','Missing or ambiguous OSM data stays unresolved. No paid imagery or AI fallback is enabled.'],source_snapshot:result?.raw||null};
}
function markdown(report){
  const f=v=>v==null?'—':v.toFixed(2);
  const provenance=`Answer-key sources: ${report.baseline_provenance.sources.join(', ')}. Hole validation states: ${report.baseline_provenance.validation_states.join(', ')}. Shared OSM hole identifiers: ${report.baseline_provenance.shared_osm_hole_uris}/18. Independent ground truth: not established.`;
  return ['# Sierra Lakes Gold Standard / Shadow Test','',`Run: ${report.generated_at}`,`Status: ${report.status}`,`Coverage: ${report.coverage.compared_holes}/18 holes`,`Production snapshot unchanged: ${report.production_integrity.unchanged}`,'','Reconstruction: existing OSM staging classifier and hole-trace endpoint recovery. Report only; zero promotions.','',provenance,'',('Execution: '+(report.execution||'live_read_only')),'','| Point | Count | Mean (m) | Median (m) | P95 (m) | Max (m) | RMSE (m) |','|---|---:|---:|---:|---:|---:|---:|',...Object.entries(report.metrics).map(([k,v])=>`| ${k} | ${v.count} | ${f(v.mean_m)} | ${f(v.median_m)} | ${f(v.p95_m)} | ${f(v.max_m)} | ${f(v.rmse_m)} |`),'','| Hole | Status | Tee error (m) | Green error (m) | Sequence flag |','|---|---|---:|---:|---|',...report.holes.map(h=>`| ${h.hole_number} | ${h.status} | ${f(h.tee_error_m)} | ${f(h.green_error_m)} | ${h.possible_sequence_mismatch?'review':'—'} |`),'',`Classifier: ${report.classification?.reason||report.error||'unavailable'}`,'',...report.warnings.map(w=>'- '+w),'','Before SHA-256: '+report.production_integrity.before_sha256,'After SHA-256: '+report.production_integrity.after_sha256,''].join('\n');
}
module.exports={runSierraShadow,reconstruct,recoveryInput,compare,summary,snapshot,markdown};
