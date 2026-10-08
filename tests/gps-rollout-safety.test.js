const test=require('node:test');
const assert=require('node:assert/strict');
const {validateTeeCenterCourse}=require('../lib/gps-rollout/gps-rollout-engine');
const {missingHoles}=require('../lib/gps-rollout/gps-rollout-processor');
const {createPromotionAdapter}=require('../lib/gps-rollout/gps-rollout-promotion-adapter');
const {createSupabaseRolloutStore}=require('../lib/gps-rollout/gps-rollout-supabase-store');
const {runBatch}=require('../lib/gps-rollout/gps-rollout-controller');
const rows=()=>Array.from({length:9},(_,i)=>({hole_number:i+1,tee_lat:26+i*.005,tee_lng:-80,green_center_lat:26.002+i*.005,green_center_lng:-80}));

test('missing values cannot be coerced into valid equatorial coordinates',()=>{
  for(const v of [null,'','  ',false,undefined]){
    const geometry=rows();geometry[0]={...geometry[0],tee_lat:v,green_center_lat:0.002};
    assert.equal(validateTeeCenterCourse(geometry,9).ok,false);
    assert.deepEqual(missingHoles(geometry,9),[1]);
  }
});
test('invalid Level-2 geometry never reaches the publishing RPC',async()=>{
  let calls=0;
  const adapter=createPromotionAdapter({rpc:async()=>{calls++;return {data:{status:'promoted'}};}});
  const valid=rows();
  for(const geometry of [valid.slice(1),[...valid.slice(0,8),valid[0]],valid.map(r=>({...r,green_center_lat:r.tee_lat}))]){
    await assert.rejects(adapter.promoteValidated({candidate:{id:'course',holes:9},decision:{rows:geometry}}),/promotion_validation_failed/);
  }
  assert.equal(calls,0);
  await adapter.promoteValidated({candidate:{id:'course',holes:9},decision:{rows:valid}});
  assert.equal(calls,1);
});

// This fake applies conditional writes atomically, as Postgres does, while
// giving both racing callers the same initial SELECT snapshot.
function regionDb(initial){
  let row=initial?{...initial}:null;
  return {get row(){return row;},from(){
    let operation='read',payload,filters=[];
    const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},is(k,v){filters.push([k,v]);return q;},
      maybeSingle:async()=>({data:row?{...row}:null}),
      update(v){operation='update';payload=v;return q;},insert(v){operation='insert';payload=v;return q;},
      then(resolve,reject){return Promise.resolve().then(()=>{
        if(operation==='insert'){if(row)return{error:{code:'23505'}};row={...payload};return{data:[row]};}
        if(operation==='update'&&row&&filters.every(([k,v])=>row[k]===v)){Object.assign(row,payload);return{data:[{...row}]};}
        return{data:[]};
      }).then(resolve,reject);}};
    return q;
  }};
}
test('simultaneous acquisition has exactly one owner for new and expired regions',async()=>{
  for(const initial of [null,{rollout_key:'US:FL',status:'ready',lease_token:'old',lease_expires_at:'2000-01-01T00:00:00Z'}]){
    const db=regionDb(initial),store=createSupabaseRolloutStore(db);
    const leases=await Promise.all([store.acquireLease('US:FL'),store.acquireLease('US:FL')]);
    assert.equal(leases.filter(x=>x.acquired).length,1);
    const owner=leases.find(x=>x.acquired);
    await store.releaseLease('US:FL',{token:'wrong'});
    assert.equal(db.row.lease_token,owner.token);
    await store.releaseLease('US:FL',owner);
    assert.equal(db.row.lease_token,null);
  }
});
test('completed regions remain complete and do not restart processing',async()=>{
  const db=regionDb({rollout_key:'US:FL',status:'complete',lease_token:null,lease_expires_at:null,cursor_course_id:'last'});
  const store=createSupabaseRolloutStore(db);
  const result=await runBatch({region:{country_code:'US',state_code:'FL'},store,processor:{processCandidate(){assert.fail('must not reprocess');}}});
  assert.equal(result.completed,true);
  assert.equal(db.row.status,'complete');
  assert.equal(db.row.lease_token,null);
});
