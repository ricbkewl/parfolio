/* ParFolio Google Maps loader v263.
   The base Google map is the only blocking requirement. Advanced Markers are
   optional enhancement and must never force an OpenStreetMap fallback. */
(function(){
  let readyPromise=null,configPromise=null,markerPromise=null;
  const callbackName='__parfolioGoogleMapsReady263';
  const baseReady=()=>typeof window.google?.maps?.Map==='function';
  const markerReady=()=>typeof window.google?.maps?.marker?.AdvancedMarkerElement==='function';
  const configuredKey=()=>String(window.PARFOLIO_GOOGLE_MAPS_API_KEY||'').trim();

  function loadRuntimeConfig(){
    const existing=configuredKey();if(existing)return Promise.resolve(existing);if(configPromise)return configPromise;
    configPromise=fetch(new URL('./parfolio-public-config.json',document.baseURI),{cache:'no-store'})
      .then(r=>{if(!r.ok)throw new Error('ParFolio public map config could not be loaded');return r.json()})
      .then(c=>{const key=String(c?.google_maps_browser_key||'').trim();if(!key)throw new Error('ParFolio Google Maps key is not configured');window.PARFOLIO_GOOGLE_MAPS_API_KEY=key;return key})
      .catch(e=>{configPromise=null;throw e});
    return configPromise;
  }

  function warmMarkerLibrary(){
    if(markerReady())return Promise.resolve(true);
    if(markerPromise)return markerPromise;
    markerPromise=Promise.resolve().then(async()=>{
      try{
        if(typeof window.google?.maps?.importLibrary==='function')await window.google.maps.importLibrary('marker');
        return markerReady();
      }catch(error){
        console.warn('ParFolio Advanced Markers unavailable; using Google standard marker compatibility.',error);
        return false;
      }
    });
    return markerPromise;
  }

  function loadBaseScript(key){
    if(baseReady()){warmMarkerLibrary();return Promise.resolve(window.google.maps)};
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finish=()=>{if(settled)return;if(!baseReady())return;settled=true;try{delete window[callbackName]}catch{};warmMarkerLibrary();resolve(window.google.maps)};
      const fail=message=>{if(settled)return;settled=true;try{delete window[callbackName]}catch{};reject(new Error(message))};
      window[callbackName]=finish;
      document.querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]').forEach(script=>{if(!baseReady())try{script.remove()}catch{}});
      const script=document.createElement('script');
      const params=new URLSearchParams({key,v:'weekly',loading:'async',libraries:'marker',callback:callbackName});
      script.src=`https://maps.googleapis.com/maps/api/js?${params.toString()}`;script.async=true;script.defer=true;script.onerror=()=>fail('Google Maps JavaScript API could not be downloaded');document.head.appendChild(script);
      setTimeout(()=>{if(settled)return;baseReady()?finish():fail('Google Maps base API did not become ready within 12 seconds')},12000);
    });
  }

  loadGoogleMaps=function(){
    if(baseReady()){warmMarkerLibrary();return Promise.resolve(window.google.maps)}
    if(readyPromise)return readyPromise;
    readyPromise=loadRuntimeConfig().then(loadBaseScript).catch(error=>{readyPromise=null;throw error});
    return readyPromise;
  };
  window.parfolioWarmGoogleMarkerLibrary=warmMarkerLibrary;
})();
