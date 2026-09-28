/*
 * Server-only Supabase REST writer for rollout staging.
 * This module is intentionally limited to allow-listed staging tables.
 */
const {env}=require('./read-only-supabase');
const ALLOWED=new Set(['fl_osm_course_stage','fl_osm_hole_stage','fl_osm_feature_stage']);
async function upsert(table,rows,onConflict){
  if(!ALLOWED.has(table))throw new Error('staging table not allowed');
  if(!Array.isArray(rows)||!rows.length)return 0;
  const {url,key}=env();
  const qs=new URLSearchParams();
  if(onConflict)qs.set('on_conflict',onConflict);
  const headers={apikey:key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'};
  if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
  const r=await fetch(`${url}/rest/v1/${table}?${qs}`,{method:'POST',headers,body:JSON.stringify(rows),redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok){const e=new Error(`Supabase staging write failed: ${r.status}`);e.code='SUPABASE_STAGE_HTTP_ERROR';e.status=r.status;throw e;}
  return rows.length;
}

async function rpc(name,args){
  if(name!=='gps_rollout_finalize_stage_batch')throw new Error('rollout RPC not allowed');
  const {url,key}=env();
  const headers={apikey:key,'Content-Type':'application/json',Accept:'application/json'};
  if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
  const r=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(args),redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok){const e=new Error(`Supabase rollout RPC failed: ${r.status}`);e.code='SUPABASE_ROLLOUT_RPC_ERROR';e.status=r.status;throw e;}
  return r.json();
}
module.exports={upsert,rpc};
