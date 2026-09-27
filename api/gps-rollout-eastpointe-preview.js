/*
 * Preview-only, read-only Eastpointe vision diagnostic.
 * This route deliberately imports no persistence or promotion modules.
 * Vercel Deployment Protection must authenticate the caller.
 */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.body?.report_only!==true||req.body?.test_course!=='eastpointe_east'||req.body?.batch_size!==1)
    return res.status(400).json({error:'hard_locked_to_eastpointe_report_only'});
  try{
    const {createEastpointeReport}=require('../lib/gps-rollout/eastpointe-vision-report');
    const report=await createEastpointeReport()();
    return res.status(200).json(report);
  }catch(err){
    const known=new Set(['vision_configuration_missing','invalid_course_response','eastpointe_east_identity_requires_review','course_outside_test_region','course_already_protected','invalid_course_geometry_context','invalid_vision_point','geometry_rows_require_review','vision_returned_unrequested_or_duplicate_hole','supabase_course_read_failed','supabase_geometry_read_failed','supabase_configuration_missing','imagery_or_maptiler_failed','ai_gateway_analysis_failed','external_vision_pipeline_failed']);
    const code=String(err?.code||'');
    const safeSupabase=/^supabase_(course|geometry)_read_http_\d{3}$/.test(code);
    return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,promotable:false,error:(known.has(code)||safeSupabase)?code:'vision_report_failed'});
  }
};
