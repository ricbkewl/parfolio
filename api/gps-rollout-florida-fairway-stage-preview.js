/* Preview-only controlled test for Florida OSM fairway staging. */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const COURSE_ID='0029b4a9-c5c1-4b52-ad18-be6d2211ef20'; // Eastpointe CC East Course
  try{
    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
    const secret=String(process.env.SUPABASE_SECRET_KEY||'').trim();
    const service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    if(!url||(!secret&&!service))return res.status(503).json({ok:false,error:'supabase_server_config_missing'});
    const apikey=secret||service;
    const headers={apikey,'Content-Type':'application/json',Accept:'application/json'};
    // verify_jwt requires a JWT bearer token. Prefer legacy service-role JWT when available.
    if(service)headers.Authorization='Bearer '+service;
    else if(!apikey.startsWith('sb_secret_'))headers.Authorization='Bearer '+apikey;
    const r=await fetch(url+'/functions/v1/florida-osm-batch',{
      method:'POST',headers,body:JSON.stringify({course_id:COURSE_ID}),redirect:'error',signal:AbortSignal.timeout(55000)
    });
    const text=await r.text();let body;try{body=JSON.parse(text)}catch{body={raw:text.slice(0,500)}}
    return res.status(r.status).json({ok:r.ok,course_id:COURSE_ID,function_status:r.status,result:body});
  }catch(e){return res.status(503).json({ok:false,course_id:COURSE_ID,error:String(e?.message||e)});}
};
