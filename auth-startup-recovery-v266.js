/* ParFolio v266 — auth startup recovery guard.
   Prevents iOS/PWA session restoration from trapping the app forever on the secure-login shell.
   Recovery always returns to the public home view; protected views remain gated by normal auth checks. */
(function(){
  const STARTUP_LIMIT_MS=10000;
  const RESUME_LIMIT_MS=7000;
  let recoveryTimer=null;
  let recovered=false;

  function authShellVisible(){
    const node=document.querySelector('.home-auth-loading');
    return !!node && /checking (?:your )?(?:secure|saved) login/i.test(node.textContent||'');
  }

  function syncAuxiliaryUi(){
    const fab=document.querySelector('.pf-offline-fab');
    if(fab)fab.hidden=authShellVisible() || !!document.querySelector('#roundMapHole,.round-map-shell,.play-map');
  }

  function record(reason){
    try{
      const prior=JSON.parse(localStorage.parfolioStartupDiagnostics||'[]');
      prior.push({time:new Date().toISOString(),reason,online:navigator.onLine,visibility:document.visibilityState});
      localStorage.parfolioStartupDiagnostics=JSON.stringify(prior.slice(-20));
    }catch{}
  }

  function recover(reason){
    if(recovered)return;
    try{
      if(typeof cloudLoading==='undefined'||!cloudLoading)return;
      recovered=true;
      record(reason);
      cloudLoading=false;
      cloudError='Secure sign-in is taking longer than expected. ParFolio recovered automatically; you can continue or retry your account connection.';
      if(typeof s!=='undefined')s.v='home';
      if(typeof render==='function')render();
      syncAuxiliaryUi();
      console.warn('ParFolio recovered from a stalled secure-login startup:',reason);
    }catch(error){console.warn('ParFolio auth startup recovery could not complete',error)}
  }

  function arm(limit=STARTUP_LIMIT_MS,reason='startup-timeout'){
    clearTimeout(recoveryTimer);
    recovered=false;
    recoveryTimer=setTimeout(()=>{
      try{if(typeof cloudLoading!=='undefined'&&cloudLoading&&authShellVisible())recover(reason)}catch{}
    },limit);
  }

  window.retryParFolioSecureLogin=async function(){
    try{
      recovered=false;
      cloudError='';
      if(typeof initializeCloud==='function'){
        arm(STARTUP_LIMIT_MS,'manual-retry-timeout');
        await initializeCloud();
      }
    }catch(error){
      record('manual-retry-error:'+String(error?.message||error));
      try{cloudLoading=false;cloudError='Secure sign-in could not be restored. Check your connection and try again.';if(typeof s!=='undefined')s.v='home';render()}catch{}
    }
  };

  const observer=new MutationObserver(()=>syncAuxiliaryUi());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',event=>{syncAuxiliaryUi();if(event.persisted)arm(RESUME_LIMIT_MS,'pwa-resume-timeout')});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){syncAuxiliaryUi();try{if(typeof cloudLoading!=='undefined'&&cloudLoading)arm(RESUME_LIMIT_MS,'visibility-resume-timeout')}catch{}}});
  window.addEventListener('online',()=>{try{if(typeof cloudLoading!=='undefined'&&cloudLoading)arm(RESUME_LIMIT_MS,'online-recovery-timeout')}catch{}});

  arm();
  setTimeout(syncAuxiliaryUi,0);
})();
