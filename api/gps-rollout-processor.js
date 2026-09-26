/*
 * Course processor for staged ParFolio GPS rollout data.
 * Conservative by design: ambiguity goes to review, never promotion.
 */
const {validateTeeCenterCourse,protectVerifiedGeometry,dedupeNewestHoleEdits}=require('./gps-rollout-engine');

function normalizeName(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();}
function tokens(v){return new Set(normalizeName(v).split(' ').filter(x=>x.length>1));}
function nameSimilarity(a,b){
  const A=tokens(a),B=tokens(b); if(!A.size||!B.size)return 0;
  let n=0;for(const x of A)if(B.has(x))n++;
  return n/Math.max(A.size,B.size);
}
function candidateDecision({course,matchedCourse,rows}){
  /* Never proximity-promote a multi-course facility without a named identity match. */
  if(!matchedCourse?.name)return {status:'review',reason:'missing_source_course_identity'};
  const similarity=nameSimilarity(course.name,matchedCourse.name);
  if(similarity<0.6)return {status:'review',reason:'ambiguous_course_identity',name_similarity:similarity};

  const newest=dedupeNewestHoleEdits(rows);
  const declared=Number(course.holes);
  const validation=validateTeeCenterCourse(newest,declared);
  const protectedResult=protectVerifiedGeometry(course,validation);
  if(protectedResult.preserve)return {status:'preserved',reason:protectedResult.reason};
  if(!validation.ok)return {status:'review',reason:validation.reason,name_similarity:similarity};
  return {status:'promotable',holes:declared,name_similarity:similarity,rows:newest};
}

function createCourseProcessor(adapter){
  if(!adapter)throw new Error('processor adapter required');
  return {
    async processCandidate({region,candidate,batch_id}){
      const staged=await adapter.loadStagedCandidate({region,candidate});
      if(!staged?.matchedCourse)return adapter.markReview({region,candidate,batch_id,reason:'missing_source_course_identity'});
      const decision=candidateDecision({course:candidate,matchedCourse:staged.matchedCourse,rows:staged.rows||[]});
      if(decision.status==='preserved')return decision;
      if(decision.status!=='promotable')return adapter.markReview({region,candidate,batch_id,reason:decision.reason,detail:decision});
      /*
       * Adapter promotion must be transactional: geometry + mapping_class
       * commit together, and must re-check existing verified geometry.
       */
      return adapter.promoteValidated({region,candidate,batch_id,decision});
    }
  };
}
module.exports={normalizeName,nameSimilarity,candidateDecision,createCourseProcessor};
