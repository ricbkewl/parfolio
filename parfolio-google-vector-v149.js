/* ParFolio vector-map compatibility.
   ParFolio has its own Google browser key but does not yet have a dedicated Cloud Map ID.
   Use Google's demo vector Map ID for beta so heading, tilt and the helicopter flyover work.
   Replace DEMO_MAP_ID with a dedicated ParFolio Map ID when one is created. */
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
      if(!next.mapId)next.mapId='DEMO_MAP_ID';
      return new OriginalMap(element,next);
    };
    try{Object.setPrototypeOf(WrappedMap,OriginalMap);}catch{}
    WrappedMap.prototype=OriginalMap.prototype;
    window.google.maps.Map=WrappedMap;
    constructorPatched=true;
    return result;
  };
})();
