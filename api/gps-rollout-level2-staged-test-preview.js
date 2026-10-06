/* Preview-only end-to-end dry run through the actual ParFolio rollout processor.
 * Reads real Florida staging data. All mutation adapters are report-only stubs.
 */
const R=6371008.8,rad=v=>v*Math.PI/180;
function dist(a,b){const d1=rad(b.lat-a.lat),d2=rad(b.lng-a.lng),a1=rad(a.lat),a2=rad(b.lat),h=Math.sin(d1/2)**2+Math.cos(a1)*Math.cos(a2)*Math.sin(d2/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
function geometryPoints(f){return (Array.isArray(f?.raw?.geometry)?f.raw.geometry:[]).map(x=>({lat:Number(x.lat),lng:Number(x.lon??x.lng)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));}
function nearest(p,arr){return arr.length?Math.min(...arr.map(q=>dist(p,q))):Infinity;}
function filterToFairwayFootprint(features,maxMeters=300){
  const fairways=(features||[]).filter(x=>x.feature_type==='fairway'),cloud=fairways.flatMap(geometryPoints);
  if(!cloud.length)return {features:features||[],removed:[]};
  const kept=[],removed=[];
  for(const f of features||[]){
    if(f.feature_type==='fairway'){kept.push(f);continue;}
    const p={lat:Number(f.lat),lng:Number(f.lng)},d=Number.isFinite(p.lat)&&Number.isFinite(p.lng)?nearest(p,cloud):Infinity;
    if(d<=maxMeters)kept.push(f);else removed.push({feature_type:f.feature_type,feature_uri:f.feature_uri,distance_to_fairway_m:+d.toFixed(1)});
  }
  return {features:kept,removed};
}
function farthestPair(pts){
  let best=null,bestD=-1;
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const d=dist(pts[i],pts[j]);if(d>bestD){bestD=d;best=[pts[i],pts[j]];}}
  return best?{ends:best,length_m:bestD}:null;
}
function fairwayAxisGreenCandidates(features,reconstruction,declared){
  const greens=(features||[]).filter(x=>x.feature_type==='green').map(x=>({lat:Number(x.lat),lng:Number(x.lng)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  const tees=reconstruction?.refined_tee_clusters||[],need=Math.max(0,declared-greens.length);if(!need||!tees.length)return [];
  const out=[];
  for(const f of (features||[]).filter(x=>x.feature_type==='fairway')){
    const pts=geometryPoints(f),axis=farthestPair(pts);if(!axis||axis.length_m<70)continue;
    const meta=axis.ends.map(p=>({p,tee_m:nearest(p,tees),green_m:nearest(p,greens)}));
    // The tee-side end should be the one closer to a tee complex; the opposite long-axis end is the green candidate.
    const teeSide=meta[0].tee_m<=meta[1].tee_m?meta[0]:meta[1],greenSide=teeSide===meta[0]?meta[1]:meta[0];
    if(teeSide.tee_m>180)continue;
    if(greenSide.green_m<65)continue; // already represented by a mapped green
    if(greenSide.tee_m<60)continue;   // likely another tee-side shape, not a green end
    out.push({feature_uri:'fairway-axis:'+String(f.feature_uri||out.length),feature_type:'green',lat:greenSide.p.lat,lng:greenSide.p.lng,raw:{synthetic:true,source_fairway:f.feature_uri,axis_length_m:+axis.length_m.toFixed(1),green_gap_m:+greenSide.green_m.toFixed(1),tee_side_m:+teeSide.tee_m.toFixed(1),green_side_tee_m:+greenSide.tee_m.toFixed(1)}});
  }
  out.sort((a,b)=>(b.raw.green_gap_m-a.raw.green_gap_m)||(b.raw.axis_length_m-a.raw.axis_length_m));
  const chosen=[];
  for(const c of out){if(chosen.some(x=>dist(x,c)<70))continue;chosen.push(c);if(chosen.length>=need)break;}
  return chosen;
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('X-Robots-Tag','noindex');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const COURSE_ID='0029b4a9-c5c1-4b52-ad18-be6d2211ef20';
  try{
    const {reconstructFromStagedFeatures}=require('../lib/gps-rollout/gps-rollout-level2-geometry');
    const {lookupScorecardWeb}=require('../lib/gps-rollout/gps-rollout-scorecard-web-discovery');
    const {numberByScorecard,numberPartialByScorecard}=require('../lib/gps-rollout/gps-rollout-scorecard-numbering');
    const {numberedRows}=require('../lib/gps-rollout/gps-rollout-source-adapter');
    const {createCourseProcessor}=require('../lib/gps-rollout/gps-rollout-processor');
    const {validateTeeCenterCourse}=require('../lib/gps-rollout/gps-rollout-engine');
    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
    const secret=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim(),service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    if(!url||!secret)return res.status(503).json({ok:false,error:'supabase_server_config_missing'});
    const headers={apikey:secret,Accept:'application/json'};if(service)headers.Authorization='Bearer '+service;
    async function rest(path,timeout=8000){const r=await fetch(url+'/rest/v1/'+path,{headers,signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error('rest_'+r.status+'_'+path.split('?')[0]);return r.json();}
    const courses=await rest('course_catalog?id=eq.'+COURSE_ID+'&select=id,name,city,state_code,country_code,holes,par,website,mapping_class');
    const candidate=courses?.[0];if(!candidate)return res.status(404).json({ok:false,error:'course_not_found'});
    const features=await rest('fl_osm_feature_stage?catalog_id=eq.'+COURSE_ID+'&feature_type=in.(tee,green,fairway)&select=catalog_id,candidate_uri,feature_uri,feature_type,lat,lng,raw');
    const declared=Number(candidate.holes),footprint=filterToFairwayFootprint(features,300),filteredFeatures=footprint.features;
    const base=reconstructFromStagedFeatures({course:candidate,featureRows:filteredFeatures});
    const axisCandidates=fairwayAxisGreenCandidates(filteredFeatures,base,declared),augmentedFeatures=[...filteredFeatures,...axisCandidates];
    const reconstruction=axisCandidates.length?reconstructFromStagedFeatures({course:candidate,featureRows:augmentedFeatures}):base;
    let numbering_verified=false,numbered_rows=null,numbering_result=null,partial_result=null,scorecard=null,scorecardAttempt=null,finalGeometryValidation=null;
    if(reconstruction.assignment?.pair_count>=declared-1){
      try{
        scorecard=await lookupScorecardWeb({...candidate,website:candidate.website||'https://www.eastpointe-cc.com/'});
        scorecardAttempt={ok:Boolean(scorecard?.ok),reason:scorecard?.reason||null,source:scorecard?.source||null,lookup_path:scorecard?.lookup_path||null};
        if(scorecard?.ok){
          if(reconstruction.assignment.pair_count===declared){numbering_result=numberByScorecard({course:candidate,assignment:reconstruction.assignment,scorecard});numbering_verified=Boolean(numbering_result?.ok);if(numbering_verified){numbered_rows=numberedRows(numbering_result);finalGeometryValidation=validateTeeCenterCourse(numbered_rows,declared);}}
          else partial_result=numberPartialByScorecard({course:candidate,assignment:reconstruction.assignment,scorecard,min_pairs:declared-1});
        }
      }catch(e){scorecardAttempt={ok:false,reason:String(e?.message||e)};}
    }else scorecardAttempt={ok:false,reason:'pair_count_too_incomplete_for_scorecard_targeting'};
    const level2Recovery={course:{id:candidate.id,holes:declared,par:candidate.par??null},assignment:reconstruction.assignment,cleanup:reconstruction.cleanup,numbering_verified,numbered_rows,numbering_source:numbering_result?.source||scorecard?.source||null,numbering_summary:numbering_result?.summary||null,numbering_reason:numbering_result?.reason||scorecard?.reason||null,model_version:reconstruction.model_version,diagnostics:{tee_features:reconstruction.tee_features,raw_green_features:reconstruction.raw_green_features,green_features:reconstruction.green_features,fairway_features:reconstruction.fairway_features,tee_cluster_count:reconstruction.tee_cluster_count,refined_tee_cluster_count:reconstruction.refined_tee_cluster_count,pair_count:reconstruction.assignment?.pair_count||0}};
    const staged={matchedCourse:{name:candidate.name,osm_course_uri:null,raw:{},identity_mode:'catalog_bound_level2'},rows:[],level2Recovery,facilitySource:'catalog_bound_level2',imageryAvailable:true};
    const mutations=[];
    const adapter={async loadStagedCandidate(){return staged;},async enrichFacility(){return {dry_run:true,would_enrich:false};},async promoteValidated({decision}){mutations.push({type:'promotion_blocked_by_dry_run',row_count:decision?.rows?.length||0});return {status:'would_promote',dry_run:true,row_count:decision?.rows?.length||0};},async markReview({reason,detail}){mutations.push({type:'review_write_blocked_by_dry_run',reason});return {status:'review',reason,dry_run:true,detail:detail||null};},async queueVisualRecovery({missing_holes,level2}){mutations.push({type:'visual_queue_write_blocked_by_dry_run',missing_holes});return {dry_run:true,would_queue:true,missing_holes,level2:level2||null};}};
    const processor=createCourseProcessor(adapter),result=await processor.processCandidate({region:{country_code:'US',state_code:'FL'},candidate,batch_id:'dry-run-no-write'});
    return res.status(200).json({ok:true,dry_run:true,actual_processor:true,production_write:false,promoted:false,course:{id:candidate.id,name:candidate.name,holes:candidate.holes,par:candidate.par,mapping_class:candidate.mapping_class},fairway_footprint:{original_feature_count:features.length,filtered_feature_count:filteredFeatures.length,removed:footprint.removed,base_pair_count:base.assignment?.pair_count||0,base_green_count:base.green_features,axis_candidates:axisCandidates.map(x=>({lat:x.lat,lng:x.lng,source_fairway:x.raw.source_fairway,axis_length_m:x.raw.axis_length_m,green_gap_m:x.raw.green_gap_m,tee_side_m:x.raw.tee_side_m,green_side_tee_m:x.raw.green_side_tee_m})),augmented_pair_count:reconstruction.assignment?.pair_count||0,augmented_green_count:reconstruction.green_features},level2:{model_version:level2Recovery.model_version,diagnostics:level2Recovery.diagnostics,cleanup:level2Recovery.cleanup,numbering_verified:level2Recovery.numbering_verified,numbering_reason:level2Recovery.numbering_reason},scorecard_attempt:scorecardAttempt,partial_numbering:partial_result?{ok:partial_result.ok,reason:partial_result.reason,missing_hole_numbers:partial_result.missing_hole_numbers,summary:partial_result.summary}:null,numbering_summary:numbering_result?.summary||null,final_geometry_validation:finalGeometryValidation,processor_result:result,blocked_mutations:mutations});
  }catch(e){return res.status(500).json({ok:false,dry_run:true,production_write:false,error:String(e?.message||e)});}
};
