/*
 * Persistent batch/resume semantics for the ParFolio GPS Rollout Engine.
 * Storage is injected so this controller can use Supabase without coupling
 * the rollout rules to the UI or a specific region.
 */
const DEFAULT_BATCH_SIZE=50;

function normalizeRegion(input={}) {
  const country=String(input.country_code||'US').trim().toUpperCase();
  const state=input.state_code==null?null:String(input.state_code).trim().toUpperCase();
  if(!country) throw new Error('country_code is required');
  if(country==='US'&&!state) throw new Error('state_code is required for US rollouts');
  return {country_code:country,state_code:state};
}

function rolloutKey(region){
  return [region.country_code,region.state_code].filter(Boolean).join(':');
}

async function runBatch({region,batchSize=DEFAULT_BATCH_SIZE,store,processor}) {
  if(!store||!processor) throw new Error('store and processor are required');
  region=normalizeRegion(region);
  const key=rolloutKey(region);
  const size=Math.max(1,Math.min(100,Number(batchSize)||DEFAULT_BATCH_SIZE));

  /* Atomic lease prevents overlapping cron/manual runs for the same region. */
  const lease=await store.acquireLease(key);
  if(!lease?.acquired) return {ok:true,skipped:true,reason:'region_already_running',region:key};

  let batch;
  try {
    const state=(await store.getState(key))||{cursor:null,completed:false};
    if(state.completed) return {ok:true,completed:true,region:key,cursor:state.cursor};

    batch=await store.beginBatch({region,key,cursor:state.cursor,batch_size:size});
    const candidates=await store.nextCandidates({region,cursor:state.cursor,limit:size});

    if(!candidates.length){
      await store.completeRegion({key,cursor:state.cursor,batch_id:batch.id});
      return {ok:true,completed:true,region:key,processed:0};
    }

    const stats={processed:0,promoted:0,preserved:0,review:0,failed:0};
    let cursor=state.cursor;

    for(const candidate of candidates){
      try{
        const result=await processor.processCandidate({region,candidate,batch_id:batch.id});
        stats.processed++;
        if(result?.status==='promoted')stats.promoted++;
        else if(result?.status==='preserved')stats.preserved++;
        else stats.review++;
        cursor=candidate.id;
        await store.checkpoint({key,cursor,batch_id:batch.id,stats});
      }catch(error){
        stats.failed++;
        cursor=candidate.id;
        await store.recordFailure({key,cursor,batch_id:batch.id,candidate,error:String(error?.message||error)});
        await store.checkpoint({key,cursor,batch_id:batch.id,stats});
      }
    }

    await store.finishBatch({key,cursor,batch_id:batch.id,stats});
    return {ok:true,completed:false,region:key,cursor,...stats};
  } catch(error) {
    if(batch?.id) await store.failBatch({batch_id:batch.id,error:String(error?.message||error)});
    throw error;
  } finally {
    await store.releaseLease(key,lease);
  }
}

module.exports={DEFAULT_BATCH_SIZE,normalizeRegion,rolloutKey,runBatch};
