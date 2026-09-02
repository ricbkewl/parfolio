/* Version 178: ParFolio course editor uses Google Maps only.
   OpenStreetMap remains available elsewhere in ParFolio as a browsing fallback,
   but the admin mapping editor has one dependable map engine. */
(function(){
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
    return `<div class="editor-provider-toggle" aria-label="Course editor map style">
      <div><small>GOOGLE MAPS</small>
        <button class="${style==='street'?'on':''}" onclick="setEditorBasemap('google','street')">Map</button>
        <button class="${style==='satellite'?'on':''}" onclick="setEditorBasemap('google','satellite')">Satellite</button>
      </div>
    </div>`;
  }

  const priorMapCourse117=mapCourse;
  mapCourse=function(){
    normalizeProvider();
    priorMapCourse117();
    const old=document.querySelector('.map-layer-toggle');
    if(old)old.outerHTML=editorMapButtons();
    const existing=document.querySelector('.editor-provider-toggle');
    if(existing&&!existing.textContent.includes('GOOGLE MAPS'))existing.outerHTML=editorMapButtons();
    const brand=app.querySelector('.course-editor-brand small');
    if(brand)brand.textContent='Google Maps · ParFolio course mapping';
  };

  window.setEditorBasemap=function(provider,style){
    if(!draft)return;
    if(!GOOGLE_MAPS_API_KEY){alert('Google Maps is not configured for ParFolio.');return;}
    rememberEditorView();
    draft.mapProvider='google';
    draft.mapStyle=style==='street'?'street':'satellite';
    if(map){try{map.remove()}catch{}map=null;}
    const container=$('courseMap');if(container)container.innerHTML='';
    setTimeout(initMap,0);
  };

  setMapStyle=function(style){setEditorBasemap('google',style)};

  function showGoogleError(container,error){
    const msg=esc(error?.message||'Google Maps could not be loaded.');
    container.innerHTML=`<div style="height:100%;min-height:320px;display:grid;place-items:center;padding:24px;background:#eef5f0;color:#173126;text-align:center">
      <div><strong style="display:block;color:#145c3d;font-size:18px;margin-bottom:8px">Google Maps unavailable</strong>
      <div style="font-size:13px;opacity:.8;margin-bottom:14px">${msg}</div>
      <button class="primary" onclick="initMap()">Retry Google Maps</button></div></div>`;
    const message=$('mapMessage');if(message)message.textContent='Google Maps did not finish loading. Tap Retry Google Maps.';
  }

  function advancedMarkerContent(key,color){
    const el=document.createElement('div');
    el.title=markerName(key);
    el.style.cssText=`width:${key.startsWith('tee_')?14:16}px;height:${key.startsWith('tee_')?14:16}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)`;
    return el;
  }

  initMap=async function(){
    const container=$('courseMap');if(!container||!draft)return;
    normalizeProvider();
    const g=draft.greens[draft.mapHole-1],state=editorView();if(!state)return;
    const {point:view,zoom}=state;
    const colors={tee:'#d8a93e',tee_black:'#111',tee_blue:'#2571d9',tee_white:'#f5f5f5',tee_red:'#d93636',aim1:'#c68b2c',aim2:'#9b6c22',front:'#f4a340',center:'#176b45',back:'#174f9c'};
    const style=draft.mapStyle||'satellite';
    container.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#176b45;font-weight:700">Loading Google Maps…</div>';

    try{
      await loadGoogleMaps();
      if($('courseMap')!==container||!draft)return;
      const mapsNs=window.google?.maps;
      if(!mapsNs)throw new Error('Google Maps namespace unavailable');
      const mapsLib=typeof mapsNs.importLibrary==='function'?await mapsNs.importLibrary('maps'):mapsNs;
      let markerLib={};
      try{if(typeof mapsNs.importLibrary==='function')markerLib=await mapsNs.importLibrary('marker')}catch{}
      const MapCtor=mapsLib.Map||mapsNs.Map;
      const PolylineCtor=mapsLib.Polyline||mapsNs.Polyline;
      const MarkerCtor=mapsNs.Marker||markerLib.Marker;
      const AdvancedMarkerCtor=markerLib.AdvancedMarkerElement||mapsNs.marker?.AdvancedMarkerElement;
      const SymbolPath=mapsLib.SymbolPath||mapsNs.SymbolPath;
      if(typeof MapCtor!=='function')throw new Error('Google Maps Map constructor is unavailable');

      container.innerHTML='';
      const rawMap=new MapCtor(container,{center:googlePoint(view),zoom,...(GOOGLE_MAP_ID?{mapId:GOOGLE_MAP_ID}:{}),mapTypeId:style==='satellite'?'satellite':'roadmap',mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'greedy',clickableIcons:false,heading:0,tilt:0});
      map=googleMapFacade(rawMap,container);

      const route=holeRoute(g);
      if(route.length>1&&typeof PolylineCtor==='function')new PolylineCtor({map:rawMap,path:route.map(googlePoint),strokeColor:'#d29f31',strokeWeight:4,strokeOpacity:.9});

      for(const [key,p] of mapEditorMarkerEntries(g)){
        const color=colors[key]||'#174f9c';
        if(typeof MarkerCtor==='function'){
          new MarkerCtor({map:rawMap,position:googlePoint(p),title:markerName(key),icon:SymbolPath?{path:SymbolPath.CIRCLE,scale:key.startsWith('tee_')?7:8,fillColor:color,fillOpacity:.95,strokeColor:key==='tee_white'?'#222':'#fff',strokeWeight:2}:undefined});
        }else if(typeof AdvancedMarkerCtor==='function'){
          new AdvancedMarkerCtor({map:rawMap,position:googlePoint(p),title:markerName(key),content:advancedMarkerContent(key,color)});
        }
      }

      rawMap.addListener('click',event=>{
        const p=event.latLng;if(!p)return;
        setMarkerPoint(draft.greens[draft.mapHole-1],draft.target,{lat:p.lat(),lng:p.lng()});
        draft.mapView={lat:p.lat(),lng:p.lng(),zoom:rawMap.getZoom()};
        render();
      });
      const message=$('mapMessage');if(message)message.textContent=`Google ${style==='street'?'Map':'Satellite'} · Tap to set ${markerName(draft.target)} for Hole ${draft.mapHole}.`;
    }catch(error){
      console.error('ParFolio Google editor map failed',error);
      showGoogleError(container,error);
    }
  };
})();
