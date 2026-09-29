/*
 * Preview-only trigger for Sierra Lakes Level 2 degraded shadow test.
 * The background worker deliberately excludes OSM golf=hole traces.
 */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
    const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    if(!url||!key)return res.status(503).json({ok:false,error:'supabase_server_config_missing'});
    const headers={apikey:key,'Content-Type':'application/json',Accept:'application/json'};
    if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
    const response=await fetch(url+'/functions/v1/sierra-degraded-shadow-test',{
      method:'POST',headers,body:'{}',redirect:'error',signal:AbortSignal.timeout(5000)
    });
    const text=await response.text();
    let body;try{body=JSON.parse(text)}catch{body={raw:text.slice(0,300)}}
    return res.status(response.status).json({
      ...body,
      armed:false,
      shadow_test:true,
      degraded_level:2,
      golf_hole_traces_hidden:true,
      production_geometry_modified:false,
      background:true
    });
  }catch(e){
    return res.status(503).json({ok:false,armed:false,shadow_test:true,degraded_level:2,golf_hole_traces_hidden:true,production_geometry_modified:false,background:true,error:String(e?.code||e?.name||'degraded_shadow_trigger_failed')});
  }
};
