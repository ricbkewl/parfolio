/*
 * Read-only Supabase REST client for rollout dry runs.
 * No mutation methods are exposed.
 */
function env(){
  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!url||!key)throw new Error('server Supabase configuration missing');
  return {url,key};
}
async function select(path,params={}){
  const {url,key}=env();
  const qs=new URLSearchParams(params);
  const r=await fetch(`${url}/rest/v1/${path}?${qs}`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json'}});
  if(!r.ok)throw new Error(`Supabase read failed: ${r.status}`);
  return r.json();
}
async function floridaSample(limit=5){
  return select('course_catalog',{
    select:'id,name,city,state_code,country_code,latitude,longitude,holes,mapping_class,imported_at',
    country_code:'eq.US',state_code:'eq.FL',is_active:'eq.true',mapping_class:'neq.gps_ready',
    order:'imported_at.asc,id.asc',limit:String(Math.min(5,Math.max(1,Number(limit)||5)))
  });
}
module.exports={env,select,floridaSample};
