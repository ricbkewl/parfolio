/* ParFolio: one deterministic final Google camera per mapped hole.
   Keep the playing tee at the bottom of the screen and the green center at the top.
   Intermediate aim points remain route references only; they never anchor the camera. */
(function(){
  const MAX_PLAY_TILT=67.5;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function zoomForHole(yards){
    const safe=Math.max(140,Number(yards)||350);
    return clamp(19.15-Math.log2(safe/150)*.75,17.45,19.10);
  }

  window.atgHoleFinalCamera=function(green){
    const tee=selectedTee(green);if(!tee||!green?.center)return null;
    const yards=mappedHoleDistance(green)||Math.round(distanceYards(tee,green.center));
    return{
      center:pointBetween(tee,green.center,.48),
      zoom:zoomForHole(yards),
      heading:bearingDegrees(tee,green.center),
      tilt:MAX_PLAY_TILT,
      yards
    };
  };

  const priorOrient137=orientInlineHoleMap;
  orientInlineHoleMap=function(green,origin=null,target=null){
    if(inlineHoleMap?.provider!=='google'){priorOrient137(green,origin,target);return;}
    if(!selectedTee(green)||!green?.center)return;
    const camera=atgHoleFinalCamera(green),container=$('liveHoleMap');if(!camera)return;
    const tee=selectedTee(green),heading=bearingDegrees(tee,green.center);
    if(container){container.dataset.forwardBearing=String(heading);container.style.setProperty('--map-bearing','0deg');container.style.transform='none';}
    if(!inlineUserMovedMap||inlineViewResetting){
      try{inlineHoleMap.raw.moveCamera({...camera,heading});}catch{}
    }
  };

  const priorInit137=initInlineHoleMap;
  initInlineHoleMap=async function(green){
    await priorInit137(green);
    if(inlineHoleMap?.provider!=='google'||inlineUserMovedMap)return;
    const apply=()=>{const camera=atgHoleFinalCamera(green);if(camera&&inlineHoleMap?.provider==='google'){try{inlineHoleMap.raw.moveCamera(camera);}catch{}}};
    apply();setTimeout(apply,220);setTimeout(apply,700);
  };
})();
