/* ParFolio v151: true screen-position tee/center camera.
   The selected Playing Tee must land at 6 o'clock and Green Center at 12 o'clock.
   Aim points are route/yardage references only and never determine camera orientation. */
(function(){
  const TARGET_TEE_Y=.80;
  const TARGET_CENTER_Y=.20;
  const TARGET_X=.50;
  const MIN_ZOOM=16.4;
  const MAX_ZOOM=20.2;
  const TILT=67.5;
  const projectionCache=new WeakMap();
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  function cameraData(green){
    const tee=selectedTee(green);if(!tee||!green?.center)return null;
    const yards=mappedHoleDistance(green)||Math.round(distanceYards(tee,green.center));
    const safe=Math.max(120,Number(yards)||350);
    const zoom=clamp(19.15-Math.log2(safe/150)*.72,17.25,19.35);
    return{tee,centerGreen:green.center,yards,heading:bearingDegrees(tee,green.center),zoom};
  }

  function projectionFor(raw){
    if(!raw||!window.google?.maps?.OverlayView)return null;
    let item=projectionCache.get(raw);if(item)return item;
    const overlay=new google.maps.OverlayView();
    overlay.onAdd=function(){};overlay.draw=function(){};overlay.onRemove=function(){};
    overlay.setMap(raw);item={overlay};projectionCache.set(raw,item);return item;
  }

  function pixel(projection,point){
    try{return projection?.fromLatLngToContainerPixel(new google.maps.LatLng(point.lat,point.lng))||null}catch{return null}
  }

  function baseCamera(green){
    const data=cameraData(green);if(!data||inlineHoleMap?.provider!=='google'||!inlineHoleMap.raw)return false;
    const raw=inlineHoleMap.raw;
    inlineUserMovedMap=false;
    try{raw.moveCamera({center:pointBetween(data.tee,data.centerGreen,.50),zoom:data.zoom,heading:data.heading,tilt:TILT})}catch{return false}
    return true;
  }

  async function correctClockPosition(green,pass=0){
    if(pass>4||inlineHoleMap?.provider!=='google'||!inlineHoleMap.raw)return;
    const raw=inlineHoleMap.raw,data=cameraData(green),container=$('liveHoleMap');if(!data||!container)return;
    const cache=projectionFor(raw),projection=cache?.overlay?.getProjection?.();
    if(!projection){setTimeout(()=>correctClockPosition(green,pass+1),100);return;}
    const teePx=pixel(projection,data.tee),centerPx=pixel(projection,data.centerGreen);if(!teePx||!centerPx)return;
    const width=container.clientWidth||1,height=container.clientHeight||1;
    const desiredX=width*TARGET_X,desiredTeeY=height*TARGET_TEE_Y,desiredCenterY=height*TARGET_CENTER_Y;

    /* If Google's camera is facing the opposite way, flip it immediately. */
    if(teePx.y<centerPx.y){
      try{raw.moveCamera({heading:(Number(raw.getHeading?.()||data.heading)+180)%360,tilt:TILT})}catch{}
      setTimeout(()=>correctClockPosition(green,pass+1),110);return;
    }

    const actualSep=Math.max(1,teePx.y-centerPx.y),desiredSep=Math.max(1,desiredTeeY-desiredCenterY);
    const currentZoom=Number(raw.getZoom?.()||data.zoom);
    const zoomDelta=Math.log2(desiredSep/actualSep);
    if(Math.abs(zoomDelta)>.035){
      try{raw.moveCamera({zoom:clamp(currentZoom+zoomDelta,MIN_ZOOM,MAX_ZOOM),heading:data.heading,tilt:TILT})}catch{}
      setTimeout(()=>correctClockPosition(green,pass+1),110);return;
    }

    const midX=(teePx.x+centerPx.x)/2,midY=(teePx.y+centerPx.y)/2;
    const desiredMidY=(desiredTeeY+desiredCenterY)/2;
    const panX=midX-desiredX,panY=midY-desiredMidY;
    if(Math.abs(panX)>2||Math.abs(panY)>2){
      try{raw.panBy(panX,panY)}catch{}
      setTimeout(()=>correctClockPosition(green,pass+1),110);return;
    }

    if(container){container.dataset.forwardBearing=String(data.heading);container.dataset.clockCamera='locked';}
  }

  function lockClockCamera(green){
    if(!baseCamera(green))return;
    setTimeout(()=>correctClockPosition(green,0),80);
    setTimeout(()=>correctClockPosition(green,0),260);
    setTimeout(()=>correctClockPosition(green,0),700);
  }

  window.parfolioLockTeeCenterCamera=lockClockCamera;
  window.parfolioHoleFinalCamera=function(green){
    const d=cameraData(green);if(!d)return null;
    return{center:pointBetween(d.tee,d.centerGreen,.50),zoom:d.zoom,heading:d.heading,tilt:TILT,yards:d.yards};
  };
  window.atgHoleFinalCamera=window.parfolioHoleFinalCamera;

  /* Final override: GPS can update yardages and golfer position, but never camera axis. */
  orientInlineHoleMap=function(green){
    if(inlineHoleMap?.provider==='google'&&!inlineUserMovedMap)lockClockCamera(green);
  };

  const priorInit151=initInlineHoleMap;
  initInlineHoleMap=async function(green){
    await priorInit151(green);
    if(inlineHoleMap?.provider==='google')lockClockCamera(green);
  };

  const priorUpdate151=updateGoogleRoundHole;
  updateGoogleRoundHole=function(){
    const result=priorUpdate151();
    if(result){const green=selectedRoundCourse()?.greens?.[s.hole-1];setTimeout(()=>lockClockCamera(green),30);}
    return result;
  };

  /* Re-lock after the existing flyover completes or after any normal hole change. */
  const wrapNavigation=name=>{
    const prior=window[name]||eval(name);
    const wrapped=function(){const result=prior.apply(this,arguments);Promise.resolve(result).finally(()=>{const green=selectedRoundCourse()?.greens?.[s.hole-1];setTimeout(()=>lockClockCamera(green),40);setTimeout(()=>lockClockCamera(green),400)});return result;};
    if(name==='next')next=wrapped;else if(name==='prev')prev=wrapped;
  };
  try{wrapNavigation('prev');wrapNavigation('next')}catch{}

  if(s?.v==='round'&&!s?.done){const green=selectedRoundCourse()?.greens?.[s.hole-1];setTimeout(()=>lockClockCamera(green),0);setTimeout(()=>lockClockCamera(green),550);}
})();
