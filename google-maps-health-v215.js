/* ParFolio v215 — systemwide Google Maps health/fallback guard.
   A rejected browser key/project/referrer must never leave Google's error overlay
   covering the editor or live round. Mark Google unhealthy once per session and
   route all later map initialization through the existing Leaflet/OSM fallbacks. */
(function(){
  let unhealthy=false, handling=false;
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
          try{if(map){map.remove()} }catch{}
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

  function markUnhealthy(reason){
    if(unhealthy)return;
    unhealthy=true;
    window.PARFOLIO_GOOGLE_MAPS_UNHEALTHY=true;
    console.warn('ParFolio disabled Google Maps for this session:',reason||'authorization/rendering failure');
    fallbackCurrentSurface();
  }

  window.parfolioMarkGoogleMapsUnhealthy=markUnhealthy;

  window.loadGoogleMaps=function(){
    if(unhealthy||window.PARFOLIO_GOOGLE_MAPS_UNHEALTHY)return Promise.reject(new Error('Google Maps disabled after authorization/rendering failure'));
    if(typeof originalLoad!=='function')return Promise.reject(new Error('Google Maps loader unavailable'));
    return Promise.resolve().then(()=>originalLoad()).catch(error=>{markUnhealthy(error?.message||error);throw error});
  };

  const previousAuthFailure=window.gm_authFailure;
  window.gm_authFailure=function(){
    try{if(typeof previousAuthFailure==='function')previousAuthFailure()}catch{}
    markUnhealthy('Google Maps authentication failed');
  };

  function inspect(){
    if(unhealthy)return;
    const bodyText=(document.body?.innerText||'').toLowerCase();
    const errorNode=document.querySelector('.gm-err-container,.gm-err-message');
    if(errorNode||/this page can.t load google maps correctly|for development purposes only/.test(bodyText))markUnhealthy('Google Maps rejected browser authorization');
  }

  const observer=new MutationObserver(()=>{if(!unhealthy)requestAnimationFrame(inspect)});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('error',event=>{
    const message=String(event?.message||'');
    if(/google maps|maps javascript api|referernotallowed|billingnotenabled|invalidkeymaperror|apiprojectmaperror/i.test(message))markUnhealthy(message);
  },true);
  setTimeout(inspect,1200);
})();
