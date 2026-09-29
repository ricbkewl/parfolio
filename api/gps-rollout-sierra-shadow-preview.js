/*
 * Preview-only Gold Standard shadow test for Sierra Lakes Golf Club.
 * Reconstructs from fresh OSM data and compares with protected production geometry.
 * No staging writes. No promotion. No production geometry changes.
 */
const {select}=require('../lib/gps-rollout/read-only-supabase');
const {validateTeeCenterCourse,dedupeNewestHoleEdits}=require('../lib/gps-rollout/gps-rollout-engine');

const COURSE_ID='7464a439-b9e5-4e9a-b1b8-97233f5b21eb';
const EPS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];

function center(e){
  if(Number.isFinite(Number(e?.lat))&&Number.isFinite(Number(e?.lon)))return{lat:Number(e.lat),lng:Number(e.lon)};
  if(Number.isFinite(Number(e?.center?.lat))&&Number.isFinite(Number(e?.center?.lon)))return{lat:Number(e.center.lat),lng:Number(e.center.lon)};
  const pts=(Array.isArray(e?.geometry)?e.geometry:[]).filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon)));
  if(!pts.length)return null;
  return{lat:pts.reduce((s,p)=>s+Number(p.lat),0)/pts.length,lng:pts.reduce((s,p)=>s+Number(p.lon),0)/pts.length};
}
function normalize(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();}
function rad(v){return Number(v)*Math.PI/180;}
function meters(a,b){
  const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),lat1=rad(a.lat),lat2=rad(b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 6371008.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
async function overpass(lat,lng){
  const r=1800;
  const q='[out:json][timeout:20];(way["golf"="hole"](around:'+r+','+lat+','+lng+');relation["golf"="hole"](around:'+r+','+lat+','+lng+');nwr["leisure"="golf_course"](around:'+r+','+lat+','+lng+');nwr["golf"="course"](around:'+r+','+lat+','+lng+'););out center geom meta;';
  let last='overpass_failed';
  for(let i=0;i<EPS.length;i++){
    try{
      const response=await fetch(EPS[i],{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'ParFolio-Sierra-Shadow/1.0'},body:'data='+encodeURIComponent(q),redirect:'error',signal:AbortSignal.timeout(10000)});
      if(response.ok)return response.json();
      last='HTTP '+response.status;
    }catch(e){last=String(e?.name||e?.message||e);}
  }
  const err=new Error(last);err.code='OVERPASS_SHADOW_FAILED';throw err;
}
function parse(data,course){
  const sourceCourses=[],holes=[];
  for(const e of data.elements||[]){
    const tags=e.tags||{},g=Array.isArray(e.geometry)?e.geometry:[];
    if(tags.leisure==='golf_course'||tags.golf==='course'){
      const pt=center(e); if(!pt)continue;
      sourceCourses.push({uri:'https://www.openstreetmap.org/'+e.type+'/'+e.id,name:tags.name||null,normalized_name:normalize(tags.name),lat:pt.lat,lng:pt.lng});
    } else if(tags.golf==='hole'&&g.length>1){
      const n=parseInt(tags.ref||tags['golf:hole']||'',10);
      if(!Number.isInteger(n)||n<1||n>Number(course.holes))continue;
      holes.push({
        hole_number:n,
        osm_hole_uri:'https://www.openstreetmap.org/'+e.type+'/'+e.id,
        osm_version:e.version||null,osm_timestamp:e.timestamp||null,
        tee_lat:Number(g[0].lat),tee_lng:Number(g[0].lon),
        green_center_lat:Number(g[g.length-1].lat),green_center_lng:Number(g[g.length-1].lon)
      });
    }
  }
  return{sourceCourses,holes};
}
function stats(values){
  const v=values.filter(Number.isFinite).sort((a,b)=>a-b); if(!v.length)return null;
  const mean=v.reduce((a,b)=>a+b,0)/v.length;
  const median=v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;
  return{mean_m:Number(mean.toFixed(2)),median_m:Number(median.toFixed(2)),max_m:Number(v[v.length-1].toFixed(2))};
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const courses=await select('course_catalog',{select:'id,name,holes,latitude,longitude,mapping_class',id:'eq.'+COURSE_ID,limit:'1'});
    const course=courses?.[0];
    if(!course||course.mapping_class!=='gps_ready')return res.status(409).json({ok:false,error:'sierra_answer_key_not_protected'});
    const answer=await select('course_hole_geometry',{select:'hole_number,tee_lat,tee_lng,green_center_lat,green_center_lng',course_id:'eq.'+COURSE_ID,order:'hole_number.asc',limit:'18'});
    if(answer.length!==18)return res.status(409).json({ok:false,error:'sierra_answer_key_incomplete'});

    const data=await overpass(Number(course.latitude),Number(course.longitude));
    const parsed=parse(data,course);
    const named=parsed.sourceCourses.filter(x=>x.normalized_name===normalize(course.name));
    const deduped=dedupeNewestHoleEdits(parsed.holes);
    const validation=validateTeeCenterCourse(deduped,course.holes);

    const byHole=new Map(deduped.map(r=>[Number(r.hole_number),r]));
    const comparisons=answer.map(a=>{
      const r=byHole.get(Number(a.hole_number));
      if(!r)return{hole_number:a.hole_number,recovered:false};
      const tee_error_m=meters({lat:a.tee_lat,lng:a.tee_lng},{lat:r.tee_lat,lng:r.tee_lng});
      const green_error_m=meters({lat:a.green_center_lat,lng:a.green_center_lng},{lat:r.green_center_lat,lng:r.green_center_lng});
      return{
        hole_number:a.hole_number,recovered:true,
        tee_error_m:Number(tee_error_m.toFixed(2)),
        green_error_m:Number(green_error_m.toFixed(2)),
        same_endpoint_pair:tee_error_m<1&&green_error_m<1,
        recovered_osm_hole_uri:r.osm_hole_uri
      };
    });
    const teeErrors=comparisons.map(x=>x.tee_error_m);
    const greenErrors=comparisons.map(x=>x.green_error_m);
    const perfect=comparisons.filter(x=>x.same_endpoint_pair).length;

    return res.status(200).json({
      ok:true,armed:false,read_only:true,shadow_test:true,production_geometry_modified:false,
      course:{id:course.id,name:course.name,holes:course.holes},
      source_course_exact_name_matches:named,
      raw_hole_objects:parsed.holes.length,
      reconstructed_holes:deduped.length,
      validator:validation,
      perfect_endpoint_pairs:perfect,
      tee_error:stats(teeErrors),
      green_error:stats(greenErrors),
      comparisons
    });
  }catch(e){
    return res.status(503).json({ok:false,armed:false,read_only:true,shadow_test:true,production_geometry_modified:false,error:String(e?.code||e?.message||'shadow_test_failed')});
  }
};
