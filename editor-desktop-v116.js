/* Version 116: MapTiler-first course editor, desktop mapping layout, scorecard logo */
(function(){
  const priorMapCourse=mapCourse;
  mapCourse=function(){
    priorMapCourse();
    app.classList.add('course-editor-wide');
    const title=app.querySelector('h1');
    if(title&&!title.previousElementSibling?.classList?.contains('course-editor-brand')){
      const brand=document.createElement('div');
      brand.className='course-editor-brand';
      brand.innerHTML='<img src="agape-golf-logo.png" alt="ATG"><span><b>Course Mapping Editor</b><small>MapTiler viewing · phone & desktop ready</small></span>';
      title.before(brand);
    }
    const street=[...document.querySelectorAll('.map-layer-toggle button')].find(b=>b.textContent.trim()==='Street');
    const sat=[...document.querySelectorAll('.map-layer-toggle button')].find(b=>b.textContent.trim()==='Satellite');
    if(street)street.textContent='Map';
    if(sat)sat.textContent='Satellite';
  };

  /* Course mapping deliberately uses Leaflet + MapTiler for clear flat cartography and satellite editing.
     Live-play Google Maps remains unchanged. */
  initMap=async function(){
    const container=$('courseMap');if(!container||!draft||!window.L)return;
    const g=draft.greens[draft.mapHole-1],existing=markerPoint(g,draft.target),any=g.center||g.aim1||g.aim2||g.tee||g.front||g.back;
    const fallback=draft.catalog_point||coursePreviewPoint(draft)||{lat:34.1,lng:-117.3};
    const view=draft.mapView||existing||any||fallback,zoom=draft.mapView?.zoom??(existing||any?18:17);
    map=L.map(container,{zoomControl:true,attributionControl:true}).setView([view.lat,view.lng],zoom);

    const style=draft.mapStyle==='street'?'outdoor-v2':'satellite';
    const url=style==='satellite'
      ?`https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}@2x.jpg?key=${encodeURIComponent(MAPTILER_API_KEY)}`
      :`https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}@2x.png?key=${encodeURIComponent(MAPTILER_API_KEY)}`;
    L.tileLayer(url,{tileSize:256,maxZoom:22,crossOrigin:true,attribution:'<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> · © OpenStreetMap contributors'}).addTo(map);

    const colors={tee:'#d8a93e',tee_black:'#111',tee_blue:'#2571d9',tee_white:'#f5f5f5',tee_red:'#d93636',aim1:'#c68b2c',aim2:'#9b6c22',front:'#f4a340',center:'#176b45',back:'#174f9c'};
    const route=holeRoute(g);if(route.length>1)L.polyline(route.map(p=>[p.lat,p.lng]),{color:'#d29f31',weight:4,opacity:.9,dashArray:'8 6'}).addTo(map);
    mapEditorMarkerEntries(g).forEach(([k,p])=>L.circleMarker([p.lat,p.lng],{radius:k.startsWith('tee_')?7:8,color:colors[k]||'#174f9c',fillColor:colors[k]||'#174f9c',fillOpacity:.92,weight:k==='tee_white'?3:2}).addTo(map).bindTooltip(markerName(k)));
    map.on('click',e=>{setMarkerPoint(draft.greens[draft.mapHole-1],draft.target,{lat:e.latlng.lat,lng:e.latlng.lng});draft.mapView={lat:e.latlng.lat,lng:e.latlng.lng,zoom:map.getZoom()};render()});
    const message=$('mapMessage');if(message)message.textContent=`MapTiler ${draft.mapStyle==='street'?'Outdoor map':'Satellite'} · Tap to set ${markerName(draft.target)} for Hole ${draft.mapHole}.`;
  };

  setMapStyle=function(style){
    draft.mapStyle=style==='street'?'street':'satellite';
    if(map){const center=map.getCenter();if(center)draft.mapView={lat:center.lat,lng:center.lng,zoom:map.getZoom()};try{map.remove()}catch{}map=null;}
    const container=$('courseMap');if(container){container.innerHTML='';initMap();}
    document.querySelectorAll('.map-layer-toggle button').forEach(button=>button.classList.toggle('on',(button.textContent.trim()==='Map'&&draft.mapStyle==='street')||(button.textContent.trim()==='Satellite'&&draft.mapStyle==='satellite')));
  };

  function addScorecardLogo(){
    if(!['recap','historyDetailView'].includes(s?.v))return;
    const heading=app.querySelector('h1');if(!heading||app.querySelector('.scorecard-atg-brand'))return;
    const brand=document.createElement('div');brand.className='scorecard-atg-brand';brand.innerHTML='<img src="agape-golf-logo.png" alt="ParFolio"><div><b>AGAPE TUMOUTOU GOLFERS</b><small>Play · Connect · Improve</small></div>';
    heading.parentElement?.insertBefore(brand,heading.parentElement.firstChild);
  }
  const priorRecap=recap;
  recap=function(){priorRecap();addScorecardLogo();};
  if(typeof historyDetailView==='function'){
    const priorHistoryDetail=historyDetailView;
    historyDetailView=function(){priorHistoryDetail();addScorecardLogo();};
  }
})();
