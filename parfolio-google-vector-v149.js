/* ParFolio vector-map compatibility.
   Force Google's native VECTOR renderer directly in code so ParFolio gets the
   same heading/tilt/WebGL camera behavior ATG uses without borrowing ATG's Map ID. */
(function(){
  if(typeof loadGoogleMaps!=='function')return;
  const priorLoadGoogleMaps=loadGoogleMaps;
  let constructorPatched=false;

  loadGoogleMaps=async function(){
    const result=await priorLoadGoogleMaps();
    if(constructorPatched||!window.google?.maps?.Map)return result;
    const OriginalMap=window.google.maps.Map;
    const WrappedMap=function(element,options){
      const next={...(options||{})};
      delete next.mapId;
      if(window.google?.maps?.RenderingType?.VECTOR)next.renderingType=window.google.maps.RenderingType.VECTOR;
      next.headingInteractionEnabled=true;
      next.tiltInteractionEnabled=true;
      return new OriginalMap(element,next);
    };
    try{Object.setPrototypeOf(WrappedMap,OriginalMap);}catch{}
    WrappedMap.prototype=OriginalMap.prototype;
    window.google.maps.Map=WrappedMap;
    constructorPatched=true;
    return result;
  };
})();
