module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  const urls=[
    'https://zommagolf.com/courses/fl/eastpointe-country-club-east-course',
    'https://www.golfusainfo.com/clubs/eastpointe-country-club-east-course-palm-beach-gardens-fl/'
  ];
  const out=[];
  for(const url of urls){
    try{
      const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36','accept':'text/html,application/xhtml+xml'},redirect:'follow',signal:AbortSignal.timeout(10000)});
      const text=await r.text();
      out.push({url,status:r.status,final_url:r.url,content_type:r.headers.get('content-type'),bytes:Buffer.byteLength(text),has_scorecard:/scorecard/i.test(text),has_hole:/\bhole\b/i.test(text),snippet:text.replace(/\s+/g,' ').slice(0,180)});
    }catch(e){out.push({url,error:String(e?.message||e)});}
  }
  return res.status(200).json({ok:true,out});
};
