/* Preview-only regression test for the Level-2 recovery confidence gate. */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const {recoveryHandoff}=require('../lib/gps-rollout/gps-rollout-recovery-policy');
    const mkPairs=(count,{max=5,avg=2,weak=0,gt8=0,gt10=0}={})=>{
      const scores=Array(count).fill(avg);
      if(count)scores[0]=max;
      for(let i=0;i<Math.min(gt10,count);i++)scores[i]=Math.max(scores[i],11+i);
      for(let i=gt10;i<Math.min(gt8,count);i++)scores[i]=Math.max(scores[i],8.5);
      return scores.map((score,i)=>({tee_index:i,green_index:i,global_score:score,green_fairway_m:i<weak?null:10}));
    };
    const standardNumbering={numbering_verified:true,reason:'scorecard_numbering_verified',source:{tier:'reputable_public',confidence:0.9},summary:{pair_count:18,max_numbering_cost:1.2,average_numbering_cost:0.5,sequential:true,source_confidence:0.9}};
    const strongRouteNumbering={route_aware:true,numbering_verified:true,reason:'scorecard_route_numbering_verified',source:{tier:'reputable_public',confidence:0.9},summary:{pair_count:18,max_numbering_cost:2.553,average_numbering_cost:0.825,sequential:true,source_confidence:0.9,route_over_400:0,route_median_m:104.4,route_average_m:125.4,route_max_m:379}};
    const apple=recoveryHandoff({
      imagery_available:true,
      level2_candidate:{
        course:{holes:18},
        assignment:{pairs:mkPairs(18,{max:8.587,avg:1.7,weak:0,gt8:1,gt10:0}),unmatched_green_indices:[]},
        cleanup:{applied:true,reason:'adaptive_green_dedupe',unresolved_surplus_features:0},
        numbering_verified:true,numbering:standardNumbering
      }
    });
    const amelia=recoveryHandoff({
      imagery_available:true,
      level2_candidate:{
        course:{holes:18},
        assignment:{pairs:mkPairs(18,{max:24.45,avg:4.8,weak:2,gt8:3,gt10:3}),unmatched_green_indices:[]},
        cleanup:{applied:true,reason:'competing_course_and_surplus_green_filter',unresolved_surplus_features:0},
        numbering_verified:true,numbering:strongRouteNumbering
      }
    });
    const eastpointe=recoveryHandoff({
      imagery_available:true,
      level2_candidate:{
        course:{holes:18},
        assignment:{pairs:mkPairs(18,{max:9.12,avg:4.68,weak:1,gt8:4,gt10:0}),unmatched_green_indices:[]},
        cleanup:{applied:true,reason:'scorecard_selected_18_of_20_live_osm_greens',unresolved_surplus_features:0},
        numbering_verified:true,numbering:strongRouteNumbering
      }
    });
    const pass=apple.action==='authoritative'&&apple.tier===2&&
      amelia.action==='visual_recovery'&&amelia.tier===3&&
      eastpointe.action==='authoritative'&&eastpointe.tier===2;
    return res.status(pass?200:500).json({ok:pass,apple,amelia,eastpointe});
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e)});}
};