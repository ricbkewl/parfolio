/*
 * Source-bound staging adapter.
 * Course identity and authoritative hole geometry remain source-bound.
 * When authoritative rows are incomplete, staged weak OSM tee/green/fairway
 * features may be reconstructed for Level-2 evidence, but are never promoted
 * here and never bypass verified hole numbering.
 */
const {reconstructFromStagedFeatures}=require('./gps-rollout-level2-geometry');
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
      const {data:match,error:me}=await db.from('fl_course_match_stage').select('*').eq('catalog_id',candidate.id).maybeSingle();
      if(me)throw me;
      const sourceUri=match?.osm_course_uri||null;
      if(!sourceUri)return {matchedCourse:null,rows:[],level2Recovery:null};

      const {data:source,error:se}=await db.from('fl_osm_course_stage').select('*').eq('osm_course_uri',sourceUri).maybeSingle();
      if(se)throw se;
      if(!source)return {matchedCourse:null,rows:[],level2Recovery:null};

      const {data:rows,error:he}=await db.from('fl_safe_hole_geometry').select('*').eq('osm_course_uri',source.osm_course_uri).order('hole_number');
      if(he)throw he;

      let level2Recovery=null;
      const declared=Number(candidate.holes);
      if([9,18].includes(declared)&&(rows||[]).length!==declared){
        const {data:features,error:fe}=await db.from('fl_osm_feature_stage')
          .select('catalog_id,candidate_uri,feature_uri,feature_type,lat,lng,raw')
          .eq('catalog_id',candidate.id)
          .in('feature_type',['tee','green','fairway']);
        if(fe)throw fe;
        if((features||[]).some(x=>x.feature_type==='tee')&&(features||[]).some(x=>x.feature_type==='green')){
          const reconstruction=reconstructFromStagedFeatures({course:candidate,featureRows:features||[]});
          level2Recovery={
            course:{id:candidate.id,holes:declared},
            assignment:reconstruction.assignment,
            cleanup:reconstruction.cleanup,
            numbering_verified:false,
            model_version:reconstruction.model_version,
            diagnostics:{
              tee_features:reconstruction.tee_features,
              raw_green_features:reconstruction.raw_green_features,
              green_features:reconstruction.green_features,
              fairway_features:reconstruction.fairway_features,
              tee_cluster_count:reconstruction.tee_cluster_count,
              refined_tee_cluster_count:reconstruction.refined_tee_cluster_count
            }
          };
        }
      }

      return {
        matchedCourse:{name:source.name,osm_course_uri:source.osm_course_uri,raw:source.raw},
        rows:rows||[],level2Recovery,facilitySource:'openstreetmap'
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
