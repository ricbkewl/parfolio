module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const course={lat:30.6006301,lng:-81.5399491},dLat=0.015,dLng=0.018;
    const bbox=[course.lng-dLng,course.lat-dLat,course.lng+dLng,course.lat+dLat].join(',');
    const rr=await fetch('https://api.openstreetmap.org/api/0.6/map?bbox='+bbox,{headers:{'user-agent':'ParFolio-Amelia-Boundary-Diagnostic/1.2'},signal:AbortSignal.timeout(20000)});
    if(!rr.ok)return res.status(502).json({ok:false,error:'osm_'+rr.status});
    const xml=await rr.text();
    const nodes=new Map();
    for(const m of xml.matchAll(/<node\b[^>]*>/g)){
      const tag=m[0],id=(tag.match(/\bid="(\d+)"/)||[])[1],la=(tag.match(/\blat="([^"]+)"/)||[])[1],lo=(tag.match(/\blon="([^"]+)"/)||[])[1];
      if(id&&la&&lo)nodes.set(id,{lat:+la,lng:+lo});
    }
    const tagMap=s=>Object.fromEntries([...s.matchAll(/<tag\s+[^>]*k="([^"]+)"[^>]*v="([^"]*)"[^>]*\/>/g)].map(m=>[m[1],m[2]]));
    const blocks=[];
    for(const m of xml.matchAll(/<way\b[^>]*id="(\d+)"[\s\S]*?<\/way>/g)){
      const block=m[0],tags=tagMap(block),refs=[...block.matchAll(/<nd\s+[^>]*ref="(\d+)"/g)].map(x=>x[1]),pts=refs.map(r=>nodes.get(r)).filter(Boolean);
      blocks.push({id:m[1],tags,pts});
    }
    const pointInPoly=(p,poly)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const xi=poly[i].lng,yi=poly[i].lat,xj=poly[j].lng,yj=poly[j].lat;
      const hit=((yi>p.lat)!==(yj>p.lat))&&(p.lng<(xj-xi)*(p.lat-yi)/((yj-yi)||1e-12)+xi);if(hit)inside=!inside;
    }return inside;};
    const centers=blocks.filter(w=>w.pts.length&&['tee','green','fairway'].includes(w.tags.golf)).map(w=>({type:w.tags.golf,id:w.id,lat:w.pts.reduce((s,p)=>s+p.lat,0)/w.pts.length,lng:w.pts.reduce((s,p)=>s+p.lng,0)/w.pts.length}));
    const candidates=[];
    for(const w of blocks){
      if((w.tags.leisure!=='golf_course'&&w.tags.golf!=='course')||w.pts.length<3)continue;
      const counts={tee:0,green:0,fairway:0};for(const c of centers)if(pointInPoly(c,w.pts))counts[c.type]++;
      candidates.push({id:w.id,name:w.tags.name||null,contains_course_center:pointInPoly(course,w.pts),counts});
    }
    const relations=[];
    for(const m of xml.matchAll(/<relation\b[^>]*id="(\d+)"[\s\S]*?<\/relation>/g)){
      const block=m[0],tags=tagMap(block);if(tags.leisure!=='golf_course'&&tags.golf!=='course')continue;
      const members=[...block.matchAll(/<member\b[^>]*type="([^"]+)"[^>]*ref="(\d+)"[^>]*role="([^"]*)"[^>]*\/>/g)].map(x=>({type:x[1],ref:x[2],role:x[3]}));
      relations.push({id:m[1],name:tags.name||null,members});
    }
    return res.status(200).json({ok:true,candidates,relations});
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e)});}
};
