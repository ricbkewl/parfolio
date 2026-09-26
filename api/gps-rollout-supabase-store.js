/*
 * Supabase persistence adapter for ParFolio GPS rollout controller.
 * Requires a server-only Supabase client with privileged DB access.
 * Never import this module into browser code.
 */
const crypto=require('crypto');

function createSupabaseRolloutStore(db){
  if(!db)throw new Error('Supabase client required');
  const now=()=>new Date().toISOString();

  return {
    async acquireLease(key){
      const token=crypto.randomUUID(),expires=new Date(Date.now()+15*60*1000).toISOString();
      const {data:current,error:e1}=await db.from('gps_rollout_regions').select('*').eq('rollout_key',key).maybeSingle();
      if(e1)throw e1;
      if(current?.lease_expires_at&&Date.parse(current.lease_expires_at)>Date.now())return{acquired:false};
      const [country_code,state_code=null]=key.split(':');
      const row={rollout_key:key,country_code,state_code,status:'running',lease_token:token,lease_expires_at:expires,started_at:current?.started_at||now(),updated_at:now()};
      const {error}=await db.from('gps_rollout_regions').upsert(row,{onConflict:'rollout_key'});if(error)throw error;
      return{acquired:true,token,expires_at:expires};
    },
    async releaseLease(key,lease){
      if(!lease?.token)return;
      const {error}=await db.from('gps_rollout_regions').update({lease_token:null,lease_expires_at:null,updated_at:now()}).eq('rollout_key',key).eq('lease_token',lease.token);
      if(error)throw error;
    },
    async getState(key){
      const {data,error}=await db.from('gps_rollout_regions').select('*').eq('rollout_key',key).maybeSingle();if(error)throw error;
      return data?{cursor:data.cursor_course_id,completed:data.status==='complete',raw:data}:null;
    },
    async beginBatch({key,cursor,batch_size}){
      const {data,error}=await db.from('gps_rollout_batches').insert({rollout_key:key,cursor_start:cursor,batch_size}).select('id').single();if(error)throw error;
      await db.from('gps_rollout_regions').update({last_batch_id:data.id,updated_at:now()}).eq('rollout_key',key);
      return data;
    },
    async nextCandidates({region,cursor,limit}){
      let q=db.from('course_catalog').select('id,name,city,state_code,country_code,latitude,longitude,holes,mapping_class,imported_at').eq('country_code',region.country_code).eq('is_active',true).neq('mapping_class','gps_ready').order('imported_at',{ascending:true}).order('id',{ascending:true}).limit(limit);
      if(region.state_code)q=q.eq('state_code',region.state_code);
      /*
       * Cursor correctness is resolved server-side by the controller's stable
       * imported_at/id ordering. A future RPC can optimize this without
       * changing controller semantics.
       */
      if(cursor){
        const {data:c,error:ce}=await db.from('course_catalog').select('imported_at,id').eq('id',cursor).single();if(ce)throw ce;
        q=q.or(`imported_at.gt.${c.imported_at},and(imported_at.eq.${c.imported_at},id.gt.${c.id})`);
      }
      const {data,error}=await q;if(error)throw error;return data||[];
    },
    async checkpoint({key,cursor,batch_id,stats}){
      let {error}=await db.from('gps_rollout_regions').update({cursor_course_id:cursor,last_batch_id:batch_id,updated_at:now()}).eq('rollout_key',key);if(error)throw error;
      ({error}=await db.from('gps_rollout_batches').update({cursor_end:cursor,processed_count:stats.processed,promoted_count:stats.promoted,preserved_count:stats.preserved,review_count:stats.review,failed_count:stats.failed}).eq('id',batch_id));if(error)throw error;
    },
    async recordFailure({key,cursor,batch_id,error}){
      const {error:e}=await db.from('gps_rollout_exceptions').insert({rollout_key:key,batch_id,course_id:cursor,exception_type:'processing_error',detail:error,retryable:true});if(e)throw e;
    },
    async finishBatch({key,cursor,batch_id,stats}){
      const {error}=await db.from('gps_rollout_batches').update({cursor_end:cursor,processed_count:stats.processed,promoted_count:stats.promoted,preserved_count:stats.preserved,review_count:stats.review,failed_count:stats.failed,status:'complete',completed_at:now()}).eq('id',batch_id);if(error)throw error;
    },
    async failBatch({batch_id,error}){
      const {error:e}=await db.from('gps_rollout_batches').update({status:'failed',error_text:error,completed_at:now()}).eq('id',batch_id);if(e)throw e;
    },
    async completeRegion({key,cursor,batch_id}){
      const {error}=await db.from('gps_rollout_regions').update({cursor_course_id:cursor,last_batch_id:batch_id,status:'complete',completed_at:now(),updated_at:now()}).eq('rollout_key',key);if(error)throw error;
      if(batch_id)await db.from('gps_rollout_batches').update({status:'complete',completed_at:now()}).eq('id',batch_id);
    }
  };
}
module.exports={createSupabaseRolloutStore};
