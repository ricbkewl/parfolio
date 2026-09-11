/* ParFolio v271 — stable forward-facing hole orientation.
   The v269 Google-only renderer remains the source of truth.
   No flyover animation. No camera tilt. No persistent stale-hole listeners.
   When Google vector rotation is available, orient the current hole so the tee is
   toward 6 o'clock and green center toward 12 o'clock. Otherwise keep the working
   Google map unchanged. */
(function(){
  const armed=new WeakMap();
  const applied=new WeakMap();

  function record(stage,detail=''){
    try{
      const item={time:new Date().toISOString(),stage,detail:String(detail||'')};
      const list=Array.isArray(window.PARFOLIO_MAP_DIAGNOSTICS)?window.PARFOLIO_MAP_DIAGNOSTICS.slice(-39):[];
      list.push(item);window.PARFOLIO_MAP_DIAGNOSTICS=list;
      localStorage.parfolioMapDiagnostics=JSON.stringify(list.slice(-30));
    }catch{}
    console.info('[ParFolio Camera]',stage,detail||'');
  }

  function vectorReady(raw){
    try{return !!google?.maps?.RenderingType?.VECTOR&&raw?.getRenderingType?.()===google.maps.RenderingType.VECTOR}catch{return false}
  }

  function requestVector(raw){
    try{
      if(raw&&google?.maps?.RenderingType?.VECTOR&&typeof raw.setRenderingType==='function'){
        raw.setRenderingType(google.maps.RenderingType.VECTOR);return true;
      }
    }catch(error){record('VECTOR_REQUEST_FAIL_STAY_GOOGLE',error?.message||error)}
    return false;
  }

  function currentGreen(){
    try{return selectedRoundCourse()?.greens?.[Number(s?.hole||1)-1]||null}catch{return null}
  }

  function cameraFor(green,raw){
    const tee=selectedTee(green),center=green?.center;if(!tee||!center)return null;
    const yards=mappedHoleDistance(green)||Math.round(distanceYards(tee,center));
    const fitted=Number(raw?.getZoom?.()||17);
    return{
      center:pointBetween(tee,center,.5),
      zoom:Math.min(19,Math.max(15.5,fitted)),
      heading:bearingDegrees(tee,center),
      tilt:0,
      yards
    };
  }

  function applyCurrentCamera(force=false){
    if(inlineHoleMap?.provider!=='google'||!inlineHoleMap.raw)return false;
    const raw=inlineHoleMap.raw,green=currentGreen();if(!green||!selectedTee(green)||!green.center)return false;
    const camera=cameraFor(green,raw);if(!camera)return false;
    if(!vectorReady(raw))return false;
    const sig=[Number(s?.hole||1),camera.center.lat.toFixed(7),camera.center.lng.toFixed(7),camera.zoom.toFixed(2),camera.heading.toFixed(2)].join(':');
    if(!force&&applied.get(raw)===sig)return true;
    try{
      raw.moveCamera({center:camera.center,zoom:camera.zoom,heading:camera.heading,tilt:0});
      const host=document.getElementById('liveHoleMap');
      if(host){host.dataset.forwardBearing=String(camera.heading);host.dataset.cameraRule='tee-6-green-12-flat'}
      applied.set(raw,sig);record('FORWARD_CAMERA_APPLIED',`hole ${s?.hole||1}`);return true;
    }catch(error){record('FORWARD_CAMERA_FAIL_STAY_GOOGLE',error?.message||error);return false}
  }
  window.applyParFolioHoleCamera=()=>applyCurrentCamera(true);

  function armVectorOnce(raw){
    if(!raw||armed.has(raw))return;
    const state={done:false,attempts:0,listener:null};armed.set(raw,state);requestVector(raw);
    const retry=()=>{
      if(state.done||inlineHoleMap?.raw!==raw)return;
      state.attempts++;
      if(vectorReady(raw)){
        state.done=true;
        try{state.listener?.remove?.()}catch{}
        applyCurrentCamera(true);record('VECTOR_READY_STATIC');return;
      }
      if(state.attempts<20)setTimeout(retry,125);else{state.done=true;try{state.listener?.remove?.()}catch{}record('VECTOR_UNAVAILABLE_STAY_GOOGLE')}
    };
    try{state.listener=raw.addListener?.('renderingtype_changed',retry)}catch{}
    setTimeout(retry,0);
  }

  const priorInit=window.initInlineHoleMap;
  if(typeof priorInit==='function')window.initInlineHoleMap=async function(green){
    await priorInit(green);
    if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw){
      armVectorOnce(inlineHoleMap.raw);
      setTimeout(()=>applyCurrentCamera(true),100);
    }
  };

  const priorUpdate=window.updateGoogleRoundHole;
  if(typeof priorUpdate==='function')window.updateGoogleRoundHole=function(){
    const result=priorUpdate.apply(this,arguments);
    try{
      if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw){
        armVectorOnce(inlineHoleMap.raw);
        setTimeout(()=>applyCurrentCamera(true),90);
      }
    }catch(error){record('HOLE_ORIENTATION_FAIL_STAY_GOOGLE',error?.message||error)}
    return result;
  };

  const priorOrient=window.orientInlineHoleMap;
  if(typeof priorOrient==='function')window.orientInlineHoleMap=function(green,origin=null,target=null){
    if(inlineHoleMap?.provider==='google'){applyCurrentCamera(false);return}
    return priorOrient.apply(this,arguments);
  };

  /* Restore simple, immediate hole navigation from the stable v269/base app.
     No animation state is introduced here. */
  record('STATIC_FORWARD_CAMERA_V271_READY','no flyover no tilt');
})();