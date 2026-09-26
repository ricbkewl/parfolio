/*
 * Source-bound staging adapter.
 * Course identity and hole geometry must share the same source-course URI.
 * This prevents proximity-only cross-course contamination at shared facilities.
 */
function facilityFromCatalog(course){
  return {
    facility_name:course.name,address:course.address,city:course.city,
    state_code:course.state_code,postal_code:course.postal_code,
    country_code:course.country_code,phone:course.phone,website:course.website,
    course_type:course.course_type,holes:course.holes,par:course.par
  };
}
function facilityFromOsm(raw={}){
  const t=raw.tags||raw;
  return {
    facility_name:t.name||null,address:[t['addr:housenumber'],t['addr:street']].filter(Boolean).join(' ')||null,
    city:t['addr:city']||null,state_code:t['addr:state']||null,postal_code:t['addr:postcode']||null,
    phone:t.phone||t['contact:phone']||null,website:t.website||t['contact:website']||null,
    driving_range:t.golf==='driving_range'?true:undefined,
    clubhouse:t.clubhouse==='yes'?true:undefined,
    restaurant:t.restaurant==='yes'?true:undefined,
    pro_shop:t.shop==='golf'?true:undefined
  };
}
function createSourceAdapter(db,{enrichFacility}={}){
  if(!db)throw new Error('Supabase client required');
  return {
    async loadStagedCandidate({candidate}){
      const pseudo='candidate:'+candidate.id;
      const {data:match,error:me}=await db.from('fl_course_match_stage').select('*').eq('catalog_id',candidate.id).maybeSingle();
      if(me)throw me;
      const sourceUri=match?.osm_course_uri||null;
      if(!sourceUri)return {matchedCourse:null,rows:[]};

      const {data:source,error:se}=await db.from('fl_osm_course_stage').select('*').eq('osm_course_uri',sourceUri).maybeSingle();
      if(se)throw se;
      if(!source)return {matchedCourse:null,rows:[]};

      // Never consume pseudo proximity-stage holes for promotion unless the
      // identity matcher has explicitly bound them to this source course.
      const holeUri=source.osm_course_uri;
      const {data:rows,error:he}=await db.from('fl_safe_hole_geometry').select('*').eq('osm_course_uri',holeUri).order('hole_number');
      if(he)throw he;

      return {
        matchedCourse:{name:source.name,osm_course_uri:source.osm_course_uri,raw:source.raw},
        rows:rows||[],facilitySource:'openstreetmap'
      };
    },
    async enrichFacility({candidate,matchedCourse,source,confidence}){
      if(!enrichFacility)return null;
      const incoming={
        ...facilityFromCatalog(candidate),
        ...Object.fromEntries(Object.entries(facilityFromOsm(matchedCourse.raw||{})).filter(([,v])=>v!==null&&v!==undefined&&v!==''))
      };
      return enrichFacility(db,{course:candidate,incoming,source,confidence});
    }
  };
}
module.exports={facilityFromCatalog,facilityFromOsm,createSourceAdapter};
