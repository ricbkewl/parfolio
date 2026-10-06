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
    if(service)headers.Authorization='Bearer '+service;
    else if(!apikey.startsWith('sb_secret_'))headers.Authorization='Bearer '+apikey;

    const cr=await fetch(url+'/rest/v1/course_catalog?id=eq.'+COURSE_ID+'&select=id,name,latitude,longitude,mapping_class,state_code,is_active',{headers,signal:AbortSignal.timeout(5000)});
    if(!cr.ok)return res.status(cr.status).json({ok:false,error:'course_lookup_failed'});
    const rows=await cr.json(),course=rows?.[0];
    if(!course)return res.status(404).json({ok:false,error:'course_not_found'});
    const lat=Number(course.latitude),lng=Number(course.longitude),radius=1800;
    const q='[out:json][timeout:25];(nwr["leisure"="golf_course"](around:'+radius+','+lat+','+lng+');nwr["golf"="course"](around:'+radius+','+lat+','+lng+');way["golf"="hole"](around:'+radius+','+lat+','+lng+');relation["golf"="hole"](around:'+radius+','+lat+','+lng+');nwr["golf"="tee"](around:'+radius+','+lat+','+lng+');nwr["golf"="green"](around:'+radius+','+lat+','+lng+');nwr["golf"="fairway"](around:'+radius+','+lat+','+lng+'););out center geom meta;';
    const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
    let osm=null,last='';
    for(const ep of endpoints){
      try{
        const or=await fetch(ep,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'ParFolio-Vercel-Fairway-Test/1.0'},body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(30000)});
        if(or.ok){osm=await or.json();break;}last='HTTP '+or.status;
      }catch(e){last=String(e?.message||e)}
    }
    if(!osm)return res.status(502).json({ok:false,error:'overpass_fetch_failed',detail:last});
    const elements=Array.isArray(osm.elements)?osm.elements:[];
    const sr=await fetch(url+'/functions/v1/florida-osm-stage-payload',{
      method:'POST',headers,body:JSON.stringify({course_id:COURSE_ID,elements}),redirect:'error',signal:AbortSignal.timeout(12000)
    });
    const text=await sr.text();let body;try{body=JSON.parse(text)}catch{body={raw:text.slice(0,500)}}
    return res.status(sr.status).json({ok:sr.ok,course_id:COURSE_ID,course_name:course.name,osm_elements:elements.length,function_status:sr.status,result:body});
  }catch(e){return res.status(503).json({ok:false,course_id:COURSE_ID,error:String(e?.message||e)});}
};
