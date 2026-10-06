/* Preview-only regression test for automated scorecard lookup + production row shape. */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const {lookupScorecardWeb}=require('../lib/gps-rollout/gps-rollout-scorecard-web-discovery');
    const {numberByScorecard}=require('../lib/gps-rollout/gps-rollout-scorecard-numbering');
    const {numberedRows}=require('../lib/gps-rollout/gps-rollout-source-adapter');
    const {validateTeeCenterCourse}=require('../lib/gps-rollout/gps-rollout-engine');
    const which=String(req.query?.course||'apple').toLowerCase();
    const course=which==='eastpointe'
      ? {name:'Eastpointe Country Club East Course',city:'Palm Beach Gardens',state_code:'FL',holes:18,par:72,website:'https://www.eastpointe-cc.com/'}
      : {name:'Apple Valley Golf Course',city:'Apple Valley',state_code:'CA',holes:18,par:71,website:'https://applevalleygolf.com/course-details/'};
    const found=await lookupScorecardWeb(course);
    if(!found.ok)return res.status(200).json({ok:false,course:course.name,stage:'lookup',found});
    const pairs=found.holes.map((h,i)=>({
      tee_index:i,green_index:i,
      tee:{lat:34.5000+i*0.001,lng:-117.2000-i*0.001},
      green:{lat:34.5020+i*0.001,lng:-117.2015-i*0.001},
      hole_m:Math.max(...h.yardages)*0.9144,
      global_score:1.5,green_fairway_m:10
    })).sort((a,b)=>(b.tee_index*7%19)-(a.tee_index*7%19));
    const numbered=numberByScorecard({course,assignment:{pairs},scorecard:found});
    const rows=numberedRows(numbered)||[];
    const finalGeometryValidation=validateTeeCenterCourse(rows,course.holes);
    const ok=Boolean(numbered.ok&&finalGeometryValidation.ok&&rows.length===18);
    return res.status(ok?200:500).json({
      ok,course:course.name,lookup_path:found.lookup_path,source:found.source,
      hole_count:found.holes.length,numbering_verified:numbered.numbering_verified,
      numbering_summary:numbered.summary,numbered_row_count:rows.length,
      final_geometry_validation:finalGeometryValidation,
      first_row:rows[0]||null
    });
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e)});}
};
