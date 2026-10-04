module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const lat=34.5277382,lng=-117.2267326,dLat=0.015,dLng=0.018;
    const bbox=[lng-dLng,lat-dLat,lng+dLng,lat+dLat].join(',');
    const rr=await fetch('https://api.openstreetmap.org/api/0.6/map?bbox='+bbox,{headers:{'user-agent':'ParFolio-Cluster-Diagnostic/1.0'},signal:AbortSignal.timeout(20000)});
    if(!rr.ok)return res.status(502).json({ok:false,error:'osm_'+rr.status});
    const xml=await rr.text();
    const ids=['1164699120','1164699121','1164699122','1164703668','1164703669','1164703670'];
    const nodes=new Map();
    for(const m of xml.matchAll(/<node\s+[^>]*id="(\d+)"[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*\/?>(?:<\/node>)?/g))nodes.set(m[1],{lat:+m[2],lng:+m[3]});
    const ways=[];
    for(const id of ids){
      const m=xml.match(new RegExp('<way\\s+[^>]*id="'+id+'"[\\s\\S]*?<\\/way>'));
      if(!m){ways.push({id,error:'not_found'});continue;}
      const refs=[...m[0].matchAll(/<nd\s+[^>]*ref="(\d+)"/g)].map(x=>x[1]);
      const pts=refs.map(r=>nodes.get(r)).filter(Boolean);
      if(!pts.length){ways.push({id,error:'no_nodes'});continue;}
      ways.push({id,lat:pts.reduce((s,p)=>s+p.lat,0)/pts.length,lng:pts.reduce((s,p)=>s+p.lng,0)/pts.length,node_count:pts.length});
    }
    const ok=ways.filter(x=>Number.isFinite(x.lat));
    const rad=v=>v*Math.PI/180,dist=(a,b)=>{const R=6371008.8,dla=rad(b.lat-a.lat),dlo=rad(b.lng-a.lng),la1=rad(a.lat),la2=rad(b.lat);const h=Math.sin(dla/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dlo/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};
    let a=ok[0],b=ok[0],max=-1;
    for(let i=0;i<ok.length;i++)for(let j=i+1;j<ok.length;j++){const d=dist(ok[i],ok[j]);if(d>max){max=d;a=ok[i];b=ok[j];}}
    let ca={lat:a.lat,lng:a.lng},cb={lat:b.lat,lng:b.lng},A=[],B=[];
    for(let n=0;n<12;n++){A=[];B=[];for(const p of ok)(dist(p,ca)<=dist(p,cb)?A:B).push(p);if(!A.length||!B.length)break;ca={lat:A.reduce((s,p)=>s+p.lat,0)/A.length,lng:A.reduce((s,p)=>s+p.lng,0)/A.length};cb={lat:B.reduce((s,p)=>s+p.lat,0)/B.length,lng:B.reduce((s,p)=>s+p.lng,0)/B.length};}
    return res.status(200).json({ok:true,ways,max_separation_m:+max.toFixed(1),split:[{ids:A.map(x=>x.id),center:ca,count:A.length},{ids:B.map(x=>x.id),center:cb,count:B.length}]});
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e)});}
};
