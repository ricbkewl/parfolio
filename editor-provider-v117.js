/* Version 117: four-way course-editor basemap selector.
   MapTiler Map/Satellite + Google Map/Satellite with shared center/zoom and markers. */
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

  function editorMapButtons(){
    const provider=draft?.mapProvider||'maptiler',style=draft?.mapStyle||'satellite';
    return `<div class="editor-provider-toggle" aria-label="Course editor map source">
      <div><small>MAPTILER</small><button class="${provider==='maptiler'&&style==='street'?'on':''}" onclick="setEditorBasemap('maptiler','street')">Map</button><button class="${provider==='maptiler'&&style==='satellite'?'on':''}" onclick="setEditorBasemap('maptiler','satellite')">Satellite</button></div>
      <div><small>GOOGLE</small><button class="${provider==='google'&&style==='street'?'on':''}" onclick="setEditorBasemap('google','street')">Map</button><button class="${provider==='google'&&style==='satellite'?'on':''}" onclick="setEditorBasemap('google','satellite')">Satellite</button></div>
    </div>`;
  }

  const priorMapCourse117=mapCourse;
  mapCourse=function(){
    if(draft&&!draft.mapProvider)draft.mapProvider='maptiler';
    if(draft&&!draft.mapStyle)draft.mapStyle='satellite';
    priorMapCourse117();
    const old=document.querySelector('.map-layer-toggle');
    if(old)old.outerHTML=editorMapButtons();
    const brand=app.querySelector('.course-editor-brand small');
    if(brand)brand.textContent='MapTiler + Google comparison · phone & desktop ready';
  };

  window.setEditorBasemap=function(provider,style){
    if(!draft)return;
    if(provider==='google'&&!GOOGLE_MAPS_API_KEY){alert('Google Maps is not configured.');return;}
    rememberEditorView();
    draft.mapProvider=provider==='google'?'google':'maptiler';
    draft.mapStyle=style==='street'?'street':'satellite';
    if(map){try{map.remove()}catch{}map=null;}
    const container=$('courseMap');if(container)container.innerHTML='';
    document.querySelectorAll('.editor-provider-toggle button').forEach(button=>button.classList.remove('on'));
    setTimeout(initMap,0);
    const selected=[...document.querySelectorAll('.editor-provider-toggle>div')].find(group=>group.querySelector('small')?.textContent.toLowerCase()===draft.mapProvider)?.querySelectorAll('button');
    selected?.forEach(button=>button.classList.toggle('on',button.textContent.trim().toLowerCase()===(draft.mapStyle==='street'?'map':'satellite')));
  };

  /* Keep compatibility with older calls. */
  setMapStyle=function(style){setEditorBasemap(draft?.mapProvider||'maptiler',style)};

  initMap=async function(){
    const container=$('courseMap');if(!container||!draft)return;
    const g=draft.greens[draft.mapHole-1],state=editorView();if(!state)return;
    const {point:view,zoom}=state;
    const colors={tee:'#d8a93e',tee_black:'#111',tee_blue:'#2571d9',tee_white:'#f5f5f5',tee_red:'#d93636',aim1:'#c68b2c',aim2:'#9b6c22',front:'#f4a340',center:'#176b45',back:'#174f9c'};
    const provider=draft.mapProvider||'maptiler',style=draft.mapStyle||'satellite';

    if(provider==='google'){
      try{
        await loadGoogleMaps();if($('courseMap')!==container||!draft)return;
        const rawMap=new google.maps.Map(container,{center:googlePoint(view),zoom,mapId:GOOGLE_MAP_ID,mapTypeId:style==='satellite'?'satellite':'roadmap',mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'greedy',clickableIcons:false,heading:0,tilt:0});
        map=googleMapFacade(rawMap,container);
        const route=holeRoute(g);if(route.length>1)new google.maps.Polyline({map:rawMap,path:route.map(googlePoint),strokeColor:'#d29f31',strokeWeight:4,strokeOpacity:.9});
        for(const [key,p] of mapEditorMarkerEntries(g))new google.maps.Marker({map:rawMap,position:googlePoint(p),title:markerName(key),icon:{path:google.maps.SymbolPath.CIRCLE,scale:key.startsWith('tee_')?7:8,fillColor:colors[key]||'#174f9c',fillOpacity:.95,strokeColor:key==='tee_white'?'#222':'#fff',strokeWeight:2}});
        rawMap.addListener('click',event=>{const p=event.latLng;if(!p)return;setMarkerPoint(draft.greens[draft.mapHole-1],draft.target,{lat:p.lat(),lng:p.lng()});draft.mapView={lat:p.lat(),lng:p.lng(),zoom:rawMap.getZoom()};render()});
        const message=$('mapMessage');if(message)message.textContent=`Google ${style==='street'?'Map':'Satellite'} · Tap to set ${markerName(draft.target)} for Hole ${draft.mapHole}.`;
        return;
      }catch(error){console.warn('Google editor map unavailable; returning to MapTiler.',error);draft.mapProvider='maptiler';}
    }

    if(!window.L)return;
    map=L.map(container,{zoomControl:true,attributionControl:true}).setView([view.lat,view.lng],zoom);
    const url=style==='satellite'
      ?`https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}@2x.jpg?key=${encodeURIComponent(MAPTILER_API_KEY)}`
      :`https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}@2x.png?key=${encodeURIComponent(MAPTILER_API_KEY)}`;
    L.tileLayer(url,{tileSize:256,maxZoom:22,crossOrigin:true,attribution:'<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> · © OpenStreetMap contributors'}).addTo(map);
    const route=holeRoute(g);if(route.length>1)L.polyline(route.map(p=>[p.lat,p.lng]),{color:'#d29f31',weight:4,opacity:.9,dashArray:'8 6'}).addTo(map);
    mapEditorMarkerEntries(g).forEach(([key,p])=>L.circleMarker([p.lat,p.lng],{radius:key.startsWith('tee_')?7:8,color:colors[key]||'#174f9c',fillColor:colors[key]||'#174f9c',fillOpacity:.92,weight:key==='tee_white'?3:2}).addTo(map).bindTooltip(markerName(key)));
    map.on('click',e=>{setMarkerPoint(draft.greens[draft.mapHole-1],draft.target,{lat:e.latlng.lat,lng:e.latlng.lng});draft.mapView={lat:e.latlng.lat,lng:e.latlng.lng,zoom:map.getZoom()};render()});
    const message=$('mapMessage');if(message)message.textContent=`MapTiler ${style==='street'?'Outdoor Map':'Satellite'} · Tap to set ${markerName(draft.target)} for Hole ${draft.mapHole}.`;
  };
})();
