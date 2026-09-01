/* Version 137: one deterministic final Google camera per mapped hole. */
(function(){
  const MAX_PLAY_TILT=67.5;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

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
    const route=holeRoute(green),firstTarget=route[1]||green.center;
    const yards=mappedHoleDistance(green)||Math.round(distanceYards(tee,green.center));
    return{
      center:pointAlongRoute(route,.46)||pointBetween(tee,green.center,.46),
      zoom:zoomForHole(yards),
      heading:bearingDegrees(tee,firstTarget),
      tilt:MAX_PLAY_TILT,
      yards
    };
  };

  /* Override only Google's automatic orientation. MapTiler keeps its existing fit.
     This makes every mapped Google hole use the same framing rules instead of
     inheriting the prior hole's zoom. */
  const priorOrient137=orientInlineHoleMap;
  orientInlineHoleMap=function(green,origin=null,target=null){
    if(inlineHoleMap?.provider!=='google'){priorOrient137(green,origin,target);return;}
    if(!selectedTee(green)||!green?.center)return;
    const camera=atgHoleFinalCamera(green),container=$('liveHoleMap');if(!camera)return;
    const start=origin||selectedTee(green),end=target||(holeRoute(green)[1]||green.center),heading=origin&&target?bearingDegrees(start,end):camera.heading;
    if(container){container.dataset.forwardBearing=String(heading);container.style.setProperty('--map-bearing','0deg');container.style.transform='none';}
    if(!inlineUserMovedMap||inlineViewResetting){
      try{inlineHoleMap.raw.moveCamera({...camera,heading});}catch{}
    }
  };

  /* The base initializer can fit bounds before the tilt enhancement runs. Reapply
     the deterministic camera after tiles/rendering settle so initial hole views,
     restores, and flyover landings all agree. */
  const priorInit137=initInlineHoleMap;
  initInlineHoleMap=async function(green){
    await priorInit137(green);
    if(inlineHoleMap?.provider!=='google'||inlineUserMovedMap)return;
    const apply=()=>{const camera=atgHoleFinalCamera(green);if(camera&&inlineHoleMap?.provider==='google'){try{inlineHoleMap.raw.moveCamera(camera);}catch{}}};
    apply();setTimeout(apply,220);setTimeout(apply,700);
  };
})();
