/* Version 117: ParFolio course-editor basemap selector.
   Uses ParFolio's own MapTiler account when configured; otherwise Google/OSM remain available. */
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
    if(draft.mapProvider==='maptiler'&&!MAPTILER_API_KEY)draft.mapProvider=GOOGLE_MAPS_API_KEY?'google':'osm';
    if(!draft.mapProvider)draft.mapProvider=MAPTILER_API_KEY?'maptiler':(GOOGLE_MAPS_API_KEY?'google':'osm');
  }

  function editorMapButtons(){
    normalizeProvider();
    const provider=draft?.mapProvider||'osm',style=draft?.mapStyle||'satellite';
    const maptiler=MAPTILER_API_KEY?`<div><small>MAPTILER</small><button class="${provider==='maptiler'&&style==='street'?'on':''}" onclick="setEditorBasemap('maptiler','street')">Map</button><button class="${provider==='maptiler'&&style==='satellite'?'on':''}" onclick="setEditorBasemap('maptiler','satellite')">Satellite</button></div>`:'';
    const google=GOOGLE_MAPS_API_KEY?`<div><small>GOOGLE</small><button class="${provider==='google'&&style==='street'?'on':''}" onclick="setEditorBasemap('google','street')">Map</button><button class="${provider==='google'&&style==='satellite'?'on':''}" onclick="setEditorBasemap('google','satellite')">Satellite</button></div>`:'';
    const osm=`<div><small>OPEN MAP</small><button class="${provider==='osm'?'on':''}" onclick="setEditorBasemap('osm','street')">Map</button></div>`;
    return `<div class="editor-provider-toggle" aria-label="Course editor map source">${maptiler}${google}${osm}</div>`;
  }

  const priorMapCourse117=mapCourse;
  mapCourse=function(){
    normalizeProvider();
    if(draft&&!draft.mapStyle)draft.mapStyle='satellite';
    priorMapCourse117();
    const old=document.querySelector('.map-layer-toggle');
    if(old)old.outerHTML=editorMapButtons();
    const brand=app.querySelector('.course-editor-brand small');
    if(brand)brand.textContent=MAPTILER_API_KEY?'MapTiler + Google comparison · phone & desktop ready':'Google + OpenStreetMap · phone & desktop ready';
  };

  window.setEditorBasemap=function(provider,style){
    if(!draft)return;
    if(provider==='google'&&!GOOGLE_MAPS_API_KEY){alert('Google Maps is not configured.');return;}
    if(provider==='maptiler'&&!MAPTILER_API_KEY){alert('MapTiler is not configured for ParFolio.');return;}
    rememberEditorView();
    draft.mapProvider=provider==='maptiler'?'maptiler':provider==='google'?'google':'osm';
    draft.mapStyle=provider==='osm'?'street':(style==='street'?'street':'satellite');
    if(map){try{map.remove()}catch{}map=null;}
    const container=$('courseMap');if(container)container.innerHTML='';
    setTimeout(initMap,0);
  };

  setMapStyle=function(style){normalizeProvider();setEditorBasemap(draft?.mapProvider||'osm',style)};

  function drawLeafletEditor(container,g,view,zoom,provider,style,colors){
    if(!window.L)return;
    map=L.map(container,{zoomControl:true,attributionControl:true}).setView([view.lat,view.lng],zoom);
    if(provider==='maptiler'&&MAPTILER_API_KEY){
      const url=style==='satellite'
        ?`https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}@2x.jpg?key=${encodeURIComponent(MAPTILER_API_KEY)}`
        :`https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}@2x.png?key=${encodeURIComponent(MAPTILER_API_KEY)}`;
      L.tileLayer(url,{tileSize:256,maxZoom:22,crossOrigin:true,attribution:'<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> · © OpenStreetMap contributors'}).addTo(map);
    }else{
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap contributors'}).addTo(map);
    }
    const route=holeRoute(g);if(route.length>1)L.polyline(route.map(p=>[p.lat,p.lng]),{color:'#d29f31',weight:4,opacity:.9,dashArray:'8 6'}).addTo(map);
    mapEditorMarkerEntries(g).forEach(([key,p])=>L.circleMarker([p.lat,p.lng],{radius:key.startsWith('tee_')?7:8,color:colors[key]||'#174f9c',fillColor:colors[key]||'#174f9c',fillOpacity:.92,weight:key==='tee_white'?3:2}).addTo(map).bindTooltip(markerName(key)));
    map.on('click',e=>{setMarkerPoint(draft.greens[draft.mapHole-1],draft.target,{lat:e.latlng.lat,lng:e.latlng.lng});draft.mapView={lat:e.latlng.lat,lng:e.latlng.lng,zoom:map.getZoom()};render()});
    const message=$('mapMessage');if(message)message.textContent=provider==='maptiler'?`MapTiler ${style==='street'?'Outdoor Map':'Satellite'} · Tap to set ${markerName(draft.target)} for Hole ${draft.mapHole}.`:`OpenStreetMap · Tap to set ${markerName(draft.target)} for Hole ${draft.mapHole}.`;
  }

  initMap=async function(){
    const container=$('courseMap');if(!container||!draft)return;
    normalizeProvider();
    const g=draft.greens[draft.mapHole-1],state=editorView();if(!state)return;
    const {point:view,zoom}=state;
    const colors={tee:'#d8a93e',tee_black:'#111',tee_blue:'#2571d9',tee_white:'#f5f5f5',tee_red:'#d93636',aim1:'#c68b2c',aim2:'#9b6c22',front:'#f4a340',center:'#176b45',back:'#174f9c'};
    const provider=draft.mapProvider||'osm',style=draft.mapStyle||'street';

    if(provider==='google'){
      try{
        await loadGoogleMaps();if($('courseMap')!==container||!draft)return;
        const rawMap=new google.maps.Map(container,{center:googlePoint(view),zoom,...(GOOGLE_MAP_ID?{mapId:GOOGLE_MAP_ID}:{}),mapTypeId:style==='satellite'?'satellite':'roadmap',mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'greedy',clickableIcons:false,heading:0,tilt:0});
        map=googleMapFacade(rawMap,container);
        const route=holeRoute(g);if(route.length>1)new google.maps.Polyline({map:rawMap,path:route.map(googlePoint),strokeColor:'#d29f31',strokeWeight:4,strokeOpacity:.9});
        for(const [key,p] of mapEditorMarkerEntries(g))new google.maps.Marker({map:rawMap,position:googlePoint(p),title:markerName(key),icon:{path:google.maps.SymbolPath.CIRCLE,scale:key.startsWith('tee_')?7:8,fillColor:colors[key]||'#174f9c',fillOpacity:.95,strokeColor:key==='tee_white'?'#222':'#fff',strokeWeight:2}});
        rawMap.addListener('click',event=>{const p=event.latLng;if(!p)return;setMarkerPoint(draft.greens[draft.mapHole-1],draft.target,{lat:p.lat(),lng:p.lng()});draft.mapView={lat:p.lat(),lng:p.lng(),zoom:rawMap.getZoom()};render()});
        const message=$('mapMessage');if(message)message.textContent=`Google ${style==='street'?'Map':'Satellite'} · Tap to set ${markerName(draft.target)} for Hole ${draft.mapHole}.`;
        return;
      }catch(error){console.warn('Google editor map unavailable; using OpenStreetMap.',error);draft.mapProvider='osm';draft.mapStyle='street';drawLeafletEditor(container,g,view,zoom,'osm','street',colors);return;}
    }

    drawLeafletEditor(container,g,view,zoom,provider,style,colors);
  };
})();
