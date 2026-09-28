/*
 * Preview-only controlled Florida OSM staging run.
 * Hard locked to 5 courses, staging writes only, zero promotions.
 * Uses five small bounded Overpass requests in parallel for resilience.
 */
const {floridaSample}=require('../lib/gps-rollout/read-only-supabase');
const {upsert}=require('../lib/gps-rollout/supabase-stage-writer');

const EPS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
function center(e){
  if(Number.isFinite(Number(e?.lat))&&Number.isFinite(Number(e?.lon)))return{lat:Number(e.lat),lng:Number(e.lon)};
  if(Number.isFinite(Number(e?.center?.lat))&&Number.isFinite(Number(e?.center?.lon)))return{lat:Number(e.center.lat),lng:Number(e.center.lon)};
  const pts=(Array.isArray(e?.geometry)?e.geometry:[]).filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon)));
  if(!pts.length)return null;
  return{lat:pts.reduce((s,p)=>s+Number(p.lat),0)/pts.length,lng:pts.reduce((s,p)=>s+Number(p.lon),0)/pts.length};
}
async function fetchOne(course,index){
  const lat=Number(course.latitude),lng=Number(course.longitude),r=1600;
  const q='[out:json][timeout:18];(way["golf"="hole"](around:'+r+','+lat+','+lng+');relation["golf"="hole"](around:'+r+','+lat+','+lng+');nwr["golf"="tee"](around:'+r+','+lat+','+lng+');nwr["golf"="green"](around:'+r+','+lat+','+lng+');nwr["leisure"="golf_course"](around:'+r+','+lat+','+lng+');nwr["golf"="course"](around:'+r+','+lat+','+lng+'););out center geom meta;';
  let last='';
  for(let attempt=0;attempt<2;attempt++){
    const ep=EPS[(index+attempt)%EPS.length];
    try{
      const response=await fetch(ep,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'ParFolio-GPS-preview-stage/3.0'},body:'data='+encodeURIComponent(q),redirect:'error',signal:AbortSignal.timeout(9000)});
      if(response.ok)return await response.json();
      last='HTTP '+response.status;
      if(![429,502,503,504].includes(response.status))break;
    }catch(e){last=String(e?.name||e?.message||e);}
  }
  const err=new Error(last||'overpass_failed'); err.code='OVERPASS_COURSE_FAILED'; throw err;
}
function rowsFor(course,data){
  const candidateUri='candidate:'+course.id,courseRows=[],holeRows=[],featureRows=[];
  for(const e of data.elements||[]){
    const tags=e.tags||{},uri='https://www.openstreetmap.org/'+e.type+'/'+e.id,g=Array.isArray(e.geometry)?e.geometry:[],pt=center(e);
    if(tags.leisure==='golf_course'||tags.golf==='course'){
      if(!pt)continue;
      courseRows.push({osm_course_uri:uri,osm_id:e.id,osm_type:e.type,osm_version:e.version||null,osm_timestamp:e.timestamp||null,name:tags.name||null,normalized_name:String(tags.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),geometry_wkt:null,centroid_wkt:'POINT('+pt.lng+' '+pt.lat+')',latitude:pt.lat,longitude:pt.lng,raw:e});
    }else if(tags.golf==='hole'){
      const n=parseInt(tags.ref||tags['golf:hole']||'',10);
      holeRows.push({osm_course_uri:candidateUri,osm_hole_uri:'osm:'+e.type+':'+e.id,osm_id:e.id,osm_type:e.type,osm_version:e.version||null,osm_timestamp:e.timestamp||null,hole_ref:tags.ref||null,hole_number:Number.isFinite(n)?n:null,hole_par:parseInt(tags.par||'',10)||null,geometry_wkt:g.length>1?'LINESTRING('+g.map(p=>p.lon+' '+p.lat).join(',')+')':null,object_type:e.type,valid_number:Number.isFinite(n)&&n>=1&&n<=18,raw:e});
    }else if((tags.golf==='tee'||tags.golf==='green')&&pt){
      featureRows.push({catalog_id:course.id,candidate_uri:candidateUri,feature_uri:uri,feature_type:tags.golf,osm_id:e.id,osm_type:e.type,osm_version:e.version||null,osm_timestamp:e.timestamp||null,lat:pt.lat,lng:pt.lng,raw:e});
    }
  }
  return{courseRows,holeRows,featureRows};
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  if(req.body?.stage_only!==true||req.body?.batch_size!==5)return res.status(400).json({error:'hard_locked_stage_only_batch_5'});
  const courses=await floridaSample(5);
  const fetched=await Promise.all(courses.map(async(course,index)=>{
    try{return{course,data:await fetchOne(course,index),error:null};}
    catch(e){return{course,data:null,error:String(e?.code||e?.message||'overpass_failed')};}
  }));
  const results=[];
  for(const item of fetched){
    if(item.error){results.push({course_id:item.course.id,name:item.course.name,status:'failed',error:item.error});continue;}
    try{
      const {courseRows,holeRows,featureRows}=rowsFor(item.course,item.data);
      const course_objects=await upsert('fl_osm_course_stage',courseRows,'osm_course_uri');
      const hole_objects=await upsert('fl_osm_hole_stage',holeRows,'osm_course_uri,osm_hole_uri');
      const feature_objects=await upsert('fl_osm_feature_stage',featureRows,'catalog_id,feature_uri');
      results.push({course_id:item.course.id,name:item.course.name,course_objects,hole_objects,feature_objects,status:'staged'});
    }catch(e){
      results.push({course_id:item.course.id,name:item.course.name,status:'failed',error:String(e?.code||e?.message||'stage_write_failed').slice(0,120)});
    }
  }
  return res.status(200).json({
    ok:true,armed:false,stage_only:true,promoted:0,batch_size:5,
    staged:results.filter(x=>x.status==='staged').length,
    failed:results.filter(x=>x.status==='failed').length,
    results
  });
};
