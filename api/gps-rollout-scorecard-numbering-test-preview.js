/* Preview-only regression test for scorecard-first Level-2 hole numbering. */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const {numberByScorecard}=require('../lib/gps-rollout/gps-rollout-scorecard-numbering');
    const {level2RecoveryDecision}=require('../lib/gps-rollout/gps-rollout-level2-recovery');
    const yards=[541,366,415,176,410,545,381,202,439,436,402,495,442,185,532,192,364,443];
    const pars=[5,4,4,3,4,5,4,3,4,4,4,5,4,3,5,3,4,4];
    const order=[9,2,14,1,18,7,12,4,16,6,11,3,17,5,15,8,10,13];
    const pairs=order.map((hole,i)=>({
      tee_index:i,green_index:i,
      hole_m:(yards[hole-1]+((i%3)-1)*4)*0.9144,
      global_score:i===0?8.4:1.6,
      green_fairway_m:12
    }));
    const assignment={pairs,unmatched_green_indices:[]};
    const scorecard={
      source:{tier:'reputable_public',provider:'published_scorecard',url:'https://zommagolf.com/courses/fl/eastpointe-country-club-east-course'},
      holes:yards.map((y,i)=>({hole_number:i+1,par:pars[i],yardages:[y]}))
    };
    const numbering=numberByScorecard({course:{holes:18},assignment,scorecard});
    const decision=level2RecoveryDecision({course:{holes:18},assignment,cleanup:{unresolved_surplus_features:0},numbering});
    const bad=numberByScorecard({course:{holes:18},assignment,scorecard:{...scorecard,holes:scorecard.holes.slice(0,17)}});
    const pass=numbering.ok&&numbering.numbering_verified&&decision.ok&&decision.action==='promote_level2'&&!bad.ok&&numbering.numbered_pairs.every((p,i)=>p.hole_number===i+1);
    return res.status(pass?200:500).json({ok:pass,numbering_summary:numbering.summary,numbering_source:numbering.source,decision,bad_scorecard_rejected:!bad.ok,bad_reason:bad.reason});
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e)});}
};
