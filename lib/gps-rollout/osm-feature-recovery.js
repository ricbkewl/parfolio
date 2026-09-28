/*
 * Zero-cost Tier 2B authoritative recovery from OSM golf features.
 * Pairs OSM tee/green features to numbered hole traces conservatively.
 * Never fabricates coordinates and skips ambiguous matches.
 */
const R=6371000;
function rad(v){return Number(v)*Math.PI/180;}
function hav(a,b){
  const p1=rad(a.lat),p2=rad(b.lat),dp=rad(b.lat-a.lat),dl=rad(b.lng-a.lng);
  const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function pointOf(f){
  if(Number.isFinite(Number(f?.lat))&&Number.isFinite(Number(f?.lon)))return{lat:Number(f.lat),lng:Number(f.lon)};
  if(Number.isFinite(Number(f?.center?.lat))&&Number.isFinite(Number(f?.center?.lon)))return{lat:Number(f.center.lat),lng:Number(f.center.lon)};
  const g=Array.isArray(f?.geometry)?f.geometry:[];
  if(g.length){
    const pts=g.filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon)));
    if(pts.length)return{lat:pts.reduce((s,p)=>s+Number(p.lat),0)/pts.length,lng:pts.reduce((s,p)=>s+Number(p.lon),0)/pts.length};
  }
  return null;
}
function holeNumber(h){
  const raw=h?.tags?.ref??h?.tags?.['hole:ref']??h?.tags?.name;
  const m=String(raw||'').match(/(?:^|\b)(1[0-8]|[1-9])(?:\b|$)/);
  return m?Number(m[1]):null;
}
function endpoints(h){
  const g=(Array.isArray(h?.geometry)?h.geometry:[]).filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon)));
  if(g.length<2)return null;
  return {start:{lat:Number(g[0].lat),lng:Number(g[0].lon)},end:{lat:Number(g[g.length-1].lat),lng:Number(g[g.length-1].lon)}};
}
function pickUnique(features,target,maxMeters){
  const ranked=(features||[]).map(f=>({f,p:pointOf(f)})).filter(x=>x.p).map(x=>({...x,d:hav(x.p,target)})).filter(x=>x.d<=maxMeters).sort((a,b)=>a.d-b.d);
  if(!ranked.length)return null;
  if(ranked[1]&&ranked[1].d-ranked[0].d<20)return null;
  return ranked[0];
}
function recoverTeeGreenFromOsm({holes=[],tees=[],greens=[],declaredHoles}={}){
  const declared=Number(declaredHoles);
  if(![9,18].includes(declared))return{ok:false,reason:'declared_holes_required',rows:[]};
  const byNum=new Map();
  for(const h of holes){
    const n=holeNumber(h),ep=endpoints(h);
    if(!n||n>declared||!ep||byNum.has(n))continue;
    byNum.set(n,{h,ep});
  }
  const rows=[];
  for(let n=1;n<=declared;n++){
    const item=byNum.get(n); if(!item)continue;
    const tee=pickUnique(tees,item.ep.start,140);
    const green=pickUnique(greens,item.ep.end,180);
    if(!tee||!green)continue;
    const distance=hav(tee.p,green.p);
    const yards=distance*1.0936133;
    if(yards<20||yards>1000)continue;
    rows.push({
      hole_number:n,
      tee_lat:tee.p.lat,tee_lng:tee.p.lng,
      green_center_lat:green.p.lat,green_center_lng:green.p.lng,
      source:'openstreetmap_feature_recovery',
      tee_source_uri:tee.f.uri||null,
      green_source_uri:green.f.uri||null,
      tee_match_m:Math.round(tee.d*10)/10,
      green_match_m:Math.round(green.d*10)/10
    });
  }
  const nums=rows.map(r=>r.hole_number).sort((a,b)=>a-b);
  const complete=rows.length===declared&&nums.every((n,i)=>n===i+1);
  return{ok:complete,reason:complete?'complete_authoritative_tee_green':'incomplete_authoritative_tee_green',rows};
}

function parseLineStringWkt(wkt){
  const m=String(wkt||'').match(/^LINESTRING\((.+)\)$/i);
  if(!m)return null;
  const pts=m[1].split(',').map(s=>s.trim().split(/\s+/).map(Number)).filter(a=>a.length>=2&&a.every(Number.isFinite));
  if(pts.length<2)return null;
  return pts.map(([lng,lat])=>({lat,lng}));
}
function newestByHole(rows=[]){
  const out=new Map();
  for(const row of rows){
    const n=Number(row.hole_number);
    if(!Number.isInteger(n)||n<1||n>18)continue;
    const prev=out.get(n);
    const ts=Date.parse(row.osm_timestamp||0)||0,pts=Date.parse(prev?.osm_timestamp||0)||0;
    const ver=Number(row.osm_version||0),pver=Number(prev?.osm_version||0);
    if(!prev||ts>pts||(ts===pts&&ver>pver))out.set(n,row);
  }
  return out;
}
function recoverFromHoleTraceEndpoints({rows=[],declaredHoles}={}){
  const declared=Number(declaredHoles);
  if(![9,18].includes(declared))return{ok:false,reason:'declared_holes_required',rows:[]};
  const byHole=newestByHole(rows),recovered=[];
  for(let n=1;n<=declared;n++){
    const row=byHole.get(n); if(!row)return{ok:false,reason:'incomplete_hole_trace_set',rows:recovered};
    const pts=parseLineStringWkt(row.geometry_wkt); if(!pts)return{ok:false,reason:'invalid_hole_trace_geometry',rows:recovered};
    const tee=pts[0],green=pts[pts.length-1],yards=hav(tee,green)*1.0936133;
    if(!Number.isFinite(yards)||yards<20||yards>1000)return{ok:false,reason:'hole_trace_distance_out_of_range',hole_number:n,rows:recovered};
    recovered.push({
      hole_number:n,
      tee_lat:tee.lat,tee_lng:tee.lng,
      green_center_lat:green.lat,green_center_lng:green.lng,
      source:'openstreetmap_hole_trace_endpoints',
      osm_hole_uri:row.osm_hole_uri||null,
      osm_version:row.osm_version||null,
      osm_timestamp:row.osm_timestamp||null,
      distance_yards:yards
    });
  }
  return{ok:true,reason:'complete_authoritative_hole_trace_endpoints',rows:recovered};
}
module.exports={hav,pointOf,holeNumber,endpoints,pickUnique,recoverTeeGreenFromOsm,parseLineStringWkt,newestByHole,recoverFromHoleTraceEndpoints};
