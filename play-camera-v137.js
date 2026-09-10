/* ParFolio v257: deterministic 3D Google camera with delayed VECTOR readiness recovery. */
(function(){
  const MAX_PLAY_TILT=67.5;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const appliedCamera=new WeakMap();
  const readinessArmed=new WeakSet();

  function pointAlongRoute(route,fraction=.46){
    if(!route?.length)return null;
    if(route.length===1)return route[0];
    const lengths=[];let total=0;
    for(let i=1;i<route.length;i++){const d=distanceYards(route[i-1],route[i]);lengths.push(d);total+=d;}
    if(!total)return route[0];
    let remaining=total*clamp(fraction,0,1);
    for(let i=0;i<lengths.length;i++){
      if(remaining<=lengths[i]){
        const ratio=lengths[i]?remaining/lengths[i]:0;
        return pointBetween(route[i],route[i+1],ratio);
      }
      remaining-=lengths[i];
    }
    return route.at(-1);
  }

  function zoomForHole(yards){
    const safe=Math.max(140,Number(yards)||350);
    return clamp(19.15-Math.log2(safe/150)*.75,17.45,19.10);
  }

  window.atgHoleFinalCamera=function(green){
    const tee=selectedTee(green);if(!tee||!green?.center)return null;
    const route=holeRoute(green);
    const yards=mappedHoleDistance(green)||Math.round(distanceYards(tee,green.center));
    return{
      center:pointAlongRoute(route,.5)||pointBetween(tee,green.center,.5),
      zoom:zoomForHole(yards),
      heading:bearingDegrees(tee,green.center),
      tilt:MAX_PLAY_TILT,
      yards
    };
  };

  function cameraSignature(camera){
    return [Number(s?.hole)||1,camera.center.lat.toFixed(7),camera.center.lng.toFixed(7),camera.zoom.toFixed(3),camera.heading.toFixed(3),camera.tilt].join(':');
  }

  function vectorReady(rawMap){
    try{return !!window.google?.maps?.RenderingType?.VECTOR&&rawMap?.getRenderingType?.()===google.maps.RenderingType.VECTOR}catch{return false}
  }

  function armVectorRecovery(rawMap,green){
    if(!rawMap||readinessArmed.has(rawMap))return;
    readinessArmed.add(rawMap);
    let attempts=0,finished=false;
    const retry=()=>{
      if(finished||inlineHoleMap?.raw!==rawMap)return;
      attempts++;
      if(vectorReady(rawMap)){
        finished=true;
        window.applyParFolioHoleCamera?.(green,true);
        return;
      }
      if(attempts<18)setTimeout(retry,140);
    };
    try{rawMap.addListener?.('renderingtype_changed',retry)}catch{}
    try{rawMap.addListener?.('idle',retry)}catch{}
    setTimeout(retry,0);
  }

  window.applyParFolioHoleCamera=function(green,force=false){
    if(inlineHoleMap?.provider!=='google'||!selectedTee(green)||!green?.center)return false;
    if(inlineUserMovedMap&&!inlineViewResetting&&!force)return false;
    const camera=atgHoleFinalCamera(green),rawMap=inlineHoleMap.raw,container=$('liveHoleMap');if(!camera||!rawMap)return false;
    const signature=cameraSignature(camera),ready=vectorReady(rawMap);
    if(!force&&ready&&appliedCamera.get(rawMap)===signature)return false;
    if(container){container.dataset.forwardBearing=String(camera.heading);container.style.setProperty('--map-bearing','0deg');container.style.transform='none'}

    /* Always place/zoom the hole immediately. Heading and tilt are safe only once
       Google confirms VECTOR rendering. Never memoize an early flat camera. */
    if(ready){
      moveGoogleCamera(rawMap,camera);
      appliedCamera.set(rawMap,signature);
    }else{
      moveGoogleCamera(rawMap,{center:camera.center,zoom:camera.zoom});
      appliedCamera.delete(rawMap);
      armVectorRecovery(rawMap,green);
    }
    return true;
  };

  const priorOrient137=orientInlineHoleMap;
  orientInlineHoleMap=function(green,origin=null,target=null){
    if(inlineHoleMap?.provider!=='google'){priorOrient137(green,origin,target);return;}
    applyParFolioHoleCamera(green,false);
  };

  const priorInit137=initInlineHoleMap;
  initInlineHoleMap=async function(green){
    await priorInit137(green);
    if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw){
      armVectorRecovery(inlineHoleMap.raw,green);
      applyParFolioHoleCamera(green,false);
    }
  };
})();
