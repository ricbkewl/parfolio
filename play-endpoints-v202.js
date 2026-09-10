/* ParFolio v258 — hard suppression for retired tee / green-center endpoint markers.
   The route geometry remains in data and continues to drive camera, yardage, planner,
   navigation, and 3D orientation. Only the visible endpoint marker graphics are blocked. */
(function(){
  function isRetiredEndpointTitle(title=''){
    const value=String(title||'').trim().toLowerCase();
    if(!value)return false;
    if(value==='green center'||value==='center'||value==='green centre')return true;
    if(value==='tee'||value.endsWith(' tee')||value.startsWith('tee ')||value.includes(' tee '))return true;
    return false;
  }

  /* Google round view: suppress endpoint marker creation at the shared marker helper.
     Aim points, golfer marker, and planner marker are unaffected. */
  if(typeof googleCircleMarker==='function'){
    const priorGoogleCircleMarker=googleCircleMarker;
    googleCircleMarker=function(rawMap,position,fillColor,radius=9,title=''){
      if(isRetiredEndpointTitle(title)){
        return {raw:null,setLatLng(){},getLatLng(){return position||null},setMap(){},setVisible(){},setIcon(){}};
      }
      return priorGoogleCircleMarker.apply(this,arguments);
    };
  }

  /* Leaflet round view still creates its base tee/center circles inside the initializer.
     Remove only circles at the exact selected tee and green center after initialization. */
  if(typeof initInlineHoleMapLeaflet==='function'){
    const priorLeaflet=initInlineHoleMapLeaflet;
    initInlineHoleMapLeaflet=function(green){
      const result=priorLeaflet.apply(this,arguments);
      try{
        if(!inlineHoleMap||!window.L)return result;
        const tee=typeof selectedTee==='function'?selectedTee(green):null;
        const center=green?.center||null;
        const same=(a,b)=>a&&b&&Math.abs(Number(a.lat)-Number(b.lat))<1e-7&&Math.abs(Number(a.lng)-Number(b.lng))<1e-7;
        inlineHoleMap.eachLayer?.(layer=>{
          if(!(layer instanceof L.CircleMarker))return;
          const p=layer.getLatLng?.();
          if(same(p,tee)||same(p,center))inlineHoleMap.removeLayer(layer);
        });
      }catch(error){console.warn('ParFolio endpoint marker suppression unavailable',error)}
      return result;
    };
  }
})();
