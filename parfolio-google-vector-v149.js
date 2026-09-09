/* ParFolio Google Maps loader v256.\n   The public, referrer-restricted browser key is read from ParFolio's same-origin public config so GitHub Pages and Vercel use the same map runtime. */
(function(){
  let readyPromise=null,configPromise=null;
  const callbackName='__parfolioGoogleMapsReady239';

  function apiReady(){return typeof window.google?.maps?.Map==='function'&&typeof window.google?.maps?.marker?.AdvancedMarkerElement==='function'}
  function configuredKey(){return String(window.PARFOLIO_GOOGLE_MAPS_API_KEY||'').trim()}

  function loadRuntimeConfig(){
    const existing=configuredKey();
    if(existing)return Promise.resolve(existing);
    if(configPromise)return configPromise;
    const configUrl=new URL('./parfolio-public-config.json',document.baseURI);
    configPromise=fetch(configUrl,{cache:'no-store'})
      .then(response=>{if(!response.ok)throw new Error('ParFolio public map config could not be loaded');return response.json()})
      .then(config=>{
        const key=String(config?.google_maps_browser_key||'').trim();
        if(!key)throw new Error('ParFolio Google Maps key is not configured');
        window.PARFOLIO_GOOGLE_MAPS_API_KEY=key;
        return key;
      })
      .catch(error=>{configPromise=null;throw error});
    return configPromise;
  }

  loadGoogleMaps=function(){
    if(apiReady())return Promise.resolve(window.google.maps);
    if(readyPromise)return readyPromise;

    readyPromise=loadRuntimeConfig().then(key=>new Promise((resolve,reject)=>{
      let settled=false;
      const fail=message=>{if(settled)return;settled=true;readyPromise=null;try{delete window[callbackName]}catch{}reject(new Error(message))};
      const finish=()=>{
        if(settled)return;
        if(apiReady()){
          settled=true;
          try{delete window[callbackName]}catch{}
          resolve(window.google.maps);
        }
      };

      window[callbackName]=()=>{
        finish();
        if(!settled)fail('Google Maps callback fired without required constructors');
      };

      document.querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]').forEach(script=>{
        if(!apiReady())try{script.remove()}catch{}
      });

      const script=document.createElement('script');
      const params=new URLSearchParams({key,v:'weekly',loading:'async',libraries:'marker',callback:callbackName});
      script.src=`https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async=true;
      script.defer=true;
      script.onerror=()=>fail('Google Maps JavaScript API could not be downloaded');
      document.head.appendChild(script);

      setTimeout(()=>{
        if(settled)return;
        if(apiReady()){finish();return}
        fail('Google Maps did not become ready within 12 seconds');
      },12000);
    })).catch(error=>{readyPromise=null;throw error});

    return readyPromise;
  };
})();
