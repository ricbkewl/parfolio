/*
 * Source-bound staging adapter.
 * Authoritative hole geometry remains source-bound to an explicit OSM course.
 * Level-2 may refresh current OSM weak features before escalating to imagery.
 */
const {reconstructFromStagedFeatures,solve}=require('./gps-rollout-level2-geometry');
const {fetchLiveOsmFeatures}=require('./gps-rollout-live-osm');
const {lookupScorecardWeb}=require('./gps-rollout-scorecard-web-discovery');
const {numberByScorecard,numberByScorecardRouteAware}=require('./gps-rollout-scorecard-numbering');
function facilityFromCatalog(course){return {facility_name:course.name,address:course.address,city:course.city,state_code:course.state_code,postal_code:course.postal_code,country_code:course.country_code,phone:course.phone,website:course.website,course_type:course.course_type,holes:course.holes,par:course.par};}
function facilityFromOsm(raw={}){const t=raw.tags||raw;return {facility_name:t.name||null,address:[t['addr:housenumber'],t['addr:street']].filter(Boolean).join(' ')||null,city:t['addr:city']||null,state_code:t['addr:state']||null,postal_code:t['addr:postcode']||null,phone:t.phone||t['contact:phone']||null,website:t.website||t['contact:website']||null,driving_range:t.golf==='driving_range'?true:undefined,clubhouse:t.clubhouse==='yes'?true:undefined,restaurant:t.restaurant==='yes'?true:undefined,pro_shop:t.shop==='golf'?true:undefined};}
function numberedRows(result){
  if(!result?.ok||!Array.isArray(result.numbered_pairs))return null;
  return result.numbered_pairs.map(p=>({
    hole_number:p.hole_number,hole_par:p.published_par??null,
    tee_lat:p.tee?.lat,tee_lng:p.tee?.lng,
    green_center_lat:p.green?.lat,green_center_lng:p.green?.lng,
    source:'level2_scorecard_recovery',scorecard_url:p.numbering_source?.url||null,
    numbering_cost:p.numbering_cost
  }));
}
function combos(values,k,start=0,prefix=[],out=[]){if(prefix.length===k){out.push([...prefix]);return out;}for(let i=start;i<=values.length-(k-prefix.length);i++){prefix.push(values[i]);combos(values,k,i+1,prefix,out);prefix.pop();}return out;}
function selectScorecardSubset(reconstruction,declared,scorecard){
  const greenIds=[...new Set((reconstruction.candidates||[]).map(r=>r.green_index))].sort((a,b)=>a-b),excess=greenIds.length-declared;
  if(excess<=0||excess>4)return null;
  let best=null;
  for(const drop of combos(greenIds,excess)){
    const blocked=new Set(drop),candidateRows=(reconstruction.candidates||[]).filter(r=>!blocked.has(r.green_index));
    const assignment=solve(candidateRows,reconstruction.refined_tee_clusters||[]);
    if(assignment.pair_count!==declared)continue;
    const relaxed=numberByScorecard({course:{holes:declared},assignment,scorecard,max_pair_cost:999,max_average_cost:999});
    if(!relaxed?.summary)continue;
    const avgGlobal=assignment.pairs.reduce((s,p)=>s+Number(p.global_score||0),0)/declared;
    const rank=[Number(relaxed.summary.average_numbering_cost),Number(relaxed.summary.max_numbering_cost),avgGlobal];
    if(!best||rank[0]<best.rank[0]-1e-9||(Math.abs(rank[0]-best.rank[0])<1e-9&&(rank[1]<best.rank[1]-1e-9||(Math.abs(rank[1]-best.rank[1])<1e-9&&rank[2]<best.rank[2]))))best={drop,assignment,rank};
  }
  return best;
}
async function buildLevel2(db,candidate){
  const declared=Number(candidate.holes);if(![9,18].includes(declared))return null;
  const {data:staged,error:fe}=await db.from('fl_osm_feature_stage').select('catalog_id,candidate_uri,feature_uri,feature_type,lat,lng,raw').eq('catalog_id',candidate.id).in('feature_type',['tee','green','fairway']);
  if(fe)throw fe;
  if(!(staged||[]).some(x=>x.feature_type==='tee')||!(staged||[]).some(x=>x.feature_type==='green'))return null;
  let featureRows=staged||[],sourceMode='staged_osm',liveMeta=null;
  let reconstruction=reconstructFromStagedFeatures({course:candidate,featureRows});
  const stagedNeedsRefresh=reconstruction.assignment?.pair_count!==declared||Number(reconstruction.cleanup?.unresolved_surplus_features||0)>0||reconstruction.green_features!==declared;
  if(stagedNeedsRefresh){
    try{
      const live=await fetchLiveOsmFeatures({course:candidate,stagedRows:featureRows});
      if(live?.features?.some(x=>x.feature_type==='tee')&&live.features.some(x=>x.feature_type==='green')){
        const fresh=reconstructFromStagedFeatures({course:candidate,featureRows:live.features});
        if((fresh.assignment?.pair_count||0)>=(reconstruction.assignment?.pair_count||0)){featureRows=live.features;reconstruction=fresh;sourceMode='live_osm_refresh';liveMeta={source:live.source,url:live.url,bytes:live.bytes,counts:live.counts,bounds:live.bounds};}
      }
    }catch(e){liveMeta={error:String(e?.message||e)};}
  }
  let numbering_verified=false,numbered_rows=null,scorecard=null,numbering_result=null,subset=null,selectedAssignment=reconstruction.assignment,selectedCleanup=reconstruction.cleanup;
  try{scorecard=await lookupScorecardWeb(candidate);}catch{}
  if(scorecard?.ok){
    if((reconstruction.assignment?.pair_count||0)>declared){
      subset=selectScorecardSubset(reconstruction,declared,scorecard);
      if(subset){selectedAssignment=subset.assignment;selectedCleanup={applied:true,reason:'scorecard_selected_live_osm_subset',removed:subset.drop.map(green_index=>({green_index})),unresolved_surplus_features:0};}
    }
    if(selectedAssignment?.pair_count===declared){
      const route=numberByScorecardRouteAware({course:candidate,assignment:selectedAssignment,scorecard});
      numbering_result=route?.ok?route:numberByScorecard({course:candidate,assignment:selectedAssignment,scorecard});
      numbering_verified=Boolean(numbering_result?.ok);
      if(numbering_verified)numbered_rows=numberedRows(numbering_result);
    }
  }
  return {
    course:{id:candidate.id,holes:declared,par:candidate.par??null},
    assignment:selectedAssignment,cleanup:selectedCleanup,
    numbering:numbering_result,numbering_verified,numbered_rows,
    numbering_source:numbering_result?.source||scorecard?.source||null,
    numbering_summary:numbering_result?.summary||null,
    numbering_reason:numbering_result?.reason||scorecard?.reason||null,
    model_version:reconstruction.model_version,
    diagnostics:{source_mode:sourceMode,live_refresh:liveMeta,subset_drop_indices:subset?.drop||[],tee_features:reconstruction.tee_features,raw_green_features:reconstruction.raw_green_features,green_features:reconstruction.green_features,fairway_features:reconstruction.fairway_features,tee_cluster_count:reconstruction.tee_cluster_count,refined_tee_cluster_count:reconstruction.refined_tee_cluster_count,pair_count:selectedAssignment?.pair_count||0}
  };
}
function createSourceAdapter(db,{enrichFacility}={}){
  if(!db)throw new Error('Supabase client required');
  return {
    async loadStagedCandidate({candidate}){
      const {data:match,error:me}=await db.from('fl_course_match_stage').select('*').eq('catalog_id',candidate.id).maybeSingle();if(me)throw me;
      const sourceUri=match?.osm_course_uri||null;let source=null,rows=[];
      if(sourceUri){
        const {data:s,error:se}=await db.from('fl_osm_course_stage').select('*').eq('osm_course_uri',sourceUri).maybeSingle();if(se)throw se;source=s||null;
        if(source){const {data:r,error:he}=await db.from('fl_safe_hole_geometry').select('*').eq('osm_course_uri',source.osm_course_uri).order('hole_number');if(he)throw he;rows=r||[];}
      }
      const declared=Number(candidate.holes);let level2Recovery=null;
      if([9,18].includes(declared)&&rows.length!==declared)level2Recovery=await buildLevel2(db,candidate);
      const matchedCourse=source?{name:source.name,osm_course_uri:source.osm_course_uri,raw:source.raw,identity_mode:'explicit_osm_course'}:(level2Recovery?{name:candidate.name,osm_course_uri:null,raw:{},identity_mode:'catalog_bound_level2'}:null);
      return {matchedCourse,rows,level2Recovery,facilitySource:source?'openstreetmap':'catalog_bound_level2'};
    },
    async enrichFacility({candidate,matchedCourse,source,confidence}){
      if(!enrichFacility)return null;
      const incoming={...facilityFromCatalog(candidate),...Object.fromEntries(Object.entries(facilityFromOsm(matchedCourse.raw||{})).filter(([,v])=>v!==null&&v!==undefined&&v!==''))};
      return enrichFacility(db,{course:candidate,incoming,source,confidence});
    }
  };
}
module.exports={facilityFromCatalog,facilityFromOsm,numberedRows,selectScorecardSubset,buildLevel2,createSourceAdapter};
