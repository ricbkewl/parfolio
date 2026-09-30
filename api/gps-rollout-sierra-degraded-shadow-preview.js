/*
 * Preview-only trigger for Sierra Lakes Level 2 degraded shadow test.
 * The background worker deliberately excludes OSM golf=hole traces.
 */
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(String(process.env.VERCEL_ENV||'')!=='preview')return res.status(404).json({error:'not_found'});
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  if(req.query?.optimize==='1'){
    try{
      const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
      const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
      if(!url||!key)return res.status(503).json({ok:false,error:'supabase_server_config_missing'});
      const headers={apikey:key,'Content-Type':'application/json',Accept:'application/json'};
      if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
      const rr=await fetch(url+'/rest/v1/rpc/get_latest_sierra_level2_shadow_result',{
        method:'POST',headers,body:'{}',redirect:'error',signal:AbortSignal.timeout(7000)
      });
      if(!rr.ok)return res.status(rr.status).json({ok:false,error:'shadow_result_read_failed'});
      const latest=await rr.json();
      const pairs=latest?.report?.inference?.pairs||[];
      if(pairs.length!==18)return res.status(409).json({ok:false,error:'need_exactly_18_inferred_pairs',pair_count:pairs.length});

      const rad=v=>Number(v)*Math.PI/180;
      const dist=(a,b)=>{
        const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),la1=rad(a.lat),la2=rad(b.lat);
        const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
        return 6371008.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
      };
      let beam=[];
      for(let i=0;i<18;i++)beam.push({seq:[i],mask:(1<<i),cost:0});
      const beamWidth=2500;
      for(let depth=1;depth<18;depth++){
        const next=[];
        for(const st of beam){
          const last=st.seq[st.seq.length-1];
          const g=pairs[last].green;
          for(let j=0;j<18;j++){
            if(st.mask&(1<<j))continue;
            const walk=dist(g,pairs[j].tee);
            const penalty=walk>250?(walk-250)*2.2:0;
            next.push({seq:st.seq.concat(j),mask:st.mask|(1<<j),cost:st.cost+walk+penalty});
          }
        }
        next.sort((a,b)=>a.cost-b.cost);
        beam=next.slice(0,beamWidth);
      }
      const best=beam[0];
      const sequence=best.seq.map((pairIndex,idx)=>{
        const p=pairs[pairIndex];
        const nextPair=idx<17?pairs[best.seq[idx+1]]:null;
        return{
          inferred_hole_number:idx+1,
          pair_index:pairIndex,
          tee_index:p.tee_index,
          green_index:p.green_index,
          hole_m:p.hole_m,
          transition_to_next_m:nextPair?Number(dist(p.green,nextPair.tee).toFixed(1)):null,
          tee:p.tee,
          green:p.green
        };
      });
      return res.status(200).json({
        ok:true,armed:false,shadow_test:true,degraded_level:2,
        optimizer:'global_beam_18',
        complete:sequence.length===18,
        total_cost:Number(best.cost.toFixed(1)),
        sequence
      });
    }catch(e){
      return res.status(503).json({ok:false,armed:false,shadow_test:true,degraded_level:2,error:String(e?.code||e?.name||'optimizer_failed')});
    }
  }

  try{
    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
    const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    if(!url||!key)return res.status(503).json({ok:false,error:'supabase_server_config_missing'});
    const headers={apikey:key,'Content-Type':'application/json',Accept:'application/json'};
    if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
    let response=null,lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      try{
        response=await fetch(url+'/functions/v1/sierra-degraded-shadow-test',{
          method:'POST',headers,body:'{}',redirect:'error',signal:AbortSignal.timeout(9000)
        });
        break;
      }catch(e){
        lastError=e;
        if(attempt===0)await new Promise(r=>setTimeout(r,350));
      }
    }
    if(!response)throw lastError||new Error('shadow_trigger_unreachable');
    const text=await response.text();
    let body;try{body=JSON.parse(text)}catch{body={raw:text.slice(0,300)}}
    return res.status(response.status).json({
      ...body,
      armed:false,
      shadow_test:true,
      degraded_level:2,
      golf_hole_traces_hidden:true,
      production_geometry_modified:false,
      background:true
    });
  }catch(e){
    return res.status(503).json({ok:false,armed:false,shadow_test:true,degraded_level:2,golf_hole_traces_hidden:true,production_geometry_modified:false,background:true,error:String(e?.code||e?.name||'degraded_shadow_trigger_failed')});
  }
};
