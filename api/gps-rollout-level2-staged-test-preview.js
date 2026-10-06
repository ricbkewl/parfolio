/* Preview-only controlled regression test against staged Florida weak OSM features. */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const COURSE_ID='0029b4a9-c5c1-4b52-ad18-be6d2211ef20';
  try{
    const {reconstructFromStagedFeatures}=require('../lib/gps-rollout/gps-rollout-level2-geometry');
    const {level2RecoveryDecision}=require('../lib/gps-rollout/gps-rollout-level2-recovery');
    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
    const secret=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    const service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    if(!url||!secret)return res.status(503).json({ok:false,error:'supabase_server_config_missing'});
    const headers={apikey:secret,Accept:'application/json'};if(service)headers.Authorization='Bearer '+service;
    const [cr,fr]=await Promise.all([
      fetch(url+'/rest/v1/course_catalog?id=eq.'+COURSE_ID+'&select=id,name,holes,mapping_class',{headers,signal:AbortSignal.timeout(5000)}),
      fetch(url+'/rest/v1/fl_osm_feature_stage?catalog_id=eq.'+COURSE_ID+'&feature_type=in.(tee,green,fairway)&select=catalog_id,candidate_uri,feature_uri,feature_type,lat,lng,raw',{headers,signal:AbortSignal.timeout(8000)})
    ]);
    if(!cr.ok||!fr.ok)return res.status(502).json({ok:false,error:'stage_lookup_failed',course_status:cr.status,feature_status:fr.status});
    const courses=await cr.json(),features=await fr.json(),course=courses?.[0];if(!course)return res.status(404).json({ok:false,error:'course_not_found'});
    const reconstruction=reconstructFromStagedFeatures({course,featureRows:features||[]});
    const input={course:{holes:course.holes},assignment:reconstruction.assignment,cleanup:reconstruction.cleanup,numbering_verified:false};
    const decision=level2RecoveryDecision(input);
    return res.status(200).json({
      ok:true,course_id:course.id,course_name:course.name,mapping_class:course.mapping_class,
      diagnostics:{tee_features:reconstruction.tee_features,raw_green_features:reconstruction.raw_green_features,green_features:reconstruction.green_features,fairway_features:reconstruction.fairway_features,tee_cluster_count:reconstruction.tee_cluster_count,refined_tee_cluster_count:reconstruction.refined_tee_cluster_count,pair_count:reconstruction.assignment.pair_count},
      cleanup:reconstruction.cleanup,decision,
      production_write:false,promoted:false
    });
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e)});}
};
