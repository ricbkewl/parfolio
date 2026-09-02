/* ParFolio Google Maps loader v181.
   The production Google Maps browser key is supplied at deploy time through
   parfolio-runtime-config.js. The repository keeps no production browser key
   in this loader. */
(function(){
  let readyPromise=null;
  const callbackName='__parfolioGoogleMapsReady181';

  function apiReady(){return typeof window.google?.maps?.Map==='function'}

  loadGoogleMaps=function(){
    if(apiReady())return Promise.resolve(window.google.maps);
    if(readyPromise)return readyPromise;

    const runtimeKey=String(window.PARFOLIO_GOOGLE_MAPS_API_KEY||'').trim();
    const key=runtimeKey||String(typeof GOOGLE_MAPS_API_KEY!=='undefined'?GOOGLE_MAPS_API_KEY:'').trim();
    if(!key)return Promise.reject(new Error('ParFolio Google Maps key is not configured'));

    readyPromise=new Promise((resolve,reject)=>{
      let settled=false;
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
        if(!settled){settled=true;reject(new Error('Google Maps callback fired without a Map constructor'))}
      };

      document.querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]').forEach(script=>{
        if(!apiReady())try{script.remove()}catch{}
      });

      const script=document.createElement('script');
      const params=new URLSearchParams({key,v:'weekly',callback:callbackName});
      script.src=`https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async=true;
      script.defer=true;
      script.onerror=()=>{
        if(settled)return;
        settled=true;
        readyPromise=null;
        try{delete window[callbackName]}catch{}
        reject(new Error('Google Maps JavaScript API could not be downloaded'));
      };
      document.head.appendChild(script);

      setTimeout(()=>{
        if(settled)return;
        if(apiReady()){finish();return}
        settled=true;
        readyPromise=null;
        try{delete window[callbackName]}catch{}
        reject(new Error('Google Maps did not become ready within 12 seconds'));
      },12000);
    });

    return readyPromise;
  };
})();
