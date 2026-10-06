/* Preview-only regression test for automated scorecard lookup. */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const {lookupScorecardWeb}=require('../lib/gps-rollout/gps-rollout-scorecard-web-discovery');
    const {numberByScorecard}=require('../lib/gps-rollout/gps-rollout-scorecard-numbering');
    const course={
      name:'Eastpointe Country Club East Course',city:'Palm Beach Gardens',
      state_code:'FL',holes:18,website:'https://www.eastpointe-cc.com/'
    };
    const found=await lookupScorecardWeb(course);
    if(!found.ok)return res.status(500).json({ok:false,stage:'lookup',found});
    const pairs=found.holes.map((h,i)=>({
      tee_index:i,green_index:i,hole_m:Math.max(...h.yardages)*0.9144,
      global_score:1.5,green_fairway_m:10
    })).sort((a,b)=>(b.tee_index*7%19)-(a.tee_index*7%19));
    const numbered=numberByScorecard({course,assignment:{pairs},scorecard:found});
    return res.status(numbered.ok?200:500).json({
      ok:numbered.ok,lookup_path:found.lookup_path,source:found.source,
      discovered_candidates:found.discovered_candidates??null,
      hole_count:found.holes.length,numbering_verified:numbered.numbering_verified,
      numbering_summary:numbered.summary,
      first_three:numbered.numbered_pairs?.slice(0,3).map(x=>({hole_number:x.hole_number,published_par:x.published_par,published_yardages:x.published_yardages}))||[]
    });
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e)});}
};
