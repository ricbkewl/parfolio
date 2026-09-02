/* ParFolio v202 — systemwide visible TEE / CENTER endpoint markers. */
(function(){
  const GOOGLE_TEE='#d8a93e';
  const GOOGLE_CENTER='#176b45';

  function endpointLeafletIcon(label,kind){
    const bg=kind==='tee'?'rgba(116,83,19,.94)':'rgba(16,88,56,.94)';
    const symbol=kind==='tee'?'●':'⚑';
    return L.divIcon({
      className:'parfolio-endpoint-label',
      html:`<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border:2px solid rgba(255,255,255,.96);border-radius:999px;background:${bg};color:#fff;font:800 11px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.08em;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,.38);text-shadow:0 1px 2px rgba(0,0,0,.4)"><i style="font-style:normal;color:#f7d46b">${symbol}</i>${label}</span>`,
      iconSize:[1,1],iconAnchor:[0,0]
    });
  }

  if(typeof googleCircleMarker==='function'){
    googleCircleMarker=function(rawMap,position,fillColor,radius=9,title=''){
      const endpoint=title==='Green center'?'CENTER':(/^Aim\s/.test(title)?null:(String(title||'').toLowerCase().includes('tee')?'TEE':null));
      const label=endpoint?{text:endpoint,color:'#fff',fontSize:'11px',fontWeight:'800'}:null;
      const marker=createGoogleMarker({
        map:rawMap,
        position:googlePoint(position),
        title,
        clickable:false,
        zIndex:endpoint?1080:900,
        label,
        icon:{path:google.maps.SymbolPath.CIRCLE,scale:endpoint?11:radius,fillColor,fillOpacity:1,strokeColor:'#fff',strokeOpacity:1,strokeWeight:3}
      });
      rememberGoogleOverlay(marker);
      return marker;
    };
  }

  if(typeof initInlineHoleMapLeaflet==='function'){
    const priorLeaflet=initInlineHoleMapLeaflet;
    initInlineHoleMapLeaflet=function(green){
      const result=priorLeaflet.apply(this,arguments);
      try{
        if(inlineHoleMap&&selectedTee(green)&&green?.center&&window.L){
          L.marker(selectedTee(green),{icon:endpointLeafletIcon('TEE','tee'),interactive:false,keyboard:false,zIndexOffset:1050}).addTo(inlineHoleMap);
          L.marker(green.center,{icon:endpointLeafletIcon('CENTER','center'),interactive:false,keyboard:false,zIndexOffset:1050}).addTo(inlineHoleMap);
        }
      }catch(error){console.warn('ParFolio endpoint labels unavailable',error)}
      return result;
    };
  }

  if(s?.v==='round'&&!s?.done)setTimeout(()=>render(),0);
})();
