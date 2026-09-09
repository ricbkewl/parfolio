/* ParFolio Google Maps loader v239.
   Production browser key is supplied only by Vercel at runtime through /api/runtime-config.
   No repository constant is used as a fallback. */
(function(){
  let readyPromise=null,configPromise=null;
  const callbackName='__parfolioGoogleMapsReady239';

  function apiReady(){return typeof window.google?.maps?.Map==='function'&&typeof window.google?.maps?.marker?.AdvancedMarkerElement==='function'}
  function configuredKey(){return String(window.PARFOLIO_GOOGLE_MAPS_API_KEY||'').trim()}

  function loadRuntimeConfig(){
    const existing=configuredKey();
    if(existing)return Promise.resolve(existing);
    if(configPromise)return configPromise;
    configPromise=new Promise((resolve,reject)=>{
      const old=document.querySelector('script[data-parfolio-runtime-config]');
      if(old)old.remove();
      const script=document.createElement('script');
      script.src='/api/runtime-config?ts='+Date.now();
      script.async=false;
      script.dataset.parfolioRuntimeConfig='1';
      script.onload=()=>{
        const key=configuredKey();
        if(key)resolve(key);
        else{configPromise=null;reject(new Error('ParFolio Google Maps key is not configured in Vercel'))}
      };
      script.onerror=()=>{configPromise=null;reject(new Error('ParFolio runtime config endpoint could not be loaded'))};
      document.head.appendChild(script);
    });
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
