/*
 * ParFolio GPS rollout recovery policy.
 * Tier 1: authoritative complete OpenGolf/OSM geometry.
 * Tier 2: authoritative tee + green-center recovery.
 * Tier 3: imagery-assisted recovery only when authoritative evidence is incomplete.
 */
const VISUAL_POINT_TYPES=new Set(['tee','aim1','aim2','green_front','green_center','green_back']);
const MIN_VISUAL_CONFIDENCE=0.85;
const REVIEW_REASONS=new Set(['ambiguous_course_identity','course_configuration_conflict','missing_source_course_identity']);

function recoveryTier(result={}){
  if(result.authoritative_complete)return 1;
  if(result.authoritative_tee_center_complete)return 2;
  return 3;
}
function recoveryHandoff(result={}){
  if(REVIEW_REASONS.has(result.reason))return {action:'review',reason:result.reason};
  if(result.authoritative_complete||result.authoritative_tee_center_complete)return {action:'authoritative',tier:recoveryTier(result)};
  if(result.identity_confidence>=0.6 && result.imagery_available!==false)
    return {action:'visual_recovery',tier:3,missing_holes:result.missing_holes||[]};
  return {action:'review',reason:result.reason||'insufficient_recovery_evidence'};
}
function acceptVisualPoint(point){
  if(!point||!VISUAL_POINT_TYPES.has(point.type))return false;
  const lat=Number(point.lat),lng=Number(point.lng),confidence=Number(point.confidence);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&
    confidence>=MIN_VISUAL_CONFIDENCE&&typeof point.imagery_source==='string'&&point.imagery_source.length>0&&
    typeof point.observed_at==='string'&&point.observed_at.length>0;
}
function visualRecoveryDecision({course,holes=[]}){
  const declared=Number(course?.holes);
  if(![9,18].includes(declared))return{ok:false,reason:'visual recovery requires declared 9 or 18 holes'};
  if(holes.length!==declared)return{ok:false,reason:'visual recovery is incomplete'};
  const recovered=[];
  for(const hole of holes){
    const n=Number(hole.hole_number),accepted=(hole.points||[]).filter(acceptVisualPoint);
    const tee=accepted.find(p=>p.type==='tee'),center=accepted.find(p=>p.type==='green_center');
    if(!Number.isInteger(n)||n<1||n>declared||!tee||!center)return{ok:false,reason:`hole ${n||'?'} lacks high-confidence visual tee/center`};
    recovered.push({hole_number:n,points:accepted});
  }
  const numbers=recovered.map(h=>h.hole_number).sort((a,b)=>a-b);
  if(numbers.some((n,i)=>n!==i+1))return{ok:false,reason:'visual hole numbering is not sequential'};
  return{ok:true,tier:3,holes:recovered,requires_final_geometry_validation:true};
}
module.exports={MIN_VISUAL_CONFIDENCE,REVIEW_REASONS,recoveryTier,recoveryHandoff,acceptVisualPoint,visualRecoveryDecision};
