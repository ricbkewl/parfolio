/*
 * Course processor for staged ParFolio GPS rollout data.
 * Facility enrichment is independent from GPS promotion.
 */
const {validateTeeCenterCourse,protectVerifiedGeometry,dedupeNewestHoleEdits}=require('./gps-rollout-engine');
const {recoveryHandoff}=require('./gps-rollout-recovery-policy');
function normalizeName(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();}
function tokens(v){return new Set(normalizeName(v).split(' ').filter(x=>x.length>1));}
function nameSimilarity(a,b){const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return n/Math.max(A.size,B.size);}
function missingHoles(rows,declared){const have=new Set((rows||[]).map(r=>Number(r.hole_number)).filter(Number.isInteger));return Array.from({length:declared},(_,i)=>i+1).filter(n=>!have.has(n));}
function candidateDecision({course,matchedCourse,rows}){
 if(!matchedCourse?.name)return {status:'review',reason:'missing_source_course_identity'};
 const similarity=nameSimilarity(course.name,matchedCourse.name);
 if(similarity<0.6)return {status:'review',reason:'ambiguous_course_identity',name_similarity:similarity};
 const newest=dedupeNewestHoleEdits(rows),declared=Number(course.holes),validation=validateTeeCenterCourse(newest,declared);
 const protectedResult=protectVerifiedGeometry(course,validation);
 if(protectedResult.preserve)return {status:'preserved',reason:protectedResult.reason};
 if(!validation.ok)return {status:'incomplete',reason:validation.reason,name_similarity:similarity,missing_holes:missingHoles(newest,declared),rows:newest};
 return {status:'promotable',holes:declared,name_similarity:similarity,rows:newest};
}
function createCourseProcessor(adapter){
 if(!adapter)throw new Error('processor adapter required');
 return {async processCandidate({region,candidate,batch_id}){
  const staged=await adapter.loadStagedCandidate({region,candidate});
  let enrichment=null;
  if(staged?.matchedCourse?.name){
   const similarity=nameSimilarity(candidate.name,staged.matchedCourse.name);
   if(similarity>=0.6&&adapter.enrichFacility)enrichment=await adapter.enrichFacility({region,candidate,batch_id,matchedCourse:staged.matchedCourse,source:staged.facilitySource||'rollout_source',confidence:Math.min(1,Math.max(0.6,similarity))});
  }
  if(!staged?.matchedCourse)return adapter.markReview({region,candidate,batch_id,reason:'missing_source_course_identity'});
  const decision=candidateDecision({course:candidate,matchedCourse:staged.matchedCourse,rows:staged.rows||[]});
  if(decision.status==='preserved')return {...decision,enrichment};
  if(decision.status==='incomplete'){
   const handoff=recoveryHandoff({reason:decision.reason,identity_confidence:decision.name_similarity,missing_holes:decision.missing_holes,imagery_available:staged.imageryAvailable!==false});
   if(handoff.action==='visual_recovery'&&adapter.queueVisualRecovery){
    const queued=await adapter.queueVisualRecovery({region,candidate,batch_id,missing_holes:handoff.missing_holes,identity_confidence:decision.name_similarity});
    return {status:'visual_recovery_queued',queued,enrichment};
   }
   const review=await adapter.markReview({region,candidate,batch_id,reason:handoff.reason||decision.reason,detail:decision});
   return {...review,enrichment};
  }
  if(decision.status!=='promotable'){const review=await adapter.markReview({region,candidate,batch_id,reason:decision.reason,detail:decision});return {...review,enrichment};}
  const promoted=await adapter.promoteValidated({region,candidate,batch_id,decision});return {...promoted,enrichment};
 }};
}
module.exports={normalizeName,nameSimilarity,missingHoles,candidateDecision,createCourseProcessor};
