/*
 * Tier-3 imagery recovery worker.
 * Imagery interpretation is supplied by a provider adapter; this worker never
 * invents coordinates. It accepts only policy-approved observations, merges
 * them with authoritative holes, and revalidates the COMPLETE course.
 */
const {acceptVisualPoint}=require('./gps-rollout-recovery-policy');
const {validateTeeCenterCourse}=require('./gps-rollout-engine');

function visualHoleToGeometry(hole){
  const accepted=(hole.points||[]).filter(acceptVisualPoint);
  const pick=t=>accepted.find(p=>p.type===t);
  const tee=pick('tee'),center=pick('green_center');
  if(!tee||!center)return null;
  const aim1=pick('aim1'),aim2=pick('aim2'),front=pick('green_front'),back=pick('green_back');
  return {
    hole_number:Number(hole.hole_number),
    tee_lat:tee.lat,tee_lng:tee.lng,
    aim1_lat:aim1?.lat??null,aim1_lng:aim1?.lng??null,
    aim2_lat:aim2?.lat??null,aim2_lng:aim2?.lng??null,
    green_front_lat:front?.lat??null,green_front_lng:front?.lng??null,
    green_center_lat:center.lat,green_center_lng:center.lng,
    green_back_lat:back?.lat??null,green_back_lng:back?.lng??null,
    source:'imagery_recovery',
    visual_provenance:{
      tee:{imagery_source:tee.imagery_source,observed_at:tee.observed_at,confidence:tee.confidence},
      green_center:{imagery_source:center.imagery_source,observed_at:center.observed_at,confidence:center.confidence}
    }
  };
}
function assembleCompleteCourse({course,authoritativeRows=[],visualHoles=[]}){
  const byHole=new Map(authoritativeRows.map(r=>[Number(r.hole_number),r]));
  for(const h of visualHoles){
    const row=visualHoleToGeometry(h);
    if(row&&!byHole.has(row.hole_number))byHole.set(row.hole_number,row); // authoritative always wins
  }
  const rows=[...byHole.values()].sort((a,b)=>Number(a.hole_number)-Number(b.hole_number));
  const validation=validateTeeCenterCourse(rows,Number(course.holes));
  return {ok:validation.ok,reason:validation.reason||null,rows,validation};
}
function createVisualWorker({queue,provider,adapter}){
  if(!queue||!provider||!adapter)throw new Error('queue, imagery provider and adapter required');
  return {
    async processJob(job){
      await queue.markProcessing(job.id);
      try{
        const context=await adapter.loadRecoveryContext(job);
        const observations=await provider.observeMissingHoles({
          course:context.course,
          missing_holes:job.missing_holes,
          authoritative_rows:context.authoritativeRows||[]
        });
        if(typeof queue.recordObservations==='function')await queue.recordObservations(job.id,job.course_id,observations?.holes||[]);
        const assembled=assembleCompleteCourse({
          course:context.course,
          authoritativeRows:context.authoritativeRows||[],
          visualHoles:observations?.holes||[]
        });
        if(!assembled.ok){
          await queue.finish(job.id,{status:'review',error_text:assembled.reason||'final validation failed'});
          return {status:'review',reason:assembled.reason};
        }
        const result=await adapter.promoteRecovered({
          job,course:context.course,rows:assembled.rows
        });
        await queue.finish(job.id,{status:'recovered'});
        return {status:'recovered',result};
      }catch(err){
        await queue.finish(job.id,{status:'failed',error_text:String(err?.message||err)});
        throw err;
      }
    }
  };
}
module.exports={visualHoleToGeometry,assembleCompleteCourse,createVisualWorker};
