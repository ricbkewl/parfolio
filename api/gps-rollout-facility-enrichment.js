/*
 * Facility enrichment runs alongside GPS rollout/recovery.
 * Merge rule: never replace a populated higher-confidence field with weaker data.
 */
const CORE_FIELDS=['facility_name','address','city','state_code','postal_code','country_code','phone','website','course_type','holes','par','driving_range','putting_green','chipping_area','pro_shop','clubhouse','restaurant','cart_available','facility_description'];

function mergeFacilityInfo(existing={},incoming={},source='unknown',confidence=0.5){
  const out={...existing};
  const provenance={...(existing.source_provenance||{})};
  const confidences={...(existing.source_confidence||{})};
  for(const field of CORE_FIELDS){
    const value=incoming[field];
    if(value===undefined||value===null||value==='')continue;
    const oldConfidence=Number(confidences[field]??-1);
    if(out[field]===undefined||out[field]===null||out[field]===''||confidence>oldConfidence){
      out[field]=value; provenance[field]=source; confidences[field]=confidence;
    }
  }
  out.amenities={...(existing.amenities||{}),...(incoming.amenities||{})};
  out.source_provenance=provenance;
  out.source_confidence=confidences;
  return out;
}

async function enrichFacility(db,{course,incoming,source,confidence}){
  const {data:existing,error:e}=await db.from('course_facility_info').select('*').eq('course_id',course.id).maybeSingle();
  if(e)throw e;
  const merged=mergeFacilityInfo(existing||{},incoming,source,confidence);
  const {error}=await db.from('course_facility_info').upsert({
    ...merged,course_id:course.id,enriched_at:new Date().toISOString(),updated_at:new Date().toISOString()
  },{onConflict:'course_id'});
  if(error)throw error;
  return merged;
}
module.exports={CORE_FIELDS,mergeFacilityInfo,enrichFacility};
