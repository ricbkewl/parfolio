/*
 * Preview-only controlled Florida OSM staging run.
 * Hard locked to 5 courses, staging writes only, zero promotions.
 * Uses one combined Overpass request to avoid long sequential network waits.
 */
const {floridaSample}=require('../lib/gps-rollout/read-only-supabase');
const {upsert}=require('../lib/gps-rollout/supabase-stage-writer');

const EPS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
function distM(a,b){
  const R=6371000,toRad=x=>Number(x)*Math.PI/180;
  const p1=toRad(a.lat),p2=toRad(b.lat),dp=toRad(b.lat-a.lat),dl=toRad(b.lng-a.lng);
  const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function center(e){
  if(Number.isFinite(Number(e?.lat))&&Number.isFinite(Number(e?.lon)))return{lat:Number(e.lat),lng:Number(e.lon)};
  if(Number.isFinite(Number(e?.center?.lat))&&Number.isFinite(Number(e?.center?.lon)))return{lat:Number(e.center.lat),lng:Number(e.center.lon)};
  const pts=(Array.isArray(e?.geometry)?e.geometry:[]).filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon)));
  if(!pts.length)return null;
  return{lat:pts.reduce((s,p)=>s+Number(p.lat),0)/pts.length,lng:pts.reduce((s,p)=>s+Number(p.lon),0)/pts.length};
}
async function overpass(courses){
  const clauses=[];
  for(const c of courses){
    const lat=Number(c.latitude),lng=Number(c.longitude),r=1800;
    clauses.push(
      'nwr["leisure"="golf_course"](around:'+r+','+lat+','+lng+');',
      'nwr["golf"="course"](around:'+r+','+lat+','+lng+');',
      'way["golf"="hole"](around:'+r+','+lat+','+lng+');',
      'relation["golf"="hole"](around:'+r+','+lat+','+lng+');',
      'nwr["golf"="tee"](around:'+r+','+lat+','+lng+');',
      'nwr["golf"="green"](around:'+r+','+lat+','+lng+');'
    );
  }
  const q='[out:json][timeout:25];('+clauses.join('')+');out center geom meta;';
  let last='';
  for(const ep of EPS){
    try{
      const response=await fetch(ep,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'ParFolio-GPS-preview-stage/2.0'},body:'data='+encodeURIComponent(q),redirect:'error',signal:AbortSignal.timeout(12000)});
      if(response.ok)return response.json();
      last='HTTP '+response.status;
      if(![429,502,503,504].includes(response.status))break;
    }catch(e){last=String(e?.name||e?.message||e);}
  }
  const e=new Error('Overpass batch failed: '+last); e.code='OVERPASS_BATCH_FAILED'; throw e;
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  if(req.body?.stage_only!==true||req.body?.batch_size!==5)return res.status(400).json({error:'hard_locked_stage_only_batch_5'});
  const courses=await floridaSample(5);
  try{
    const data=await overpass(courses);
    const buckets=new Map(courses.map(c=>[c.id,{course:c,courseRows:[],holeRows:[],featureRows:[]}]));
    for(const e of data.elements||[]){
      const pt=center(e); if(!pt)continue;
      const nearest=courses.map(c=>({c,d:distM(pt,{lat:Number(c.latitude),lng:Number(c.longitude)})})).sort((a,b)=>a.d-b.d)[0];
      if(!nearest||nearest.d>1800)continue;
      const b=buckets.get(nearest.c.id),tags=e.tags||{},uri='https://www.openstreetmap.org/'+e.type+'/'+e.id,g=Array.isArray(e.geometry)?e.geometry:[];
      if(tags.leisure==='golf_course'||tags.golf==='course'){
        b.courseRows.push({osm_course_uri:uri,osm_id:e.id,osm_type:e.type,osm_version:e.version||null,osm_timestamp:e.timestamp||null,name:tags.name||null,normalized_name:String(tags.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),geometry_wkt:null,centroid_wkt:'POINT('+pt.lng+' '+pt.lat+')',lat:pt.lat,lng:pt.lng,raw:{...e,_candidate_distance_m:Math.round(nearest.d)}});
      }else if(tags.golf==='hole'){
        const n=parseInt(tags.ref||tags['golf:hole']||'',10),candidateUri='candidate:'+nearest.c.id;
        b.holeRows.push({osm_course_uri:candidateUri,osm_hole_uri:'osm:'+e.type+':'+e.id,osm_id:e.id,osm_type:e.type,osm_version:e.version||null,osm_timestamp:e.timestamp||null,hole_ref:tags.ref||null,hole_number:Number.isFinite(n)?n:null,hole_par:parseInt(tags.par||'',10)||null,geometry_wkt:g.length>1?'LINESTRING('+g.map(p=>p.lon+' '+p.lat).join(',')+')':null,object_type:e.type,valid_number:Number.isFinite(n)&&n>=1&&n<=18,raw:{...e,_candidate_distance_m:Math.round(nearest.d)}});
      }else if(tags.golf==='tee'||tags.golf==='green'){
        const candidateUri='candidate:'+nearest.c.id;
        b.featureRows.push({catalog_id:nearest.c.id,candidate_uri:candidateUri,feature_uri:uri,feature_type:tags.golf,osm_id:e.id,osm_type:e.type,osm_version:e.version||null,osm_timestamp:e.timestamp||null,lat:pt.lat,lng:pt.lng,raw:{...e,_candidate_distance_m:Math.round(nearest.d)}});
      }
    }
    const results=[];
    for(const {course,courseRows,holeRows,featureRows} of buckets.values()){
      const course_objects=await upsert('fl_osm_course_stage',courseRows,'osm_course_uri');
      const hole_objects=await upsert('fl_osm_hole_stage',holeRows,'osm_course_uri,osm_hole_uri');
      const feature_objects=await upsert('fl_osm_feature_stage',featureRows,'catalog_id,feature_uri');
      results.push({course_id:course.id,name:course.name,course_objects,hole_objects,feature_objects,status:'staged'});
    }
    return res.status(200).json({ok:true,armed:false,stage_only:true,promoted:0,batch_size:5,overpass_requests:1,results});
  }catch(e){
    return res.status(503).json({ok:false,armed:false,stage_only:true,promoted:0,error:String(e?.code||'stage_batch_failed')});
  }
};
