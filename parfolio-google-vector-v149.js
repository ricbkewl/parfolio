/* ParFolio Google Maps loader v179.
   Use the classic callback loader so ParFolio does not treat the Google script's
   download event as API readiness. The course editor and play views can safely
   consume google.maps only after the callback fires. */
(function(){
  let readyPromise=null;
  const callbackName='__parfolioGoogleMapsReady179';

  function apiReady(){return typeof window.google?.maps?.Map==='function'}

  loadGoogleMaps=function(){
    if(apiReady())return Promise.resolve(window.google.maps);
    if(readyPromise)return readyPromise;

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

      /* Remove a stale/partial Google Maps script left by an earlier async load. */
      document.querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]').forEach(script=>{
        if(!apiReady())try{script.remove()}catch{}
      });

      const script=document.createElement('script');
      const params=new URLSearchParams({
        key:GOOGLE_MAPS_API_KEY,
        v:'weekly',
        callback:callbackName
      });
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

      /* Fail visibly instead of leaving the editor on an endless spinner. */
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
