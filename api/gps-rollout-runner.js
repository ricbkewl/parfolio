/*
 * Protected Vercel server-side entrypoint for ParFolio GPS rollout.
 * Never exposes service credentials to the browser.
 */
const crypto=require('crypto');
const {floridaSample}=require('../lib/gps-rollout/read-only-supabase');
function safeEqual(a,b){const A=Buffer.from(String(a||'')),B=Buffer.from(String(b||''));return A.length===B.length&&crypto.timingSafeEqual(A,B);}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  const expected=String(process.env.PARFOLIO_ROLLOUT_SECRET||'');
  const supplied=String(req.headers['x-parfolio-rollout-secret']||'');
  if(!expected||!safeEqual(expected,supplied))return res.status(401).json({error:'unauthorized'});

  const mode=String(req.body?.mode||'rollout');
  if(mode==='config_probe')return res.status(200).json({
    ok:true,armed:false,
    maptiler_configured:Boolean(String(process.env.MAPTILER_API_KEY||'').trim()),
    supabase_url_configured:Boolean(String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').trim()),
    service_role_configured:Boolean(String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim()),
    ai_gateway_configured:Boolean(String(process.env.AI_GATEWAY_API_KEY||'').trim()),
    vision_model_configured:Boolean(String(process.env.PARFOLIO_VISION_MODEL||'').trim())
  });

  const country=String(req.body?.country_code||'US').toUpperCase();
  const state=String(req.body?.state_code||'').toUpperCase();
  const batchSize=Math.min(50,Math.max(1,Number(req.body?.batch_size||5)));
  if(country==='US'&&!/^[A-Z]{2}$/.test(state))return res.status(400).json({error:'valid state_code required'});
  if(!['rollout','recovery','dry_run'].includes(mode))return res.status(400).json({error:'invalid mode'});
  if(mode==='dry_run'){
    if(country!=='US'||state!=='FL')return res.status(400).json({error:'initial dry run is restricted to US/FL'});
    try{const candidates=await floridaSample(batchSize);return res.status(200).json({ok:true,armed:false,read_only:true,mode,country_code:country,state_code:state,count:candidates.length,candidates});}
    catch(err){return res.status(503).json({ok:false,armed:false,read_only:true,error:String(err?.message||err)});}
  }
  return res.status(200).json({
    ok:true,armed:false,mode,country_code:country,state_code:state,batch_size:batchSize,
    message:'Protected rollout runner authenticated; execution remains disarmed pending service-client verification.'
  });
};
