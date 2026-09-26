/*
 * Protected Vercel server-side entrypoint for ParFolio GPS rollout.
 * Never exposes service credentials to the browser.
 */
const crypto=require('crypto');

function safeEqual(a,b){
  const A=Buffer.from(String(a||'')),B=Buffer.from(String(b||''));
  return A.length===B.length&&crypto.timingSafeEqual(A,B);
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});

  const expected=String(process.env.PARFOLIO_ROLLOUT_SECRET||'');
  const supplied=String(req.headers['x-parfolio-rollout-secret']||'');
  if(!expected||!safeEqual(expected,supplied))return res.status(401).json({error:'unauthorized'});

  const country=String(req.body?.country_code||'US').toUpperCase();
  const state=String(req.body?.state_code||'').toUpperCase();
  const mode=String(req.body?.mode||'rollout');
  const batchSize=Math.min(50,Math.max(1,Number(req.body?.batch_size||5)));
  if(country==='US'&&!/^[A-Z]{2}$/.test(state))return res.status(400).json({error:'valid state_code required'});
  if(!['rollout','recovery','dry_run'].includes(mode))return res.status(400).json({error:'invalid mode'});

  /*
   * First deployment intentionally stops here until the branch has the
   * server-side Supabase client dependency/env wiring verified. This keeps
   * the protected route deployable without accidentally starting writes.
   */
  return res.status(200).json({
    ok:true,armed:false,mode,country_code:country,state_code:state,batch_size:batchSize,
    message:'Protected rollout runner authenticated; execution remains disarmed pending service-client verification.'
  });
};
