/* ParFolio Google Maps compatibility.
   Google Maps JS may expose google.maps before constructors are attached when
   loading with loading=async. Import the native libraries, then bridge their
   constructors onto google.maps for the existing ParFolio editor/play code. */
(function(){
  if(typeof loadGoogleMaps!=='function')return;
  const priorLoadGoogleMaps=loadGoogleMaps;
  let mapsLibraryPromise=null,markerLibraryPromise=null;

  function expose(target,source,names){
    if(!target||!source)return;
    for(const name of names){
      if(typeof target[name]==='undefined'&&typeof source[name]!=='undefined'){
        try{target[name]=source[name]}catch{}
      }
    }
  }

  loadGoogleMaps=async function(){
    await priorLoadGoogleMaps();
    const maps=window.google?.maps;
    if(!maps)throw new Error('Google Maps namespace unavailable');

    if(typeof maps.importLibrary==='function'){
      if(!mapsLibraryPromise)mapsLibraryPromise=maps.importLibrary('maps');
      const lib=await mapsLibraryPromise;
      expose(maps,lib,['Map','Polyline','Polygon','Circle','Rectangle','InfoWindow','LatLng','LatLngBounds','MapTypeId','ControlPosition','SymbolPath','RenderingType']);

      try{
        if(!markerLibraryPromise)markerLibraryPromise=maps.importLibrary('marker');
        const markerLib=await markerLibraryPromise;
        expose(maps,markerLib,['Marker','AdvancedMarkerElement','PinElement']);
      }catch(error){console.warn('Google marker library unavailable',error)}
    }

    if(typeof maps.Map!=='function')throw new Error('Google Maps library loaded but Map constructor is unavailable');
    return maps;
  };
})();
