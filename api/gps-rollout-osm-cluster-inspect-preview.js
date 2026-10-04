module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const lat=30.6006301,lng=-81.5399491,dLat=0.015,dLng=0.018;
    const bbox=[lng-dLng,lat-dLat,lng+dLng,lat+dLat].join(',');
    const rr=await fetch('https://api.openstreetmap.org/api/0.6/map?bbox='+bbox,{headers:{'user-agent':'ParFolio-Amelia-Boundary-Diagnostic/1.0'},signal:AbortSignal.timeout(20000)});
    if(!rr.ok)return res.status(502).json({ok:false,error:'osm_'+rr.status});
    const xml=await rr.text();
    const nodes=new Map();
    for(const m of xml.matchAll(/<node\b[^>]*>/g)){
      const tag=m[0],id=(tag.match(/\bid="(\d+)"/)||[])[1],la=(tag.match(/\blat="([^"]+)"/)||[])[1],lo=(tag.match(/\blon="([^"]+)"/)||[])[1];
      if(id&&la&&lo)nodes.set(id,{lat:+la,lng:+lo});
    }
    const tagMap=s=>Object.fromEntries([...s.matchAll(/<tag\s+[^>]*k="([^"]+)"[^>]*v="([^"]*)"[^>]*\/>/g)].map(m=>[m[1],m[2]]));
    const candidates=[];
    for(const m of xml.matchAll(/<way\b[^>]*id="(\d+)"[\s\S]*?<\/way>/g)){
      const block=m[0],tags=tagMap(block);if(tags.leisure!=='golf_course'&&tags.golf!=='course')continue;
      const refs=[...block.matchAll(/<nd\s+[^>]*ref="(\d+)"/g)].map(x=>x[1]);
      const pts=refs.map(r=>nodes.get(r)).filter(Boolean);
      candidates.push({type:'way',id:m[1],name:tags.name||null,operator:tags.operator||null,point_count:pts.length,center:pts.length?{lat:pts.reduce((s,p)=>s+p.lat,0)/pts.length,lng:pts.reduce((s,p)=>s+p.lng,0)/pts.length}:null});
    }
    for(const m of xml.matchAll(/<relation\b[^>]*id="(\d+)"[\s\S]*?<\/relation>/g)){
      const block=m[0],tags=tagMap(block);if(tags.leisure!=='golf_course'&&tags.golf!=='course')continue;
      candidates.push({type:'relation',id:m[1],name:tags.name||null,operator:tags.operator||null,member_count:[...block.matchAll(/<member\b/g)].length});
    }
    return res.status(200).json({ok:true,bytes:xml.length,candidates});
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e)});}
};
