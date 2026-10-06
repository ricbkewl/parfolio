/* Preview-only end-to-end dry run through the actual ParFolio rollout processor.
 * Reads real Florida staging data. All mutation adapters are replaced with
 * report-only stubs: no promotion, no review writes, no visual-queue writes.
 */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const COURSE_ID='0029b4a9-c5c1-4b52-ad18-be6d2211ef20'; // Eastpointe CC East
  try{
    const {reconstructFromStagedFeatures}=require('../lib/gps-rollout/gps-rollout-level2-geometry');
    const {lookupScorecardWeb}=require('../lib/gps-rollout/gps-rollout-scorecard-web-discovery');
    const {numberByScorecard}=require('../lib/gps-rollout/gps-rollout-scorecard-numbering');
    const {numberedRows}=require('../lib/gps-rollout/gps-rollout-source-adapter');
    const {createCourseProcessor}=require('../lib/gps-rollout/gps-rollout-processor');

    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
    const secret=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    const service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    if(!url||!secret)return res.status(503).json({ok:false,error:'supabase_server_config_missing'});
    const headers={apikey:secret,Accept:'application/json'};if(service)headers.Authorization='Bearer '+service;
    async function rest(path,timeout=8000){
      const r=await fetch(url+'/rest/v1/'+path,{headers,signal:AbortSignal.timeout(timeout)});
      if(!r.ok)throw new Error('rest_'+r.status+'_'+path.split('?')[0]);
      return r.json();
    }

    const courses=await rest('course_catalog?id=eq.'+COURSE_ID+'&select=id,name,city,state_code,country_code,holes,par,website,mapping_class');
    const candidate=courses?.[0];if(!candidate)return res.status(404).json({ok:false,error:'course_not_found'});
    const matches=await rest('fl_course_match_stage?catalog_id=eq.'+COURSE_ID+'&select=*');
    const match=matches?.[0];
    if(!match?.osm_course_uri)return res.status(200).json({ok:true,dry_run:true,production_write:false,promoted:false,course:candidate,result:{status:'review',reason:'missing_source_course_identity'}});
    const sourceUri=encodeURIComponent(match.osm_course_uri);
    const sources=await rest('fl_osm_course_stage?osm_course_uri=eq.'+sourceUri+'&select=*');
    const source=sources?.[0];
    const [rows,features]=await Promise.all([
      rest('fl_safe_hole_geometry?osm_course_uri=eq.'+sourceUri+'&select=*&order=hole_number.asc'),
      rest('fl_osm_feature_stage?catalog_id=eq.'+COURSE_ID+'&feature_type=in.(tee,green,fairway)&select=catalog_id,candidate_uri,feature_uri,feature_type,lat,lng,raw')
    ]);

    let level2Recovery=null,scorecardAttempt=null;
    const declared=Number(candidate.holes);
    if([9,18].includes(declared)&&(rows||[]).length!==declared&&(features||[]).some(x=>x.feature_type==='tee')&&(features||[]).some(x=>x.feature_type==='green')){
      const reconstruction=reconstructFromStagedFeatures({course:candidate,featureRows:features||[]});
      let numbering_verified=false,numbered_rows=null,numbering_result=null,scorecard=null;
      if(reconstruction.assignment?.pair_count===declared){
        try{
          scorecard=await lookupScorecardWeb(candidate);
          scorecardAttempt={ok:Boolean(scorecard?.ok),reason:scorecard?.reason||null,source:scorecard?.source||null};
          if(scorecard?.ok){
            numbering_result=numberByScorecard({course:candidate,assignment:reconstruction.assignment,scorecard});
            numbering_verified=Boolean(numbering_result?.ok);
            if(numbering_verified)numbered_rows=numberedRows(numbering_result);
          }
        }catch(e){scorecardAttempt={ok:false,reason:String(e?.message||e)};}
      }else scorecardAttempt={ok:false,reason:'pair_count_not_complete_scorecard_lookup_skipped'};
      level2Recovery={
        course:{id:candidate.id,holes:declared,par:candidate.par??null},
        assignment:reconstruction.assignment,cleanup:reconstruction.cleanup,
        numbering_verified,numbered_rows,
        numbering_source:numbering_result?.source||scorecard?.source||null,
        numbering_summary:numbering_result?.summary||null,
        numbering_reason:numbering_result?.reason||scorecard?.reason||null,
        model_version:reconstruction.model_version,
        diagnostics:{tee_features:reconstruction.tee_features,raw_green_features:reconstruction.raw_green_features,green_features:reconstruction.green_features,fairway_features:reconstruction.fairway_features,tee_cluster_count:reconstruction.tee_cluster_count,refined_tee_cluster_count:reconstruction.refined_tee_cluster_count,pair_count:reconstruction.assignment?.pair_count||0}
      };
    }

    const staged={
      matchedCourse:source?{name:source.name,osm_course_uri:source.osm_course_uri,raw:source.raw}:null,
      rows:rows||[],level2Recovery,facilitySource:'openstreetmap',imageryAvailable:true
    };
    const mutations=[];
    const adapter={
      async loadStagedCandidate(){return staged;},
      async enrichFacility(){return {dry_run:true,would_enrich:false};},
      async promoteValidated({decision}){
        mutations.push({type:'promotion_blocked_by_dry_run',row_count:decision?.rows?.length||0});
        return {status:'would_promote',dry_run:true,row_count:decision?.rows?.length||0};
      },
      async markReview({reason,detail}){
        mutations.push({type:'review_write_blocked_by_dry_run',reason});
        return {status:'review',reason,dry_run:true,detail:detail||null};
      },
      async queueVisualRecovery({missing_holes,level2}){
        mutations.push({type:'visual_queue_write_blocked_by_dry_run',missing_holes});
        return {dry_run:true,would_queue:true,missing_holes,level2:level2||null};
      }
    };
    const processor=createCourseProcessor(adapter);
    const result=await processor.processCandidate({region:{country_code:'US',state_code:'FL'},candidate,batch_id:'dry-run-no-write'});

    return res.status(200).json({
      ok:true,dry_run:true,actual_processor:true,production_write:false,promoted:false,
      course:{id:candidate.id,name:candidate.name,holes:candidate.holes,par:candidate.par,mapping_class:candidate.mapping_class},
      source:{osm_course_uri:source?.osm_course_uri||null,source_name:source?.name||null},
      authoritative_stage:{row_count:(rows||[]).length},
      level2:level2Recovery?{model_version:level2Recovery.model_version,diagnostics:level2Recovery.diagnostics,cleanup:level2Recovery.cleanup,numbering_verified:level2Recovery.numbering_verified,numbering_reason:level2Recovery.numbering_reason}:null,
      scorecard_attempt:scorecardAttempt,
      processor_result:result,
      blocked_mutations:mutations
    });
  }catch(e){return res.status(500).json({ok:false,dry_run:true,production_write:false,error:String(e?.message||e)});}
};
