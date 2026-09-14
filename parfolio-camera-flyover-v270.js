/* ParFolio v284 — edge-filled forward-facing maximum-tilt hole camera.
   The v269 Google-only renderer remains the source of truth.
   No flyover animation. No camera travel. No persistent stale-hole listeners.
   On supported Google Vector maps, orient the current hole with tee toward 6 o'clock,
   green center toward 12 o'clock, fill the screen vertically, and apply the
   maximum practical static tilt on every mapped hole from every course source.
   If vector rendering is unavailable, keep the working Google map unchanged. */
(function(){
  const MAX_TILT=67.5;
  const TARGET_TEE_Y=.90;
  const TARGET_GREEN_Y=.10;
  const TARGET_X=.50;
  const MIN_ZOOM=15.5;
  const MAX_ZOOM=21;
  const MAX_FRAME_PASSES=5;
  const armed=new WeakMap();
  const applied=new WeakMap();
  const projections=new WeakMap();
  const frameTokens=new WeakMap();
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

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
      zoom:clamp(fitted,MIN_ZOOM,MAX_ZOOM),
      heading:bearingDegrees(tee,center),
      tilt:MAX_TILT,
      yards
    };
  }

  function projectionFor(raw){
    if(!raw||!window.google?.maps?.OverlayView)return null;
    let item=projections.get(raw);if(item)return item;
    const overlay=new google.maps.OverlayView();
    overlay.onAdd=function(){};overlay.draw=function(){};overlay.onRemove=function(){};
    overlay.setMap(raw);item={overlay};projections.set(raw,item);return item;
  }

  function screenPoint(projection,point){
    try{return projection?.fromLatLngToContainerPixel(new google.maps.LatLng(point.lat,point.lng))||null}catch{return null}
  }

  function correctEdgeFrame(green,raw,token,pass=0){
    if(pass>MAX_FRAME_PASSES||frameTokens.get(raw)!==token||inlineHoleMap?.raw!==raw)return;
    const tee=selectedTee(green),center=green?.center,host=document.getElementById('liveHoleMap');
    if(!tee||!center||!host)return;
    const projection=projectionFor(raw)?.overlay?.getProjection?.();
    if(!projection){setTimeout(()=>correctEdgeFrame(green,raw,token,pass+1),100);return;}
    const teePx=screenPoint(projection,tee),greenPx=screenPoint(projection,center);
    if(!teePx||!greenPx)return;
    const width=host.clientWidth||1,height=host.clientHeight||1;

    if(teePx.y<greenPx.y){
      try{raw.moveCamera({heading:(Number(raw.getHeading?.()||bearingDegrees(tee,center))+180)%360,tilt:MAX_TILT})}catch{}
      setTimeout(()=>correctEdgeFrame(green,raw,token,pass+1),110);return;
    }

    const actualSeparation=Math.max(1,teePx.y-greenPx.y);
    const desiredSeparation=Math.max(1,height*(TARGET_TEE_Y-TARGET_GREEN_Y));
    const currentZoom=Number(raw.getZoom?.()||17);
    const zoomDelta=Math.log2(desiredSeparation/actualSeparation);
    const nextZoom=clamp(currentZoom+zoomDelta,MIN_ZOOM,MAX_ZOOM);
    if(Math.abs(nextZoom-currentZoom)>.025){
      try{raw.moveCamera({zoom:nextZoom,heading:bearingDegrees(tee,center),tilt:MAX_TILT})}catch{}
      setTimeout(()=>correctEdgeFrame(green,raw,token,pass+1),110);return;
    }

    const midpointX=(teePx.x+greenPx.x)/2,midpointY=(teePx.y+greenPx.y)/2;
    const desiredMidpointY=height*(TARGET_TEE_Y+TARGET_GREEN_Y)/2;
    const panX=midpointX-width*TARGET_X,panY=midpointY-desiredMidpointY;
    if(Math.abs(panX)>2||Math.abs(panY)>2){
      try{raw.panBy(panX,panY)}catch{}
      setTimeout(()=>correctEdgeFrame(green,raw,token,pass+1),110);return;
    }

    host.dataset.cameraRule='all-courses-tee-90-green-10';
    host.dataset.clockCamera='edge-filled';
  }

  function scheduleEdgeFrame(green,raw,token){
    frameTokens.set(raw,token);
    setTimeout(()=>correctEdgeFrame(green,raw,token,0),80);
    setTimeout(()=>correctEdgeFrame(green,raw,token,0),260);
    setTimeout(()=>correctEdgeFrame(green,raw,token,0),700);
  }

  function applyCurrentCamera(force=false){
    if(inlineHoleMap?.provider!=='google'||!inlineHoleMap.raw)return false;
    const raw=inlineHoleMap.raw,green=currentGreen();if(!green||!selectedTee(green)||!green.center)return false;
    const camera=cameraFor(green,raw);if(!camera)return false;
    if(!vectorReady(raw))return false;
    const tee=selectedTee(green),center=green.center;
    const sig=[Number(s?.hole||1),Number(tee.lat).toFixed(7),Number(tee.lng).toFixed(7),Number(center.lat).toFixed(7),Number(center.lng).toFixed(7),camera.heading.toFixed(2),camera.tilt.toFixed(1)].join(':');
    if(!force&&applied.get(raw)===sig)return true;
    try{
      raw.moveCamera({center:camera.center,zoom:camera.zoom,heading:camera.heading,tilt:camera.tilt});
      const host=document.getElementById('liveHoleMap');
      if(host){host.dataset.forwardBearing=String(camera.heading);host.dataset.cameraRule='all-courses-tee-90-green-10';host.dataset.cameraTilt=String(camera.tilt)}
      applied.set(raw,sig);scheduleEdgeFrame(green,raw,sig);record('EDGE_FILLED_CAMERA_APPLIED',`hole ${s?.hole||1} · tee 90% · green 10%`);return true;
    }catch(error){record('STATIC_MAX_TILT_FAIL_STAY_GOOGLE',error?.message||error);return false}
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
        applyCurrentCamera(true);record('VECTOR_READY_STATIC_TILT');return;
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
    }catch(error){record('HOLE_STATIC_TILT_FAIL_STAY_GOOGLE',error?.message||error)}
    return result;
  };

  const priorOrient=window.orientInlineHoleMap;
  if(typeof priorOrient==='function')window.orientInlineHoleMap=function(green,origin=null,target=null){
    if(inlineHoleMap?.provider==='google'){applyCurrentCamera(false);return}
    return priorOrient.apply(this,arguments);
  };

  record('EDGE_FILLED_CAMERA_V284_READY',`${MAX_TILT} degrees · all courses · every mapped hole`);
})();
