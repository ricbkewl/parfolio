/* ParFolio v261 — recoverable systemwide Google Maps health/fallback guard.
   Google remains the preferred provider. Only confirmed authorization/project failures
   disable it for the current session; transient network/timeouts may retry normally. */
(function(){
  let hardUnhealthy=false,handling=false;
  const originalLoad=window.loadGoogleMaps;

  function courseGreen(){
    try{
      const course=typeof selectedRoundCourse==='function'?selectedRoundCourse():null;
      const hole=Math.max(1,Number(s?.hole)||1);
      return course?.greens?.[hole-1]||null;
    }catch{return null}
  }

  function removeGoogleErrors(root=document){
    try{
      root.querySelectorAll?.('.gm-err-container,.gm-err-message,.gm-style-cc').forEach(node=>{
        const text=(node.textContent||'').toLowerCase();
        if(/can.t load google maps correctly|google maps.*error|development purposes only/.test(text))node.remove();
      });
    }catch{}
  }

  function fallbackCurrentSurface(){
    if(handling)return;handling=true;
    setTimeout(()=>{
      try{
        removeGoogleErrors();
        if(typeof s!=='undefined'&&s?.v==='mapCourse'&&typeof initMap==='function'){
          const container=document.getElementById('courseMap');
          if(container)container.innerHTML='';
          try{if(map){map.remove()}}catch{}
          try{map=null}catch{}
          initMap();
        }else if(typeof s!=='undefined'&&s?.v==='round'){
          const green=courseGreen();
          const container=document.getElementById('liveHoleMap');
          if(container)container.innerHTML='';
          document.querySelector('.live-map-viewport')?.classList.remove('google-map-active');
          if(green&&typeof initInlineHoleMapLeaflet==='function')initInlineHoleMapLeaflet(green);
        }
      }catch(error){console.warn('ParFolio map fallback recovery failed',error)}
      handling=false;
    },0);
  }

  function isHardFailure(reason=''){
    return /auth|referer|referrer|billing|invalid.?key|api.?project|not.?allowed|denied|development purposes only/i.test(String(reason));
  }

  function markUnhealthy(reason){
    if(!isHardFailure(reason)){
      console.warn('ParFolio Google Maps transient failure; fallback allowed and future retries remain enabled:',reason||'temporary loading failure');
      return;
    }
    if(hardUnhealthy)return;
    hardUnhealthy=true;
    window.PARFOLIO_GOOGLE_MAPS_UNHEALTHY=true;
    console.warn('ParFolio disabled Google Maps for this session after confirmed authorization failure:',reason||'authorization failure');
    fallbackCurrentSurface();
  }

  window.parfolioMarkGoogleMapsUnhealthy=markUnhealthy;
  window.parfolioResetGoogleMapsHealth=function(){hardUnhealthy=false;window.PARFOLIO_GOOGLE_MAPS_UNHEALTHY=false;};

  window.loadGoogleMaps=function(){
    if(hardUnhealthy||window.PARFOLIO_GOOGLE_MAPS_UNHEALTHY)return Promise.reject(new Error('Google Maps disabled after confirmed authorization failure'));
    if(typeof originalLoad!=='function')return Promise.reject(new Error('Google Maps loader unavailable'));
    return Promise.resolve().then(()=>originalLoad()).then(maps=>{
      hardUnhealthy=false;window.PARFOLIO_GOOGLE_MAPS_UNHEALTHY=false;return maps;
    }).catch(error=>{markUnhealthy(error?.message||error);throw error});
  };

  const previousAuthFailure=window.gm_authFailure;
  window.gm_authFailure=function(){
    try{if(typeof previousAuthFailure==='function')previousAuthFailure()}catch{}
    markUnhealthy('Google Maps authentication failed');
  };

  function inspect(){
    if(hardUnhealthy)return;
    const errorNode=document.querySelector('.gm-err-container,.gm-err-message');
    const errorText=(errorNode?.textContent||'').toLowerCase();
    if(errorNode&&/can.t load google maps correctly|google maps.*error|development purposes only/.test(errorText))markUnhealthy(errorText||'Google Maps authorization error');
  }

  let inspectionPending=false;
  const isErrorSurface=node=>node?.nodeType===1&&(node.matches?.('.gm-err-container,.gm-err-message')||node.querySelector?.('.gm-err-container,.gm-err-message'));
  const observer=new MutationObserver(records=>{
    if(hardUnhealthy||inspectionPending)return;
    const relevant=records.some(record=>isErrorSurface(record.target)||[...record.addedNodes].some(isErrorSurface));
    if(!relevant)return;
    inspectionPending=true;requestAnimationFrame(()=>{inspectionPending=false;inspect()});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('online',()=>{if(!hardUnhealthy)window.PARFOLIO_GOOGLE_MAPS_UNHEALTHY=false});
  window.addEventListener('error',event=>{
    const message=String(event?.message||'');
    if(/google maps|maps javascript api|referernotallowed|billingnotenabled|invalidkeymaperror|apiprojectmaperror/i.test(message))markUnhealthy(message);
  },true);
  setTimeout(inspect,1200);
})();
