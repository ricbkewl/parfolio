/*
 * Database actions for the conservative GPS rollout processor.
 * Server-only: requires service-role Supabase client.
 */
function createPromotionAdapter(db){
  if(!db)throw new Error('Supabase client required');
  return {
    async markReview({region,candidate,batch_id,reason,detail}){
      const key=[region.country_code,region.state_code].filter(Boolean).join(':');
      const {error}=await db.from('gps_rollout_exceptions').insert({
        rollout_key:key,batch_id,course_id:candidate.id,
        exception_type:reason,detail:detail?JSON.stringify(detail):null,retryable:true
      });
      if(error)throw error;
      return{status:'review',reason};
    },
    async promoteValidated({candidate,batch_id,decision}){
      const geometry=decision.rows.map(r=>({
        hole_number:r.hole_number,par:r.hole_par??r.par??null,
        tee_lat:r.tee_lat,tee_lng:r.tee_lng,
        aim1_lat:r.aim1_lat??null,aim1_lng:r.aim1_lng??null,
        aim2_lat:r.aim2_lat??null,aim2_lng:r.aim2_lng??null,
        green_front_lat:r.green_front_lat??null,green_front_lng:r.green_front_lng??null,
        green_center_lat:r.green_center_lat??r.green_lat,
        green_center_lng:r.green_center_lng??r.green_lng,
        green_back_lat:r.green_back_lat??null,green_back_lng:r.green_back_lng??null,
        route_geojson:r.route_geojson??null,osm_hole_uri:r.osm_hole_uri??null,
        source:r.source??'gps_rollout_engine'
      }));
      const {data,error}=await db.rpc('gps_rollout_promote_validated_course',{
        p_course_id:candidate.id,p_batch_id:batch_id,p_geometry:geometry
      });
      if(error)throw error;
      return data;
    }
  };
}
module.exports={createPromotionAdapter};
