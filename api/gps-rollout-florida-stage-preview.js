/*
 * Preview-only controlled Florida OSM staging run.
 * Hard locked to 5 courses, staging writes only, zero promotions.
 * Uses five small bounded Overpass requests in parallel for resilience.
 */
const {floridaSample,floridaAfterCourse,select}=require('../lib/gps-rollout/read-only-supabase');
const {upsert,rpc}=require('../lib/gps-rollout/supabase-stage-writer');
const {classifyAuthoritativeStage}=require('../lib/gps-rollout/authoritative-stage-classifier');

const {fetchOne,rowsFor}=require('../lib/gps-rollout/authoritative-osm-input');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  if(req.body?.stage_only!==true||req.body?.batch_size!==5)return res.status(400).json({error:'hard_locked_stage_only_batch_5'});
  let courses;
  const regions=await select('gps_rollout_regions',{select:'cursor_course_id',rollout_key:'eq.US:FL',limit:'1'});
  const cursorId=regions?.[0]?.cursor_course_id||null;
  courses=cursorId?await floridaAfterCourse(cursorId,5):await floridaSample(5);
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
      const classification=classifyAuthoritativeStage({course:item.course,courseRows,holeRows});
      results.push({course_id:item.course.id,name:item.course.name,course_objects,hole_objects,feature_objects,status:'staged',classification});
    }catch(e){
      results.push({course_id:item.course.id,name:item.course.name,status:'failed',error:String(e?.code||e?.message||'stage_write_failed').slice(0,120)});
    }
  }
  const cursorEnd=courses?.[courses.length-1]?.id||cursorId||null;
  let finalization=null;
  if(cursorId&&cursorEnd){
    try{
      finalization=await rpc('gps_rollout_finalize_stage_batch',{
        p_rollout_key:'US:FL',
        p_cursor_start:cursorId,
        p_cursor_end:cursorEnd,
        p_results:results
      });
    }catch(e){
      return res.status(503).json({ok:false,armed:false,stage_only:true,promoted:0,error:String(e?.code||'stage_finalize_failed')});
    }
  }
  return res.status(200).json({
    ok:true,armed:false,stage_only:true,promoted:0,batch_size:5,cursor_start:cursorId,cursor_end:cursorEnd,
    staged:results.filter(x=>x.status==='staged').length,
    failed:results.filter(x=>x.status==='failed').length,
    finalized:Boolean(finalization),
    results
  });
};
