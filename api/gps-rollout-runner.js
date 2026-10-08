/*
 * Protected Vercel server-side entrypoint for ParFolio GPS rollout.
 * Never exposes service credentials to the browser. Preview refresh marker: 2026-09-27.
 */
const crypto=require('crypto');
const {floridaSample}=require('../lib/gps-rollout/read-only-supabase');
function safeEqual(a,b){const A=Buffer.from(String(a||'')),B=Buffer.from(String(b||''));return A.length===B.length&&crypto.timingSafeEqual(A,B);}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  const expected=String(process.env.PARFOLIO_ROLLOUT_SECRET||'');
  const supplied=String(req.headers['x-parfolio-rollout-secret']||'');
  if(!expected||!safeEqual(expected,supplied))return res.status(401).json({error:'unauthorized'});

  const mode=String(req.body?.mode||'rollout');
  if(mode==='gold_standard_shadow'){
    if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({error:'not_found'});
    const allowed=new Set(['mode','country_code','state_code','report_only','test_course','batch_size']);
    if(req.body?.country_code!=='US'||req.body?.state_code!=='CA'||req.body?.report_only!==true||req.body?.test_course!=='sierra_lakes'||req.body?.batch_size!==1||Object.keys(req.body).some(k=>!allowed.has(k)))
      return res.status(400).json({error:'shadow_test_requires_fixed_sierra_lakes_report_only_request'});
    try{
      const {runSierraShadow}=require('../lib/gps-rollout/gold-standard-shadow');
      const {source_snapshot,...report}=await runSierraShadow();
      // Keep source provenance and hashes, but omit the bulky raw OSM response over HTTP.
      return res.status(report.status==='failed'?503:200).json({...report,execution:'live_read_only'});
    }catch(err){
      const known=new Set(['sierra_lakes_identity_requires_review','invalid_sierra_lakes_benchmark','invalid_verified_answer_key','invalid_recovered_geometry','benchmark_changed_during_run']);
      return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,promotable:false,promoted:0,error:known.has(err?.code)?err.code:'shadow_test_failed'});
    }
  }
  if(mode==='vision_report'){
    if(req.body?.country_code!=='US'||req.body?.state_code!=='FL'||req.body?.report_only!==true||req.body?.test_course!=='eastpointe_east'||req.body?.batch_size!==1)
      return res.status(400).json({error:'vision_report requires US/FL, report_only:true, test_course:eastpointe_east, batch_size:1'});
    try{
      const {createEastpointeReport}=require('../lib/gps-rollout/eastpointe-vision-report');
      return res.status(200).json(await createEastpointeReport()());
    }catch(err){
      const known=new Set(['vision_configuration_missing','invalid_course_response','eastpointe_east_identity_requires_review','course_outside_test_region','course_already_protected','invalid_course_geometry_context','invalid_vision_point','geometry_rows_require_review','vision_returned_unrequested_or_duplicate_hole']);
      return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,error:known.has(err?.code)?err.code:'vision_report_failed'});
    }
  }
  if(mode==='config_probe')return res.status(200).json({
    ok:true,armed:false,
    maptiler_configured:Boolean(String(process.env.MAPTILER_API_KEY||'').trim()),
    supabase_url_configured:Boolean(String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').trim()),
    service_role_configured:Boolean(String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim()),
    ai_gateway_configured:Boolean(String(process.env.AI_GATEWAY_API_KEY||'').trim()),
    vision_model_configured:Boolean(String(process.env.PARFOLIO_VISION_MODEL||'').trim())
  });

  const country=String(req.body?.country_code||'US').toUpperCase();
  const state=String(req.body?.state_code||'').toUpperCase();
  const batchSize=Math.min(50,Math.max(1,Number(req.body?.batch_size||5)));
  if(country==='US'&&!/^[A-Z]{2}$/.test(state))return res.status(400).json({error:'valid state_code required'});
  if(!['rollout','recovery','dry_run'].includes(mode))return res.status(400).json({error:'invalid mode'});
  if(mode==='dry_run'){
    if(country!=='US'||state!=='FL')return res.status(400).json({error:'initial dry run is restricted to US/FL'});
    try{const candidates=await floridaSample(batchSize);return res.status(200).json({ok:true,armed:false,read_only:true,mode,country_code:country,state_code:state,count:candidates.length,candidates});}
    catch(err){return res.status(503).json({ok:false,armed:false,read_only:true,error:String(err?.message||err)});}
  }
  return res.status(200).json({
    ok:true,armed:false,mode,country_code:country,state_code:state,batch_size:batchSize,
    message:'Protected rollout runner authenticated; execution remains disarmed pending service-client verification.'
  });
};

// Secure Preview refresh: rollout secret configured 2026-09-27.
