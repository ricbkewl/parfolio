/* ParFolio v270 — optional 3D hole camera + flyover enhancement.
   The stable Google-only v269 renderer remains the base map. This layer may request
   VECTOR rendering, heading, tilt, and animation, but failures never replace or hide
   the working Google map. Final camera rule: tee toward 6 o'clock, green center toward
   12 o'clock, with the complete mapped hole held at the maximum practical view. */
(function(){
  const FINAL_TILT=67.5;
  const FLYOVER_MS=2600;
  const applied=new WeakMap();
  const vectorArmed=new WeakSet();
  let flyoverFrame=0,flyoverActive=false;

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10)};
  const pointLerp=(a,b,t)=>({lat:lerp(a.lat,b.lat,t),lng:lerp(a.lng,b.lng,t)});
  const headingLerp=(a,b,t)=>{const d=((b-a+540)%360)-180;return(a+d*t+360)%360};
  const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

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
    if(!raw)return false;
    try{
      if(google?.maps?.RenderingType?.VECTOR&&typeof raw.setRenderingType==='function'){
        raw.setRenderingType(google.maps.RenderingType.VECTOR);
        return true;
      }
    }catch(error){record('VECTOR_REQUEST_FAIL',error?.message||error)}
    return false;
  }

  function pointAlong(route,fraction=.50){
    if(!route?.length)return null;if(route.length===1)return route[0];
    const lengths=[];let total=0;
    for(let i=1;i<route.length;i++){const d=distanceYards(route[i-1],route[i]);lengths.push(d);total+=d}
    if(!total)return route[0];let remaining=total*clamp(fraction,0,1);
    for(let i=0;i<lengths.length;i++){
      if(remaining<=lengths[i])return pointBetween(route[i],route[i+1],lengths[i]?remaining/lengths[i]:0);
      remaining-=lengths[i];
    }
    return route.at(-1);
  }

  function desiredZoom(yards){
    const safe=Math.max(120,Number(yards)||350);
    return clamp(19.25-Math.log2(safe/150)*.76,17.25,19.20);
  }

  function cameraFor(green,raw){
    const tee=selectedTee(green),center=green?.center;if(!tee||!center)return null;
    const route=typeof holeRoute==='function'?holeRoute(green):[tee,center];
    const yards=mappedHoleDistance(green)||Math.round(distanceYards(tee,center));
    const fitted=Number(raw?.getZoom?.()||0);
    const zoom=fitted>0?Math.min(desiredZoom(yards),fitted+.32):desiredZoom(yards);
    return{
      center:pointAlong(route,.50)||pointBetween(tee,center,.50),
      zoom,
      heading:bearingDegrees(tee,center),
      tilt:FINAL_TILT,
      yards
    };
  }
  window.parfolioHoleCameraV270=cameraFor;

  function signature(camera){return [Number(s?.hole)||1,camera.center.lat.toFixed(7),camera.center.lng.toFixed(7),camera.zoom.toFixed(3),camera.heading.toFixed(3),camera.tilt].join(':')}

  function applyCamera(green,force=false){
    if(inlineHoleMap?.provider!=='google'||!inlineHoleMap.raw||!selectedTee(green)||!green?.center)return false;
    const raw=inlineHoleMap.raw,camera=cameraFor(green,raw);if(!camera)return false;
    if(!vectorReady(raw)){
      requestVector(raw);
      try{raw.moveCamera?.({center:camera.center,zoom:camera.zoom})}catch{}
      armVector(raw,green);
      return false;
    }
    const sig=signature(camera);if(!force&&applied.get(raw)===sig)return true;
    try{
      raw.moveCamera({center:camera.center,zoom:camera.zoom,heading:camera.heading,tilt:camera.tilt});
      const host=document.getElementById('liveHoleMap');if(host){host.dataset.forwardBearing=String(camera.heading);host.dataset.cameraRule='tee-6-green-12'}
      applied.set(raw,sig);record('CAMERA_APPLIED','tee-6 green-12 max-view');return true;
    }catch(error){record('CAMERA_FAIL_STAY_GOOGLE',error?.message||error);return false}
  }
  window.applyParFolioHoleCamera=applyCamera;

  function armVector(raw,green){
    if(!raw||vectorArmed.has(raw))return;vectorArmed.add(raw);requestVector(raw);
    let attempts=0;
    const retry=()=>{
      if(inlineHoleMap?.raw!==raw)return;
      attempts++;
      if(vectorReady(raw)){applyCamera(green,true);record('VECTOR_READY');return}
      if(attempts<24)setTimeout(retry,125);else record('VECTOR_UNAVAILABLE_STAY_GOOGLE');
    };
    try{raw.addListener?.('renderingtype_changed',retry);raw.addListener?.('idle',retry)}catch{}
    setTimeout(retry,0);
  }

  function showCard(hole,par,yards){
    document.querySelector('.hole-flyover-card')?.remove();
    const host=document.querySelector('.live-hole-map');if(!host)return;
    host.classList.add('hole-flyover-active');
    const card=document.createElement('div');card.className='hole-flyover-card';
    card.innerHTML=`<small>NEXT HOLE</small><b>Hole ${hole}</b><span>Par ${par} · ${yards} yd</span><button type="button">Skip</button>`;
    card.querySelector('button')?.addEventListener('click',()=>finishFlyover(true));host.appendChild(card);
  }
  function removeCard(){document.querySelector('.hole-flyover-card')?.remove();document.querySelector('.live-hole-map')?.classList.remove('hole-flyover-active')}

  let finishTarget=null;
  function finishFlyover(skip=false){
    if(flyoverFrame)cancelAnimationFrame(flyoverFrame);flyoverFrame=0;
    const target=finishTarget;finishTarget=null;flyoverActive=false;removeCard();
    if(target?.green)applyCamera(target.green,true);
    record(skip?'FLYOVER_SKIPPED':'FLYOVER_COMPLETE');
  }

  async function animateToHole(targetHole,direction=1){
    if(flyoverActive||inlineHoleMap?.provider!=='google'||!inlineHoleMap.raw)return false;
    const course=selectedRoundCourse(),green=course?.greens?.[targetHole-1];if(!green||!selectedTee(green)||!green.center)return false;
    const raw=inlineHoleMap.raw;
    if(!vectorReady(raw)){requestVector(raw);return false}
    const startCenter=inlineHoleMap.getCenter?.()||selectedTee(green),startZoom=Number(raw.getZoom?.()||17),startHeading=Number(raw.getHeading?.()||0),startTilt=Number(raw.getTilt?.()||0);

    s.hole=targetHole;
    const updater=window.__parfolioV270PriorUpdateGoogleRoundHole;
    if(typeof updater==='function')updater();else if(typeof showRoundHole==='function')showRoundHole();
    const camera=cameraFor(green,raw);if(!camera)return false;
    try{raw.moveCamera({center:startCenter,zoom:startZoom,heading:startHeading,tilt:startTilt})}catch{}

    const par=Number(s.pars[targetHole-1])||4;showCard(targetHole,par,camera.yards);flyoverActive=true;finishTarget={green,targetHole};
    const cruiseZoom=clamp(Math.min(startZoom,camera.zoom)-1.15,15.9,17.55),started=performance.now();
    function frame(now){
      if(!flyoverActive)return;
      const t=clamp((now-started)/FLYOVER_MS,0,1);let center,zoom,heading,tilt;
      if(t<.18){const p=smooth(t/.18);center=startCenter;zoom=lerp(startZoom,cruiseZoom,p);heading=headingLerp(startHeading,camera.heading,p*.25);tilt=lerp(startTilt,30,p)}
      else if(t<.70){const p=smooth((t-.18)/.52);center=pointLerp(startCenter,camera.center,p);zoom=cruiseZoom;heading=headingLerp(startHeading,camera.heading,.25+.75*p);tilt=30}
      else{const p=smooth((t-.70)/.30);center=camera.center;zoom=lerp(cruiseZoom,camera.zoom,p);heading=camera.heading;tilt=lerp(30,camera.tilt,p)}
      try{raw.moveCamera({center,zoom,heading,tilt})}catch(error){record('FLYOVER_FRAME_FAIL_STAY_GOOGLE',error?.message||error);finishFlyover(true);return}
      if(t>=1){finishFlyover(false);return}flyoverFrame=requestAnimationFrame(frame);
    }
    flyoverFrame=requestAnimationFrame(frame);record('FLYOVER_START',`${targetHole}:${direction}`);return true;
  }

  const priorInit=window.initInlineHoleMap;
  if(typeof priorInit==='function')window.initInlineHoleMap=async function(green){
    await priorInit(green);
    if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw){armVector(inlineHoleMap.raw,green);setTimeout(()=>applyCamera(green,true),80)}
  };

  const priorUpdate=window.updateGoogleRoundHole;
  window.__parfolioV270PriorUpdateGoogleRoundHole=priorUpdate;
  if(typeof priorUpdate==='function')window.updateGoogleRoundHole=function(){
    const result=priorUpdate.apply(this,arguments);
    try{const green=selectedRoundCourse()?.greens?.[s.hole-1];if(green&&inlineHoleMap?.provider==='google'&&!flyoverActive)setTimeout(()=>applyCamera(green,true),60)}catch(error){record('HOLE_CAMERA_FAIL_STAY_GOOGLE',error?.message||error)}
    return result;
  };

  const priorPrev=window.prev,priorNext=window.next;
  window.prev=function(){
    if(s.hole<=1)return priorPrev?.apply(this,arguments);
    if(reducedMotion()||inlineHoleMap?.provider!=='google'||!vectorReady(inlineHoleMap.raw))return priorPrev?.apply(this,arguments);
    animateToHole(s.hole-1,-1).then(ok=>{if(!ok)priorPrev?.()});
  };
  window.next=function(){
    if(s.hole>=s.holes)return priorNext?.apply(this,arguments);
    if(reducedMotion()||inlineHoleMap?.provider!=='google'||!vectorReady(inlineHoleMap.raw))return priorNext?.apply(this,arguments);
    animateToHole(s.hole+1,1).then(ok=>{if(!ok)priorNext?.()});
  };

  const priorOrient=window.orientInlineHoleMap;
  if(typeof priorOrient==='function')window.orientInlineHoleMap=function(green,origin=null,target=null){
    if(inlineHoleMap?.provider==='google'){applyCamera(green,false);return}
    return priorOrient.apply(this,arguments);
  };

  record('CAMERA_FLYOVER_V270_READY','non-blocking');
})();
