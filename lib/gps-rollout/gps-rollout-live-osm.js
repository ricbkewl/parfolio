/* Reusable free live-OSM refresh for ParFolio Level-2 recovery. No persistence. */
function pointsFromRaw(r){return (Array.isArray(r?.raw?.geometry)?r.raw.geometry:[]).map(x=>({lat:Number(x.lat),lng:Number(x.lon??x.lng)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));}
function boundsFromContext(course,rows=[]){
  const fairwayPoints=(rows||[]).filter(r=>r.feature_type==='fairway').flatMap(pointsFromRaw);
  const lat=Number(course?.latitude??course?.lat),lng=Number(course?.longitude??course?.lng);
  let minLat,maxLat,minLng,maxLng;
  if(fairwayPoints.length){
    minLat=Math.min(...fairwayPoints.map(p=>p.lat));maxLat=Math.max(...fairwayPoints.map(p=>p.lat));
    minLng=Math.min(...fairwayPoints.map(p=>p.lng));maxLng=Math.max(...fairwayPoints.map(p=>p.lng));
    const m=.002;minLat-=m;maxLat+=m;minLng-=m;maxLng+=m;
  }else{
    if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error('live_osm_course_center_missing');
    minLat=lat-.008;maxLat=lat+.008;minLng=lng-.008;maxLng=lng+.008;
  }
  const cap=(min,max,center,span=.024)=>max-min<=span?[min,max]:[center-span/2,center+span/2];
  const cLat=(minLat+maxLat)/2,cLng=(minLng+maxLng)/2;[minLat,maxLat]=cap(minLat,maxLat,cLat);[minLng,maxLng]=cap(minLng,maxLng,cLng);
  return {minLat,maxLat,minLng,maxLng,bbox:[minLng,minLat,maxLng,maxLat].join(',')};
}
function parseLiveOsmXml(xml){
  const nodeMap=new Map();
  for(const m of String(xml||'').matchAll(/<node\b([^>]*)\/>/g)){const a=m[1],id=(a.match(/\bid="(\d+)"/)||[])[1],lat=(a.match(/\blat="([^"]+)"/)||[])[1],lon=(a.match(/\blon="([^"]+)"/)||[])[1];if(id&&lat&&lon)nodeMap.set(id,{lat:Number(lat),lng:Number(lon)});}
  const rows=[];
  for(const m of String(xml||'').matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)){
    const attrs=m[1],body=m[2],id=(attrs.match(/id="(\d+)"/)||[])[1];if(!id)continue;
    const tag=(k,v)=>new RegExp('<tag\\s+k="'+k+'"\\s+v="'+v+'"\\s*\\/>').test(body);
    let type=null;if(tag('golf','tee'))type='tee';else if(tag('golf','green'))type='green';else if(tag('golf','fairway'))type='fairway';if(!type)continue;
    const refs=[...body.matchAll(/<nd\s+ref="(\d+)"\s*\/>/g)].map(x=>x[1]),pts=refs.map(x=>nodeMap.get(x)).filter(Boolean);if(!pts.length)continue;
    const lat=pts.reduce((s,p)=>s+p.lat,0)/pts.length,lng=pts.reduce((s,p)=>s+p.lng,0)/pts.length;
    rows.push({feature_uri:'https://www.openstreetmap.org/way/'+id,feature_type:type,lat,lng,raw:{live_osm:true,geometry:pts.map(p=>({lat:p.lat,lon:p.lng}))}});
  }
  return rows;
}
async function fetchLiveOsmFeatures({course,stagedRows=[],fetchImpl=globalThis.fetch,timeout_ms=9000,max_bytes=8000000}={}){
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  const bounds=boundsFromContext(course,stagedRows);
  const url='https://api.openstreetmap.org/api/0.6/map?bbox='+bounds.bbox;
  const r=await fetchImpl(url,{headers:{'user-agent':'ParFolio-GPS-Rollout/1.0','accept':'application/xml,text/xml'},redirect:'error',signal:AbortSignal.timeout(timeout_ms)});
  if(!r.ok)throw new Error('live_osm_http_'+r.status);
  const xml=await r.text(),bytes=Buffer.byteLength(xml);
  if(bytes<100||bytes>max_bytes)throw new Error('live_osm_payload_size_invalid');
  const features=parseLiveOsmXml(xml);
  return {ok:true,source:'openstreetmap_live_map',url,bounds,bytes,features,counts:{tee:features.filter(x=>x.feature_type==='tee').length,green:features.filter(x=>x.feature_type==='green').length,fairway:features.filter(x=>x.feature_type==='fairway').length}};
}
module.exports={pointsFromRaw,boundsFromContext,parseLiveOsmXml,fetchLiveOsmFeatures};
