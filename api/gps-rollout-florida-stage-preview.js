/*
 * Preview-only controlled Florida OSM staging run.
 * Hard locked to 5 courses, staging writes only, zero promotions.
 */
const {floridaSample}=require('../lib/gps-rollout/read-only-supabase');
const {upsert}=require('../lib/gps-rollout/supabase-stage-writer');

const EPS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function overpass(lat,lng){
  const q='[out:json][timeout:45];(nwr["leisure"="golf_course"](around:1800,'+lat+','+lng+');nwr["golf"="course"](around:1800,'+lat+','+lng+');way["golf"="hole"](around:1800,'+lat+','+lng+');relation["golf"="hole"](around:1800,'+lat+','+lng+');nwr["golf"="tee"](around:1800,'+lat+','+lng+');nwr["golf"="green"](around:1800,'+lat+','+lng+'););out center geom meta;';
  let last='';
  for(let i=0;i<4;i++){
    try{
      const r=await fetch(EPS[i%2],{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'ParFolio-GPS-preview-stage/1.0'},body:'data='+encodeURIComponent(q),redirect:'error',signal:AbortSignal.timeout(20000)});
      if(r.ok)return r.json();
      last=String(r.status);
      if(![429,502,503,504].includes(r.status))throw new Error('Overpass '+r.status);
    }catch(e){last=String(e?.message||e);}
    await wait(Math.min(8000,1000*(2**i)));
  }
  throw new Error('Overpass failed: '+last);
}
function center(e){
  if(Number.isFinite(Number(e?.lat))&&Number.isFinite(Number(e?.lon)))return{lat:Number(e.lat),lng:Number(e.lon)};
  if(Number.isFinite(Number(e?.center?.lat))&&Number.isFinite(Number(e?.center?.lon)))return{lat:Number(e.center.lat),lng:Number(e.center.lon)};
  const g=Array.isArray(e?.geometry)?e.geometry:[];
  const pts=g.filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon)));
  if(!pts.length)return{lat:null,lng:null};
  return{lat:pts.reduce((s,p)=>s+Number(p.lat),0)/pts.length,lng:pts.reduce((s,p)=>s+Number(p.lon),0)/pts.length};
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  if(req.body?.stage_only!==true||req.body?.batch_size!==5)return res.status(400).json({error:'hard_locked_stage_only_batch_5'});
  const courses=await floridaSample(5);
  const out=[];
  for(const course of courses){
    const candidateUri='candidate:'+course.id;
    try{
      const d=await overpass(Number(course.latitude),Number(course.longitude));
      const cr=[],hr=[],fr=[];
      for(const e of d.elements||[]){
        const tags=e.tags||{},uri='https://www.openstreetmap.org/'+e.type+'/'+e.id,g=Array.isArray(e.geometry)?e.geometry:[];
        if(tags.leisure==='golf_course'||tags.golf==='course'){
          const pt=center(e);
          cr.push({osm_course_uri:uri,osm_id:e.id,osm_type:e.type,osm_version:e.version||null,osm_timestamp:e.timestamp||null,name:tags.name||null,normalized_name:String(tags.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),geometry_wkt:null,centroid_wkt:pt.lat!==null?'POINT('+pt.lng+' '+pt.lat+')':null,lat:pt.lat,lng:pt.lng,raw:e});
        }else if(tags.golf==='hole'){
          const n=parseInt(tags.ref||tags['golf:hole']||'',10);
          hr.push({osm_course_uri:candidateUri,osm_hole_uri:'osm:'+e.type+':'+e.id,osm_id:e.id,osm_type:e.type,osm_version:e.version||null,osm_timestamp:e.timestamp||null,hole_ref:tags.ref||null,hole_number:Number.isFinite(n)?n:null,hole_par:parseInt(tags.par||'',10)||null,geometry_wkt:g.length>1?'LINESTRING('+g.map(p=>p.lon+' '+p.lat).join(',')+')':null,object_type:e.type,valid_number:Number.isFinite(n)&&n>=1&&n<=18,raw:e});
        }else if(tags.golf==='tee'||tags.golf==='green'){
          const pt=center(e);
          if(pt.lat!==null&&pt.lng!==null)fr.push({catalog_id:course.id,candidate_uri:candidateUri,feature_uri:uri,feature_type:tags.golf,osm_id:e.id,osm_type:e.type,osm_version:e.version||null,osm_timestamp:e.timestamp||null,lat:pt.lat,lng:pt.lng,raw:e});
        }
      }
      const courseRows=await upsert('fl_osm_course_stage',cr,'osm_course_uri');
      const holeRows=await upsert('fl_osm_hole_stage',hr,'osm_course_uri,osm_hole_uri');
      const featureRows=await upsert('fl_osm_feature_stage',fr,'catalog_id,feature_uri');
      out.push({course_id:course.id,name:course.name,course_objects:courseRows,hole_objects:holeRows,feature_objects:featureRows,status:'staged'});
    }catch(e){
      out.push({course_id:course.id,name:course.name,status:'failed',error:String(e?.code||e?.message||'stage_failed').slice(0,120)});
    }
  }
  return res.status(200).json({ok:true,armed:false,stage_only:true,promoted:0,batch_size:5,results:out});
};
