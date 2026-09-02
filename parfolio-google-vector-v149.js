/* ParFolio Google Maps compatibility v178.
   Google Maps may expose placeholder properties before importLibrary() resolves.
   Always install the real imported constructors so legacy editor/play code sees
   usable constructors instead of async placeholders. */
(function(){
  if(typeof loadGoogleMaps!=='function')return;
  const priorLoadGoogleMaps=loadGoogleMaps;
  let mapsLibraryPromise=null,markerLibraryPromise=null;

  function install(target,source,names){
    if(!target||!source)return;
    for(const name of names){
      if(typeof source[name]==='undefined')continue;
      if(target[name]===source[name])continue;
      try{target[name]=source[name];continue}catch{}
      try{Object.defineProperty(target,name,{value:source[name],writable:true,configurable:true,enumerable:true})}catch{}
    }
  }

  loadGoogleMaps=async function(){
    await priorLoadGoogleMaps();
    const maps=window.google?.maps;
    if(!maps)throw new Error('Google Maps namespace unavailable');

    if(typeof maps.importLibrary==='function'){
      if(!mapsLibraryPromise)mapsLibraryPromise=maps.importLibrary('maps');
      const lib=await mapsLibraryPromise;
      install(maps,lib,['Map','Polyline','Polygon','Circle','Rectangle','InfoWindow','LatLng','LatLngBounds','MapTypeId','ControlPosition','SymbolPath','RenderingType']);

      try{
        if(!markerLibraryPromise)markerLibraryPromise=maps.importLibrary('marker');
        const markerLib=await markerLibraryPromise;
        install(maps,markerLib,['Marker','AdvancedMarkerElement','PinElement']);
      }catch(error){console.warn('Google marker library unavailable',error)}
    }

    if(typeof maps.Map!=='function')throw new Error('Google Maps library loaded but Map constructor is unavailable');
    return maps;
  };
})();
