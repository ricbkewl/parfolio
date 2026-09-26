/*
 * Tier-3 recovery database adapter.
 * Loads existing authoritative context and reuses the normal transactional
 * promotion adapter. Protected GPS-ready courses are never overwritten.
 */
const PROTECTED=new Set(['gps_ready','verified_gps','published']);
function createRecoveryAdapter(db,{promotionAdapter}={}){
  if(!db)throw new Error('Supabase client required');
  if(!promotionAdapter||typeof promotionAdapter.promoteValidated!=='function')throw new Error('promotion adapter required');
  return {
    async loadRecoveryContext(job){
      const {data:course,error:ce}=await db.from('course_catalog')
        .select('id,name,holes,mapping_class,latitude,longitude,state_code,country_code')
        .eq('id',job.course_id).single();
      if(ce)throw ce;
      if(PROTECTED.has(course.mapping_class))throw new Error('protected GPS-ready course cannot enter visual recovery');
      const {data:rows,error:ge}=await db.from('course_hole_geometry')
        .select('*').eq('course_id',job.course_id).order('hole_number');
      if(ge)throw ge;
      return {course,authoritativeRows:rows||[]};
    },
    async promoteRecovered({job,course,rows}){
      if(PROTECTED.has(course.mapping_class))return {status:'preserved',course_id:course.id};
      return promotionAdapter.promoteValidated({
        candidate:course,batch_id:job.batch_id||null,
        decision:{rows}
      });
    }
  };
}
module.exports={PROTECTED,createRecoveryAdapter};
