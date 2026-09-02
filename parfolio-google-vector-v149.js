/* ParFolio Google Maps compatibility.
   Google Maps JS now exposes google.maps before the Maps library constructor is
   necessarily ready when loading with loading=async. Wait for importLibrary('maps')
   instead of replacing google.maps.Map. This keeps the native constructor intact
   for course editing, NY/Indonesia mapping and live-round camera behavior. */
(function(){
  if(typeof loadGoogleMaps!=='function')return;
  const priorLoadGoogleMaps=loadGoogleMaps;
  let mapsLibraryPromise=null;

  loadGoogleMaps=async function(){
    await priorLoadGoogleMaps();
    if(window.google?.maps?.importLibrary){
      if(!mapsLibraryPromise)mapsLibraryPromise=window.google.maps.importLibrary('maps');
      await mapsLibraryPromise;
    }
    if(typeof window.google?.maps?.Map!=='function'){
      throw new Error('Google Maps library loaded but Map constructor is unavailable');
    }
    return window.google.maps;
  };
})();
