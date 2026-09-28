/*
 * Read-only Supabase REST client for rollout dry runs.
 * No mutation methods are exposed.
 */
function env(){
  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
  const secretKey=String(process.env.SUPABASE_SECRET_KEY||'');
  const legacyKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  const key=secretKey||legacyKey;
  if(!url||!key){const e=new Error('server Supabase configuration missing');e.code='SUPABASE_CONFIG_MISSING';throw e;}
  const expectedRef='unsysuuhykdmbsasdhzg';
  let host='';
  try{host=new URL(url).hostname}catch{}
  if(host!==`${expectedRef}.supabase.co`){const e=new Error('ParFolio Supabase project mismatch');e.code='SUPABASE_PROJECT_MISMATCH';throw e;}
  // Server-only secret/service-role credential. Never expose through client bundles.
  return {url,key,secretKey,legacyKey};
}
async function select(path,params={}){
  const {url,key,secretKey,legacyKey}=env();
  const qs=new URLSearchParams(params);
  const request=async credential=>{
    const headers={apikey:credential,Accept:'application/json'};
    // New sb_secret_* keys are opaque API keys, not JWTs. Only legacy JWT keys belong in Bearer auth.
    if(!credential.startsWith('sb_secret_'))headers.Authorization=`Bearer ${credential}`;
    return fetch(`${url}/rest/v1/${path}?${qs}`,{headers});
  };
  let r=await request(key);
  // A stale/revoked modern secret must not shadow an already-configured legacy server key.
  // Retry once only for auth rejection, never for query/schema/server errors.
  if((r.status===401||r.status===403)&&secretKey&&legacyKey&&legacyKey!==secretKey)r=await request(legacyKey);
  if(!r.ok){const e=new Error(`Supabase read failed: ${r.status}`);e.code='SUPABASE_HTTP_ERROR';e.status=r.status;throw e;}
  return r.json();
}
async function floridaAfterCourse(courseId,limit=5){
  const cursor=await select('course_catalog',{
    select:'id,imported_at',
    id:'eq.'+courseId,
    limit:'1'
  });
  const row=cursor?.[0];
  if(!row?.imported_at)return floridaSample(limit);
  const iso=String(row.imported_at);
  return select('course_catalog',{
    select:'id,name,city,state_code,country_code,latitude,longitude,holes,mapping_class,imported_at',
    country_code:'eq.US',
    state_code:'eq.FL',
    is_active:'eq.true',
    mapping_class:'neq.gps_ready',
    or:`(imported_at.gt.${iso},and(imported_at.eq.${iso},id.gt.${courseId}))`,
    order:'imported_at.asc,id.asc',
    limit:String(Math.min(50,Math.max(1,Number(limit)||5)))
  });
}
async function floridaSample(limit=5){
  return select('course_catalog',{
    select:'id,name,city,state_code,country_code,latitude,longitude,holes,mapping_class,imported_at',
    country_code:'eq.US',state_code:'eq.FL',is_active:'eq.true',mapping_class:'neq.gps_ready',
    order:'imported_at.asc,id.asc',limit:String(Math.min(5,Math.max(1,Number(limit)||5)))
  });
}
module.exports={env,select,floridaSample,floridaAfterCourse};
