/*
 * Preview-only, read-only Eastpointe vision diagnostic.
 * This route deliberately imports no persistence or promotion modules.
 * Vercel Deployment Protection must authenticate the caller.
 */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method==='GET'&&req.query?.probe==='amelia_validator'){
    try{
      const {createAmeliaAuthoritativeReport}=require('../lib/gps-rollout/amelia-authoritative-report');
      const report=await createAmeliaAuthoritativeReport();
      return res.status(report.ok?200:503).json(report);
    }catch(err){
      return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,promotable:false,probe:'amelia_validator',error:'amelia_validator_failed'});
    }
  }
  if(req.method==='GET'&&req.query?.probe==='usgs'){
    try{
      const {floridaSample}=require('../lib/gps-rollout/read-only-supabase');
      const {exportUrl}=require('../lib/gps-rollout/usgs-imagery-provider');
      const rows=await floridaSample(1);
      const east=(Array.isArray(rows)?rows:[]).find(x=>/eastpointe/i.test(String(x.name||'')))||rows?.[0];
      if(!east)return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,promotable:false,probe:'usgs',error:'course_context_missing'});
      const url=exportUrl({lat:Number(east.latitude),lng:Number(east.longitude),width:1024,height:1024});
      const response=await fetch(url,{headers:{Accept:'image/jpeg,image/*'},redirect:'error',signal:AbortSignal.timeout(20000)});
      const type=String(response.headers.get('content-type')||'').split(';')[0];
      const bytes=response.ok?Buffer.from(await response.arrayBuffer()).length:0;
      return res.status(response.ok?200:503).json({ok:response.ok,armed:false,read_only:true,report_only:true,promotable:false,probe:'usgs',http_status:response.status,content_type:type,bytes});
    }catch(err){
      return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,promotable:false,probe:'usgs',error:'usgs_probe_failed'});
    }
  }
  if(req.method==='GET'&&req.query?.probe==='maptiler'){
    try{
      const {floridaSample}=require('../lib/gps-rollout/read-only-supabase');
      const {staticMapUrl}=require('../lib/gps-rollout/maptiler-imagery-provider');
      const rows=await floridaSample(1);
      const east=(Array.isArray(rows)?rows:[]).find(x=>/eastpointe/i.test(String(x.name||'')))||rows?.[0];
      if(!east)return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,promotable:false,probe:'maptiler',error:'course_context_missing'});
      const url=staticMapUrl({lat:Number(east.latitude),lng:Number(east.longitude),zoom:18,width:512,height:512});
      const response=await fetch(url,{headers:{Accept:'image/jpeg'},redirect:'error',signal:AbortSignal.timeout(20000)});
      const type=String(response.headers.get('content-type')||'').split(';')[0];
      const bytes=response.ok?Buffer.from(await response.arrayBuffer()).length:0;
      return res.status(response.ok?200:503).json({ok:response.ok,armed:false,read_only:true,report_only:true,promotable:false,probe:'maptiler',http_status:response.status,content_type:type,bytes});
    }catch(err){
      const code=String(err?.code||'');
      const status=Number.isInteger(err?.status)?err.status:null;
      return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,promotable:false,probe:'maptiler',error:code==='MAPTILER_CONFIG_MISSING'?'maptiler_configuration_missing':status?('maptiler_http_'+status):'maptiler_probe_failed'});
    }
  }
  if(req.method==='GET'&&req.query?.probe==='supabase_auth'){
    try{
      const {floridaSample}=require('../lib/gps-rollout/read-only-supabase');
      const rows=await floridaSample(1);
      return res.status(200).json({ok:true,armed:false,read_only:true,report_only:true,promotable:false,probe:'supabase_auth',row_count:Array.isArray(rows)?rows.length:0});
    }catch(err){
      const code=String(err?.code||'');
      const safe=code==='SUPABASE_CONFIG_MISSING'||code==='SUPABASE_PROJECT_MISMATCH'||(code==='SUPABASE_HTTP_ERROR'&&Number.isInteger(err?.status));
      const error=code==='SUPABASE_HTTP_ERROR'?`supabase_auth_http_${err.status}`:code.toLowerCase();
      return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,promotable:false,probe:'supabase_auth',error:safe?error:'supabase_auth_failed'});
    }
  }
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  if(req.body?.report_only!==true||!['eastpointe_east','tpc_treviso_bay'].includes(req.body?.test_course)||req.body?.batch_size!==1)
    return res.status(400).json({error:'hard_locked_to_eastpointe_report_only'});
  try{
    const {createEastpointeReport}=require('../lib/gps-rollout/eastpointe-vision-report');
    const report=await createEastpointeReport({testCourse:req.body.test_course})();
    return res.status(200).json(report);
  }catch(err){
    const known=new Set(['vision_configuration_missing','invalid_course_response','eastpointe_east_identity_requires_review','course_outside_test_region','course_already_protected','invalid_course_geometry_context','invalid_vision_point','geometry_rows_require_review','vision_returned_unrequested_or_duplicate_hole','supabase_course_read_failed','supabase_geometry_read_failed','supabase_configuration_missing','supabase_project_mismatch','imagery_or_maptiler_failed','maptiler_configuration_missing','ai_gateway_analysis_failed','external_vision_pipeline_failed','usgs_imagery_invalid_response','usgs_imagery_failed','imagery_provider_failed']);
    const code=String(err?.code||'');
    const safeSupabase=/^supabase_(course|geometry)_read_http_\d{3}$/.test(code);
    const safeMapTiler=/^maptiler_http_\d{3}$/.test(code);
    const safeUsgs=/^(usgs_imagery|ai_gateway)_http_\d{3}(?:_[a-z_]{1,50})?$/.test(code);
    return res.status(503).json({ok:false,armed:false,read_only:true,report_only:true,promotable:false,error:(known.has(code)||safeSupabase||safeMapTiler||safeUsgs)?code:'vision_report_failed'});
  }
};
