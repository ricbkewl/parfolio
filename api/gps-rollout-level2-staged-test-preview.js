/* Preview-only verification of the reusable Level-2 source adapter. No writes. */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const COURSE_ID='0029b4a9-c5c1-4b52-ad18-be6d2211ef20';
  try{
    const {buildLevel2}=require('../lib/gps-rollout/gps-rollout-source-adapter');
    const {level2RecoveryDecision}=require('../lib/gps-rollout/gps-rollout-level2-recovery');
    const {validateTeeCenterCourse}=require('../lib/gps-rollout/gps-rollout-engine');
    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
    const secret=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim(),service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    if(!url||!secret)return res.status(503).json({ok:false,error:'supabase_server_config_missing',production_write:false});
    const headers={apikey:secret,Accept:'application/json'};if(service)headers.Authorization='Bearer '+service;
    async function rest(path,timeout=8000){const r=await fetch(url+'/rest/v1/'+path,{headers,signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error('rest_'+r.status+'_'+path.split('?')[0]);return r.json();}
    const candidate=(await rest('course_catalog?id=eq.'+COURSE_ID+'&select=id,name,city,state_code,country_code,latitude,longitude,holes,par,website,mapping_class'))?.[0];
    if(!candidate)return res.status(404).json({ok:false,error:'course_not_found',production_write:false});
    const staged=await rest('fl_osm_feature_stage?catalog_id=eq.'+COURSE_ID+'&feature_type=in.(tee,green,fairway)&select=catalog_id,candidate_uri,feature_uri,feature_type,lat,lng,raw');
    const fakeDb={from(table){
      if(table!=='fl_osm_feature_stage')throw new Error('dry_run_db_unexpected_table_'+table);
      const q={select(){return q;},eq(){return q;},in(){return Promise.resolve({data:staged,error:null});}};
      return q;
    }};
    const level2=await buildLevel2(fakeDb,candidate);
    if(!level2)return res.status(200).json({ok:false,dry_run:true,production_write:false,reason:'no_level2_candidate'});
    const decision=level2RecoveryDecision(level2);
    const validation=Array.isArray(level2.numbered_rows)?validateTeeCenterCourse(level2.numbered_rows,Number(candidate.holes)):null;
    const {createCourseProcessor}=require('../lib/gps-rollout/gps-rollout-processor');
    const blockedMutations=[];
    const processor=createCourseProcessor({
      async loadStagedCandidate(){return {matchedCourse:{name:candidate.name,osm_course_uri:null,raw:{},identity_mode:'catalog_bound_level2'},rows:[],level2Recovery:level2,facilitySource:'catalog_bound_level2',imageryAvailable:true};},
      async enrichFacility(){return {dry_run:true,would_enrich:false};},
      async promoteValidated({decision}){blockedMutations.push({type:'promotion_blocked_by_dry_run',row_count:decision?.rows?.length||0});return {status:'would_promote',dry_run:true,row_count:decision?.rows?.length||0};},
      async markReview({reason}){blockedMutations.push({type:'review_write_blocked_by_dry_run',reason});return {status:'review',dry_run:true,reason};},
      async queueVisualRecovery({missing_holes}){blockedMutations.push({type:'visual_queue_write_blocked_by_dry_run',missing_holes});return {dry_run:true,would_queue:true,missing_holes};}
    });
    const processorResult=await processor.processCandidate({region:{country_code:'US',state_code:'FL'},candidate,batch_id:'dry-run-no-write'});
    return res.status(200).json({
      ok:true,dry_run:true,reusable_adapter:true,production_write:false,promoted:false,
      course:{id:candidate.id,name:candidate.name,holes:candidate.holes,par:candidate.par,mapping_class:candidate.mapping_class},
      diagnostics:level2.diagnostics,
      cleanup:level2.cleanup,
      numbering:{verified:level2.numbering_verified,reason:level2.numbering_reason,source:level2.numbering_source,summary:level2.numbering_summary,route_aware:Boolean(level2.numbering?.route_aware)},
      final_geometry_validation:validation,
      level2_decision:decision,
      numbered_row_count:level2.numbered_rows?.length||0,
      actual_processor_result:processorResult,
      blocked_mutations:blockedMutations,
      promotion_rows:String(req.query?.rows||'')==='1'?(level2.numbered_rows||[]):undefined
    });
  }catch(e){return res.status(500).json({ok:false,dry_run:true,production_write:false,error:String(e?.message||e)});}
};