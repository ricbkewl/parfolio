/*
 * Persistent Tier-3 imagery recovery queue.
 * One row per course; repeated rollout passes resume/update rather than duplicate.
 */
function createVisualRecoveryQueue(db){
  if(!db)throw new Error('Supabase client required');
  return {
    async enqueue({course_id,rollout_key,batch_id=null,missing_holes=[],identity_confidence=null,imagery_source='MapTiler'}){
      const payload={course_id,rollout_key,batch_id,missing_holes:[...new Set(missing_holes)].sort((a,b)=>a-b),identity_confidence,imagery_source,status:'pending',updated_at:new Date().toISOString()};
      const {data,error}=await db.from('gps_visual_recovery_queue').upsert(payload,{onConflict:'course_id'}).select().single();
      if(error)throw error; return data;
    },
    async next(limit=10){
      const {data,error}=await db.from('gps_visual_recovery_queue').select('*').eq('status','pending').order('queued_at').limit(Math.min(25,Math.max(1,limit)));
      if(error)throw error; return data||[];
    },
    async markProcessing(id){
      const {data,error}=await db.from('gps_visual_recovery_queue').update({status:'processing',started_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).select().single();
      if(error)throw error;
      const attempts=Number(data.attempt_count||0)+1;
      const {data:counted,error:countError}=await db.from('gps_visual_recovery_queue').update({attempt_count:attempts,updated_at:new Date().toISOString()}).eq('id',id).select().single();
      if(countError)throw countError; return counted;
    },
    async recordObservations(queue_id,course_id,holes=[]){
      const rows=[];
      for(const hole of holes||[])for(const p of hole.points||[])rows.push({
        queue_id,course_id,hole_number:Number(hole.hole_number),point_type:p.type,
        latitude:Number(p.lat),longitude:Number(p.lng),confidence:Number(p.confidence),
        imagery_source:p.imagery_source||'MapTiler',observed_at:p.observed_at||new Date().toISOString(),
        accepted:Boolean(p.accepted)
      });
      if(!rows.length)return [];
      const {data,error}=await db.from('gps_visual_recovery_observations').insert(rows).select();
      if(error)throw error; return data||[];
    },
    async finish(id,{status='recovered',error_text=null}={}){
      if(!['recovered','review','failed'].includes(status))throw new Error('invalid terminal status');
      const {data,error}=await db.from('gps_visual_recovery_queue').update({status,last_error:error_text,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).select().single();
      if(error)throw error; return data;
    }
  };
}
module.exports={createVisualRecoveryQueue};
