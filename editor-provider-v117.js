/* Version 180: Google Maps primary editor with automatic OpenStreetMap fallback.
   Google remains the preferred editor. If Google rejects the browser key/project
   or fails to render, ParFolio immediately switches the current editor to OSM so
   course mapping can continue without changing or losing course coordinates. */
(function(){
  let googleEditorContext=null;
  let fallbackActive=false;

  function editorView(){
    if(!draft)return null;
    const g=draft.greens?.[draft.mapHole-1]||{};
    const existing=markerPoint(g,draft.target),any=g.center||g.aim1||g.aim2||g.tee||g.front||g.back;
    const fallback=draft.catalog_point||coursePreviewPoint(draft)||{lat:34.1,lng:-117.3};
    return {point:draft.mapView||existing||any||fallback,zoom:draft.mapView?.zoom??(existing||any?18:17)};
  }

  function rememberEditorView(){
    if(!map||!draft)return;
    try{
      const center=map.getCenter();
      if(center){
        const lat=typeof center.lat==='function'?center.lat():center.lat;
        const lng=typeof center.lng==='function'?center.lng():center.lng;
        draft.mapView={lat:Number(lat),lng:Number(lng),zoom:Number(map.getZoom())};
      }
    }catch{}
  }

  function normalizeProvider(){
    if(!draft)return;
    draft.mapProvider='google';
    if(!draft.mapStyle)draft.mapStyle='satellite';
  }

  function editorMapButtons(){
    normalizeProvider();
    const style=draft?.mapStyle||'satellite';
    const fallback=fallbackActive?'<small style="margin-left:8px;color:#9a6a13">OPEN MAP FALLBACK ACTIVE</small>':'';
    return `<div class="editor-provider-toggle" aria-label="Course editor map style"><div><small>GOOGLE MAPS</small>${fallback}<button class="${!fallbackActive&&style==='street'?'on':''}" onclick="setEditorBasemap('google','street')">Map</button><button class="${!fallbackActive&&style==='satellite'?'on':''}" onclick="setEditorBasemap('google','satellite')">Satellite</button></div></div>`;
  }

  const priorMapCourse117=mapCourse;
  mapCourse=function(){
    normalizeProvider();
    priorMapCourse117();
    const old=document.querySelector('.map-layer-toggle');
    if(old)old.outerHTML=editorMapButtons();
    const existing=document.querySelector('.editor-provider-toggle');
    if(existing)existing.outerHTML=editorMapButtons();
    const brand=app.querySelector('.course-editor-brand small');
    if(brand)brand.textContent=fallbackActive?'OpenStreetMap fallback · Google Maps authorization pending':'Google Maps · ParFolio course mapping';
  };

  window.setEditorBasemap=function(provider,style){
    if(!draft)return;
    rememberEditorView();
    fallbackActive=false;
    draft.mapProvider='google';
    draft.mapStyle=style==='street'?'street':'satellite';
    if(map){try{map.remove()}catch{}map=null;}
    const container=$('courseMap');if(container)container.innerHTML='';
    setTimeout(initMap,0);
  };

  setMapStyle=function(style){setEditorBasemap('google',style)};

  function drawOpenMapFallback(container,g,view,zoom,colors,reason){
    if(!container||!draft)return;
    if(!window.L){
      container.innerHTML='<div style="height:100%;min-height:320px;display:grid;place-items:center;padding:24px;background:#eef5f0;color:#173126;text-align:center"><div><strong>Map unavailable</strong><div style="font-size:13px;margin-top:8px">Google Maps is not authorized and the backup map library did not load.</div></div></div>';
      return;
    }
    fallbackActive=true;
    try{if(map){map.remove()} }catch{}
    map=null;
    container.innerHTML='';
    const leaflet=L.map(container,{zoomControl:true,attributionControl:true}).setView([Number(view.lat),Number(view.lng)],Math.min(20,Number(zoom)||17));
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap contributors'}).addTo(leaflet);
    map=leaflet;
    const route=holeRoute(g);
    if(route.length>1)L.polyline(route.map(p=>[p.lat,p.lng]),{color:'#d29f31',weight:4,opacity:.9,dashArray:'8 6'}).addTo(leaflet);
    for(const [key,p] of mapEditorMarkerEntries(g)){
      const fill=colors[key]||'#174f9c';
      L.circleMarker([p.lat,p.lng],{radius:key.startsWith('tee_')?7:8,color:key==='tee_white'?'#222':'#fff',fillColor:fill,fillOpacity:.95,weight:2}).addTo(leaflet).bindTooltip(markerName(key));
    }
    leaflet.on('click',e=>{
      setMarkerPoint(draft.greens[draft.mapHole-1],draft.target,{lat:e.latlng.lat,lng:e.latlng.lng});
      draft.mapView={lat:e.latlng.lat,lng:e.latlng.lng,zoom:leaflet.getZoom()};
      render();
    });
    const message=$('mapMessage');
    if(message)message.textContent=`OpenStreetMap fallback · ${reason} · Tap to set ${markerName(draft.target)} for Hole ${draft.mapHole}.`;
    const controls=document.querySelector('.editor-provider-toggle');if(controls)controls.outerHTML=editorMapButtons();
    const brand=app.querySelector('.course-editor-brand small');if(brand)brand.textContent='OpenStreetMap fallback · Google Maps authorization pending';
  }

  const previousAuthFailure=window.gm_authFailure;
  window.gm_authFailure=function(){
    try{if(typeof previousAuthFailure==='function')previousAuthFailure()}catch{}
    const ctx=googleEditorContext,container=$('courseMap');
    console.error('Google Maps authentication failed for ParFolio.');
    if(ctx&&container&&draft)drawOpenMapFallback(container,ctx.g,ctx.view,ctx.zoom,ctx.colors,'Google Maps authorization failed');
  };

  initMap=async function(){
    const container=$('courseMap');if(!container||!draft)return;
    normalizeProvider();
    const g=draft.greens[draft.mapHole-1],state=editorView();if(!state)return;
    const {point:view,zoom}=state;
    const colors={tee:'#d8a93e',tee_black:'#111',tee_blue:'#2571d9',tee_white:'#f5f5f5',tee_red:'#d93636',aim1:'#c68b2c',aim2:'#9b6c22',front:'#f4a340',center:'#176b45',back:'#174f9c'};
    const style=draft.mapStyle||'satellite';
    fallbackActive=false;
    googleEditorContext={g,view,zoom,colors};
    container.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#176b45;font-weight:700">Loading Google Maps…</div>';

    try{
      const mapsNs=await loadGoogleMaps();
      if($('courseMap')!==container||!draft)return;
      if(typeof mapsNs?.Map!=='function')throw new Error('Google Maps Map constructor is unavailable');
      if(fallbackActive)return;
      container.innerHTML='';
      const rawMap=new mapsNs.Map(container,{center:googlePoint(view),zoom,mapTypeId:style==='satellite'?'satellite':'roadmap',mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'greedy',clickableIcons:false});
      map=googleMapFacade(rawMap,container);
      const route=holeRoute(g);
      if(route.length>1&&typeof mapsNs.Polyline==='function')new mapsNs.Polyline({map:rawMap,path:route.map(googlePoint),strokeColor:'#d29f31',strokeWeight:4,strokeOpacity:.9});
      for(const [key,p] of mapEditorMarkerEntries(g)){
        const color=colors[key]||'#174f9c';
        if(typeof mapsNs.Marker==='function')new mapsNs.Marker({map:rawMap,position:googlePoint(p),title:markerName(key),icon:mapsNs.SymbolPath?{path:mapsNs.SymbolPath.CIRCLE,scale:key.startsWith('tee_')?7:8,fillColor:color,fillOpacity:.95,strokeColor:key==='tee_white'?'#222':'#fff',strokeWeight:2}:undefined});
      }
      rawMap.addListener('click',event=>{
        const p=event.latLng;if(!p)return;
        setMarkerPoint(draft.greens[draft.mapHole-1],draft.target,{lat:p.lat(),lng:p.lng()});
        draft.mapView={lat:p.lat(),lng:p.lng(),zoom:rawMap.getZoom()};render();
      });
      const message=$('mapMessage');if(message)message.textContent=`Google ${style==='street'?'Map':'Satellite'} · Tap to set ${markerName(draft.target)} for Hole ${draft.mapHole}.`;
      setTimeout(()=>{
        if(fallbackActive||$('courseMap')!==container)return;
        const googleFailureText=container.textContent||'';
        if(/oops!?\s*something went wrong|didn.t load google maps correctly/i.test(googleFailureText))drawOpenMapFallback(container,g,view,zoom,colors,'Google Maps rendering was rejected');
      },1400);
    }catch(error){
      console.error('ParFolio Google editor map failed',error);
      drawOpenMapFallback(container,g,view,zoom,colors,'Google Maps could not load');
    }
  };
})();
