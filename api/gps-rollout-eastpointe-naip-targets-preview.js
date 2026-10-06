/* Preview-only Eastpointe Level-3 target finder. No writes. */
const R=6371008.8,rad=v=>v*Math.PI/180;
function dist(a,b){const d1=rad(b.lat-a.lat),d2=rad(b.lng-a.lng),a1=rad(a.lat),a2=rad(b.lat),h=Math.sin(d1/2)**2+Math.cos(a1)*Math.cos(a2)*Math.sin(d2/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
function pts(f){return (Array.isArray(f?.raw?.geometry)?f.raw.geometry:[]).map(x=>({lat:Number(x.lat),lng:Number(x.lon??x.lng)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));}
function nearest(p,arr){return arr.length?Math.min(...arr.map(q=>dist(p,q))):Infinity;}
function farthestPair(a){let pair=null,d=-1;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const x=dist(a[i],a[j]);if(x>d){d=x;pair=[a[i],a[j]];}}return pair?{ends:pair,length_m:d}:null;}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('X-Robots-Tag','noindex');
 if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const id='0029b4a9-c5c1-4b52-ad18-be6d2211ef20';
 try{
  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,''),key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim(),service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();if(!url||!key)return res.status(503).json({ok:false,error:'supabase_server_config_missing'});
  const headers={apikey:key,Accept:'application/json'};if(service)headers.Authorization='Bearer '+service;
  async function rest(path){const r=await fetch(url+'/rest/v1/'+path,{headers,signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('rest_'+r.status);return r.json();}
  const fs=await rest('fl_osm_feature_stage?catalog_id=eq.'+id+'&feature_type=in.(tee,green,fairway)&select=feature_type,feature_uri,lat,lng,raw');
  const fairways=fs.filter(x=>x.feature_type==='fairway'),cloud=fairways.flatMap(pts),kept=fs.filter(f=>f.feature_type==='fairway'||nearest({lat:Number(f.lat),lng:Number(f.lng)},cloud)<=300);
  const greens=kept.filter(x=>x.feature_type==='green').map(x=>({lat:Number(x.lat),lng:Number(x.lng)}));
  const tees=kept.filter(x=>x.feature_type==='tee').map(x=>({lat:Number(x.lat),lng:Number(x.lng)}));
  const targets=[];
  for(const f of fairways){const ax=farthestPair(pts(f));if(!ax||ax.length_m<70)continue;const a={p:ax.ends[0],tm:nearest(ax.ends[0],tees),gm:nearest(ax.ends[0],greens)},b={p:ax.ends[1],tm:nearest(ax.ends[1],tees),gm:nearest(ax.ends[1],greens)};const ab=a.tm+b.gm,ba=b.tm+a.gm,ts=ab<=ba?a:b,gs=ab<=ba?b:a;if(gs.gm<65)continue;targets.push({source_fairway:f.feature_uri,lat:+gs.p.lat.toFixed(7),lng:+gs.p.lng.toFixed(7),axis_length_m:+ax.length_m.toFixed(1),green_gap_m:+gs.gm.toFixed(1),tee_gap_m:+gs.tm.toFixed(1),orientation_cost:+Math.min(ab,ba).toFixed(1)});} 
  targets.sort((a,b)=>b.green_gap_m-a.green_gap_m);
  const unique=[];for(const t of targets){if(unique.some(x=>dist(x,t)<70))continue;unique.push(t);}
  return res.status(200).json({ok:true,read_only:true,production_write:false,counts:{kept_greens:greens.length,kept_tees:tees.length,fairways:fairways.length},targets:unique.slice(0,8)});
 }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e),production_write:false});}
};