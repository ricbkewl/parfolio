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
      return scores.map((score,i)=>({
        tee_index:i,green_index:i,global_score:score,
        green_fairway_m:i<weak?null:10
      }));
    };
    const apple=recoveryHandoff({
      imagery_available:true,
      level2_candidate:{
        course:{holes:18},
        assignment:{pairs:mkPairs(18,{max:8.587,avg:1.7,weak:0,gt8:1,gt10:0}),unmatched_green_indices:[]},
        cleanup:{applied:true,reason:'adaptive_green_dedupe',unresolved_surplus_features:0}
      }
    });
    const amelia=recoveryHandoff({
      imagery_available:true,
      level2_candidate:{
        course:{holes:18},
        assignment:{pairs:mkPairs(18,{max:24.45,avg:4.8,weak:2,gt8:3,gt10:3}),unmatched_green_indices:[]},
        cleanup:{applied:true,reason:'competing_course_and_surplus_green_filter',unresolved_surplus_features:0}
      }
    });
    const pass=apple.action==='authoritative'&&apple.tier===2&&amelia.action==='visual_recovery'&&amelia.tier===3;
    return res.status(pass?200:500).json({ok:pass,apple,amelia});
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e)});}
};
