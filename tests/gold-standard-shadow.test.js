const test=require('node:test');
const assert=require('node:assert/strict');
const {compare,summary,runSierraShadow,reconstruct,recoveryInput}=require('../lib/gps-rollout/gold-standard-shadow');
const course={id:'fixture',name:'Sierra Lakes Golf Club',city:'Fontana',country_code:'US',state_code:'CA',holes:18,latitude:34.1,longitude:-117.4,mapping_class:'gps_ready'};
const rows=Array.from({length:18},(_,i)=>({hole_number:i+1,tee_lat:34+i*.001,tee_lng:-117.4,green_center_lat:34+i*.001,green_center_lng:-117.397}));
const osm={elements:[{type:'way',id:1,tags:{leisure:'golf_course',name:course.name},center:{lat:34.1,lon:-117.4}},...rows.map(r=>({type:'way',id:100+r.hole_number,tags:{golf:'hole',ref:String(r.hole_number)},geometry:[{lat:r.tee_lat,lon:r.tee_lng},{lat:r.green_center_lat,lon:r.green_center_lng}]}))]};
function readFixture(onRead=()=>{}){return async(table,query)=>{onRead(table,query);assert.ok(['course_catalog','course_hole_geometry'].includes(table));return structuredClone(table==='course_catalog'?[course]:rows);};}
test('identical geometry scores zero and missing geometry is not zero-filled',()=>{
  const result=compare(rows,rows);assert.equal(result.metrics.combined.max_m,0);assert.equal(result.coverage.compared_holes,18);
  const missing=compare(rows,[]);assert.equal(missing.metrics.tee.mean_m,null);assert.equal(missing.holes.length,18);assert.equal(missing.coverage.missing_holes.length,18);
});
test('distance and summary formulas, including even median and nearest-rank P95',()=>{
  assert.deepEqual(summary([1,2,3,4]),{count:4,mean_m:2.5,median_m:2.5,p95_m:4,max_m:4,rmse_m:Math.sqrt(7.5)});
  const moved=structuredClone(rows);moved[0].tee_lat+=.001;
  assert.ok(Math.abs(compare(rows,moved).holes[0].tee_error_m-111.1949)<.01);
});
test('duplicate, null, out-of-range and invalid answer keys fail closed',()=>{
  for(const value of [null,'',NaN,91]){const bad=structuredClone(rows);bad[0].tee_lat=value;assert.throws(()=>compare(bad,[]));assert.throws(()=>compare(rows,bad));}
  assert.throws(()=>compare(rows,[rows[0],rows[0]]));assert.throws(()=>compare(rows.slice(1),[]));
});
test('swapped numbers flag sequence errors without silently rematching',()=>{
  const swapped=structuredClone(rows);[swapped[0].hole_number,swapped[1].hole_number]=[2,1];
  const report=compare(rows,swapped);assert.equal(report.holes[0].possible_sequence_mismatch,true);assert.ok(report.holes[0].green_error_m>100);
});
test('real recovery functions see only allowed metadata and original baseline remains untouched',async()=>{
  const calls=[];
  const report=await runSierraShadow({read:readFixture((t,q)=>calls.push([t,q])),recover:async input=>{
    assert.deepEqual(Object.keys(input).sort(),['id','name','holes','latitude','longitude','city','state_code','country_code'].sort());
    assert.equal(input.mapping_class,undefined);assert.ok(Object.isFrozen(input));
    return reconstruct(input,{fetchOsm:async()=>osm});
  }});
  assert.equal(report.status,'compared');assert.equal(report.metrics.combined.max_m,0);assert.equal(report.promotable,false);assert.equal(report.promoted,0);assert.equal(report.production_integrity.unchanged,true);assert.equal(calls.length,4);
});
test('changed verified data or catalog state invalidates the benchmark',async()=>{
  for(const tableToChange of ['course_hole_geometry','course_catalog']){
    const counts={};const read=async(table)=>{counts[table]=(counts[table]||0)+1;const data=structuredClone(table==='course_catalog'?[course]:rows);if(table===tableToChange&&counts[table]>1){if(table==='course_catalog')data[0].mapping_class='incomplete';else data[0].tee_lat+=.0001;}return data;};
    await assert.rejects(runSierraShadow({read,recover:async()=>({rows})}),{code:'benchmark_changed_during_run'});
  }
});
test('ambiguous benchmark and invalid protected status reject before recovery',async()=>{
  for(const data of [[course,course],[{...course,mapping_class:'incomplete'}],[{...course,city:'other'}]])await assert.rejects(runSierraShadow({read:async()=>data,recover:()=>assert.fail('must not recover')}));
});
test('duplicate OSM holes and partial source responses fail closed',async()=>{
  const duplicate=await reconstruct(recoveryInput(course),{fetchOsm:async()=>({elements:[...osm.elements,osm.elements[1]]})});
  assert.equal(duplicate.rows.length,0);assert.equal(duplicate.classification.status,'review');
  await assert.rejects(reconstruct(recoveryInput(course),{fetchOsm:async()=>({...osm,remark:'timeout'})}));
});
test('network failure produces a redacted failure report and verifies preservation',async()=>{
  const report=await runSierraShadow({read:readFixture(),recover:async()=>{throw new Error('secret-value');}});
  assert.equal(report.status,'failed');assert.equal(report.production_integrity.unchanged,true);assert.equal(report.metrics.combined.count,0);assert.ok(!JSON.stringify(report).includes('secret-value'));
});
test('identity review is retained when diagnostic coordinates can be compared',async()=>{
  const raw=structuredClone(osm);raw.elements[0].tags.name='Sierra Lakes';
  const report=await runSierraShadow({read:readFixture(),recover:c=>reconstruct(c,{fetchOsm:async()=>raw})});
  assert.equal(report.status,'compared_requires_review');assert.equal(report.classification.status,'review');assert.equal(report.coverage.compared_holes,18);assert.equal(report.promotable,false);
});
test('changing the answer key cannot change reconstruction inputs or results',async()=>{
  const inputs=[],outputs=[];
  for(const offset of [0,.0001]){
    const answer=rows.map(r=>({...r,tee_lat:r.tee_lat+offset}));
    await runSierraShadow({read:async t=>structuredClone(t==='course_catalog'?[course]:answer),recover:async c=>{inputs.push(c);const r=await reconstruct(c,{fetchOsm:async()=>osm});outputs.push(r.rows);return r;}});
  }
  assert.deepEqual(inputs[0],inputs[1]);assert.deepEqual(outputs[0],outputs[1]);
});
test('live default path permits only database GETs and free Overpass queries',async()=>{
  const originalFetch=global.fetch;
  const old={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY};
  process.env.SUPABASE_URL='https://unsysuuhykdmbsasdhzg.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_fixture';
  const calls=[];
  global.fetch=async(url,options={})=>{
    const parsed=new URL(url);calls.push({url,options});
    if(parsed.hostname==='unsysuuhykdmbsasdhzg.supabase.co'){
      assert.equal(options.method||'GET','GET');assert.ok(['/rest/v1/course_catalog','/rest/v1/course_hole_geometry'].includes(parsed.pathname));
      return {ok:true,json:async()=>structuredClone(parsed.pathname.endsWith('course_catalog')?[course]:rows)};
    }
    assert.ok(['overpass-api.de','overpass.kumi.systems'].includes(parsed.hostname));assert.equal(options.method,'POST');assert.equal(options.headers.apikey,undefined);assert.equal(options.redirect,'error');
    assert.ok(!options.body.includes('tee_lat'));
    return {ok:true,json:async()=>osm};
  };
  try{const report=await runSierraShadow();assert.equal(report.coverage.compared_holes,18);assert.equal(calls.length,5);}
  finally{global.fetch=originalFetch;for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
