/*
 * Preview-only Level 2 degraded shadow trigger.
 * Third blind validation: Amelia National Golf And Country Club, Florida.
 * Vercel fetches weak OSM tee/green/fairway source XML, then sends the
 * payload to Supabase for frozen Level 2 reconstruction.
 * golf=hole traces are not used by the worker.
 */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});

  const COURSE_ID='0122f028-908a-4667-a72c-445fe5981e74'; // Amelia National Golf And Country Club
  const TEST_NAME='amelia_national_level2_blind_validation_v1';

  try{
    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
    const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    if(!url||!key)return res.status(503).json({ok:false,error:'supabase_server_config_missing'});
    const headers={apikey:key,'Content-Type':'application/json',Accept:'application/json'};
    if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;

    const courseResp=await fetch(
      url+'/rest/v1/course_catalog?id=eq.'+encodeURIComponent(COURSE_ID)+'&select=id,name,latitude,longitude',
      {headers,redirect:'error',signal:AbortSignal.timeout(5000)}
    );
    if(!courseResp.ok)return res.status(courseResp.status).json({ok:false,error:'course_lookup_failed'});
    const rows=await courseResp.json();
    const course=Array.isArray(rows)?rows[0]:null;
    if(!course||!Number.isFinite(Number(course.latitude))||!Number.isFinite(Number(course.longitude))){
      return res.status(404).json({ok:false,error:'course_location_missing'});
    }

    const lat=Number(course.latitude),lng=Number(course.longitude);
    const dLat=0.015,dLng=0.018;
    const bbox=[lng-dLng,lat-dLat,lng+dLng,lat+dLat].join(',');
    const osmResp=await fetch('https://api.openstreetmap.org/api/0.6/map?bbox='+encodeURIComponent(bbox),{
      headers:{'user-agent':'ParFolio-Level2-Blind-Validation/1.0',Accept:'application/xml,text/xml,*/*'},
      redirect:'error',
      signal:AbortSignal.timeout(12000)
    });
    if(!osmResp.ok)return res.status(502).json({ok:false,error:'osm_fetch_failed',osm_status:osmResp.status});
    const osmXml=await osmResp.text();
    if(osmXml.length<100)return res.status(502).json({ok:false,error:'osm_payload_empty'});
    if(osmXml.length>8000000)return res.status(413).json({ok:false,error:'osm_payload_too_large',bytes:osmXml.length});

    const workerResp=await fetch(url+'/functions/v1/gps-level2-payload-shadow',{
      method:'POST',headers,
      body:JSON.stringify({course_id:COURSE_ID,test_name:TEST_NAME,osm_xml:osmXml}),
      redirect:'error',signal:AbortSignal.timeout(9000)
    });
    const text=await workerResp.text();
    let body;try{body=JSON.parse(text)}catch{body={raw:text.slice(0,300)}}
    return res.status(workerResp.status).json({
      ...body,
      armed:false,
      shadow_test:true,
      degraded_level:2,
      golf_hole_traces_hidden:true,
      production_geometry_modified:false,
      background:true,
      payload_fetch:'vercel',
      course_name:course.name||'Amelia National Golf And Country Club',
      osm_payload_bytes:osmXml.length
    });
  }catch(e){
    return res.status(503).json({
      ok:false,armed:false,shadow_test:true,degraded_level:2,
      golf_hole_traces_hidden:true,production_geometry_modified:false,background:true,
      error:String(e?.code||e?.name||'payload_shadow_trigger_failed')
    });
  }
};
