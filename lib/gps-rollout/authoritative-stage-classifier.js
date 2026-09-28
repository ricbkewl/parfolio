/*
 * Conservative classifier for authoritative staged rollout data.
 * No writes. No promotion. Complicated facilities are intentionally deferred.
 */
const {validateTeeCenterCourse}=require('./gps-rollout-engine');
const {normalizeName,nameSimilarity}=require('./gps-rollout-processor');
const {recoverFromHoleTraceEndpoints}=require('./osm-feature-recovery');

function classifyAuthoritativeStage({course,courseRows=[],holeRows=[]}={}){
  const declared=Number(course?.holes);
  if(![9,18].includes(declared))return{status:'review',reason:'invalid_declared_hole_count'};

  const valid=(holeRows||[]).filter(r=>{
    const n=Number(r?.hole_number);
    return Number.isInteger(n)&&n>=1&&n<=declared&&r?.valid_number!==false&&r?.geometry_wkt;
  });
  const byHole=new Map();
  for(const row of valid){
    const n=Number(row.hole_number);
    if(!byHole.has(n))byHole.set(n,[]);
    byHole.get(n).push(row);
  }
  const duplicates=[...byHole.entries()].filter(([,rows])=>rows.length>1).map(([n])=>n);
  const missing=Array.from({length:declared},(_,i)=>i+1).filter(n=>!byHole.has(n));

  if(missing.length)return{status:'incomplete',reason:'missing_numbered_hole_traces',missing_holes:missing,distinct_holes:byHole.size};
  if(duplicates.length)return{status:'review',reason:'ambiguous_duplicate_hole_traces',duplicate_holes:duplicates,distinct_holes:byHole.size};

  const named=(courseRows||[]).filter(r=>String(r?.name||'').trim());
  const scored=named.map(r=>({row:r,similarity:nameSimilarity(course?.name,r.name)})).sort((a,b)=>b.similarity-a.similarity);
  const strong=scored.filter(x=>x.similarity>=0.6);
  if(strong.length!==1)return{
    status:'review',
    reason:strong.length>1?'ambiguous_multiple_course_identity_matches':'missing_strong_course_identity',
    best_name_similarity:scored[0]?.similarity??0,
    source_course_names:named.map(r=>r.name)
  };

  const ordered=Array.from({length:declared},(_,i)=>byHole.get(i+1)[0]);
  const recovered=recoverFromHoleTraceEndpoints({rows:ordered,declaredHoles:declared});
  if(!recovered.ok)return{status:'incomplete',reason:recovered.reason||'hole_trace_recovery_failed'};
  const validation=validateTeeCenterCourse(recovered.rows,declared);
  if(!validation.ok)return{status:'incomplete',reason:validation.reason};

  return{
    status:'promotable',
    reason:'clean_authoritative_hole_trace_set',
    holes:declared,
    identity_similarity:strong[0].similarity,
    matched_course_name:strong[0].row.name,
    rows:recovered.rows
  };
}
module.exports={classifyAuthoritativeStage};
