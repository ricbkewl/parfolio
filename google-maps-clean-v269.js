/* ParFolio v269 — clean-room Google Maps renderer.
   Google Maps is the only map provider. No Leaflet, OpenStreetMap, MapTiler,
   Map ID, vector/3D camera, Advanced Markers, flyover, or provider fallback. */
(function(){
  let mapsPromise=null,runtimeConfigPromise=null,authFailed=false;
  const diagnostics=[];
  const MAX_DIAG=60;
  const previewMaps=[];

  function record(stage,detail=''){
    const item={time:new Date().toISOString(),stage,detail:String(detail||'')};
    diagnostics.push(item);if(diagnostics.length>MAX_DIAG)diagnostics.shift();
    window.PARFOLIO_MAP_DIAGNOSTICS=diagnostics.slice();
    try{localStorage.parfolioMapDiagnostics=JSON.stringify(diagnostics.slice(-30))}catch{}
    if(stage.includes('FAIL')||stage.includes('ERROR'))console.warn('[ParFolio Google]',stage,detail);else console.info('[ParFolio Google]',stage,detail);
  }
  window.parfolioMapDiagnostics=()=>diagnostics.slice();
  window.parfolioClearMapDiagnostics=()=>{diagnostics.length=0;try{delete localStorage.parfolioMapDiagnostics;delete localStorage.parfolioMapLastFailure}catch{}};

  function cleanPoint(value){
    if(!value)return null;
    const lat=Number(value.lat),lng=Number(value.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
  }

  function showGoogleError(container,error,stage='GOOGLE_MAP_ERROR'){
    const message=error?.message||String(error||'Google Maps could not be loaded.');
    record(stage,message);
    window.PARFOLIO_LAST_MAP_ERROR=message;
    try{localStorage.parfolioMapLastFailure=JSON.stringify({time:new Date().toISOString(),stage,message})}catch{}
    if(!container)return;
    container.replaceChildren();
    const panel=document.createElement('div');
    panel.className='parfolio-google-error';
    panel.style.cssText='height:100%;min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;background:#12271f;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;box-sizing:border-box';
    const title=document.createElement('b');title.textContent='Google Maps unavailable';title.style.cssText='font-size:18px;margin-bottom:8px';
    const text=document.createElement('span');text.textContent='ParFolio uses Google Maps only. Check your connection and try again.';text.style.cssText='max-width:320px;opacity:.88;font-size:13px;line-height:1.45';
    const code=document.createElement('small');code.textContent=`${stage}: ${message}`;code.style.cssText='max-width:340px;margin-top:12px;opacity:.62;font-size:10px;line-height:1.35;word-break:break-word';
    panel.append(title,text,code);container.append(panel);
    const label=document.querySelector('.forward-label');if(label)label.textContent='GOOGLE MAPS UNAVAILABLE';
    document.querySelector('.live-map-viewport')?.classList.remove('google-map-active');
  }

  window.gm_authFailure=function(){
    authFailed=true;window.PARFOLIO_GOOGLE_AUTH_FAILED=true;
    const error=new Error('Google Maps authorization failed. Verify the ParFolio Vercel domain is allowed by the browser key and that Maps JavaScript API billing is active.');
    showGoogleError(document.getElementById('liveHoleMap'),error,'GOOGLE_AUTH_FAIL');
  };

  function runtimeKey(){return String(window.PARFOLIO_GOOGLE_MAPS_API_KEY||'').trim()}
  function loadRuntimeConfig(){
    const existing=runtimeKey();if(existing)return Promise.resolve(existing);
    if(runtimeConfigPromise)return runtimeConfigPromise;
    runtimeConfigPromise=new Promise((resolve,reject)=>{
      record('RUNTIME_CONFIG_START');
      const old=document.querySelector('script[data-parfolio-runtime-config-clean="1"]');if(old)old.remove();
      const script=document.createElement('script');script.dataset.parfolioRuntimeConfigClean='1';
      script.src=`/api/runtime-config?v=${Date.now()}`;script.async=true;
      script.onload=()=>{
        const key=runtimeKey();
        if(!window.PARFOLIO_GOOGLE_MAPS_CONFIGURED||!key){runtimeConfigPromise=null;reject(new Error('Vercel runtime config did not provide the Google Maps browser key'));return}
        record('RUNTIME_CONFIG_OK');resolve(key);
      };
      script.onerror=()=>{runtimeConfigPromise=null;reject(new Error('Vercel runtime config request failed'))};
      document.head.appendChild(script);
    });
    return runtimeConfigPromise;
  }

  function googleReady(){return typeof window.google?.maps?.Map==='function'}
  window.loadGoogleMaps=function(){
    if(authFailed)return Promise.reject(new Error('Google Maps authorization failed'));
    if(googleReady())return Promise.resolve(window.google.maps);
    if(mapsPromise)return mapsPromise;
    mapsPromise=loadRuntimeConfig().then(key=>new Promise((resolve,reject)=>{
      const callback='__parfolioGoogleCleanReady269';let settled=false;
      record('GOOGLE_API_START');
      const fail=message=>{if(settled)return;settled=true;mapsPromise=null;try{delete window[callback]}catch{}record('GOOGLE_API_FAIL',message);reject(new Error(message))};
      window[callback]=()=>{
        if(authFailed){fail('Google Maps authorization failed');return}
        if(!googleReady()){fail('Google callback fired before google.maps.Map existed');return}
        settled=true;try{delete window[callback]}catch{}record('GOOGLE_API_OK');resolve(window.google.maps);
      };
      document.querySelectorAll('script[data-parfolio-google-clean="1"],script[data-parfolio-google-base="1"]').forEach(node=>node.remove());
      const script=document.createElement('script');script.dataset.parfolioGoogleClean='1';
      script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${encodeURIComponent(callback)}`;
      script.async=true;script.defer=true;script.onerror=()=>fail('Google Maps JavaScript API network load failed');document.head.appendChild(script);
      setTimeout(()=>{if(!settled)(authFailed?fail('Google Maps authorization failed'):(googleReady()?window[callback]?.():fail('Google Maps API timeout after 15 seconds')))},15000);
    })).catch(error=>{mapsPromise=null;throw error});
    return mapsPromise;
  };

  function makeMapFacade(raw,container){
    return{
      provider:'google',raw,container,
      remove(){try{google.maps.event.clearInstanceListeners(raw)}catch{}container?.replaceChildren?.()},
      getCenter(){const c=raw.getCenter?.();return c?{lat:c.lat(),lng:c.lng()}:null},
      getZoom(){return Number(raw.getZoom?.()||0)},
      setZoom(value){raw.setZoom(Number(value))},
      panBy(offset){const x=Array.isArray(offset)?Number(offset[0]):Number(offset?.x||0),y=Array.isArray(offset)?Number(offset[1]):Number(offset?.y||0);raw.panBy(x,y)},
      fitBounds(points,options={}){const bounds=new google.maps.LatLngBounds();for(const p of points||[]){const q=Array.isArray(p)?{lat:Number(p[0]),lng:Number(p[1])}:cleanPoint(p);if(q)bounds.extend(q)}raw.fitBounds(bounds,options?.padding||60)},
      on(name,handler){return raw.addListener(name,handler)}
    };
  }

  function markerFacade(marker){
    return{
      raw:marker,
      setLatLng(point){const q=cleanPoint(point);if(q)marker.setPosition(q)},
      getLatLng(){const p=marker.getPosition?.();return p?{lat:p.lat(),lng:p.lng()}:null},
      setPosition(point){const q=cleanPoint(point);if(q)marker.setPosition(q)},
      getPosition(){return marker.getPosition?.()},
      setMap(value){marker.setMap(value)},
      setVisible(value){marker.setVisible(!!value)},
      setIcon(icon){marker.setIcon(icon)},
      addListener(name,handler){return marker.addListener(name,handler)},
      remove(){marker.setMap(null)}
    };
  }
  function polylineFacade(line){return{raw:line,setLatLngs(points){line.setPath((points||[]).map(cleanPoint).filter(Boolean))},setMap(value){line.setMap(value)},remove(){line.setMap(null)}}}

  function mapType(){return liveMapStyle==='satellite'?'satellite':'roadmap'}
  function clearCleanOverlays(){
    for(const overlay of inlineGoogleOverlays||[]){try{overlay?.setMap?.(null);overlay?.raw?.setMap?.(null)}catch{}}
    inlineGoogleOverlays=[];inlinePlannerMarker=null;inlinePlannerLines=[];inlinePlannerLabels=[];inlineGolferMarker=null;
  }
  function remember(overlay){inlineGoogleOverlays.push(overlay);return overlay}

  function symbolCircle(color,scale=7,stroke='#fff',weight=2){return{path:google.maps.SymbolPath.CIRCLE,scale,fillColor:color,fillOpacity:1,strokeColor:stroke,strokeOpacity:1,strokeWeight:weight}}
  function plannerIcon(){
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#f6c94b" stroke="#fff" stroke-width="4"/><circle cx="24" cy="24" r="13" fill="none" stroke="#173c2b" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="none" stroke="#173c2b" stroke-width="2"/></svg>';
    return{url:`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,scaledSize:new google.maps.Size(48,48),anchor:new google.maps.Point(24,24)};
  }
  function plannerLabelIcon(kind,yards='—',club='—'){
    const top=kind==='hit'?'TO HIT':'TO GO',safeYards=String(yards),safeClub=String(club||'—').replace(/[<>&"']/g,'');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="122" height="82" viewBox="0 0 122 82"><rect x="1" y="1" width="120" height="80" rx="14" fill="#1a2b24" fill-opacity=".76" stroke="#fff" stroke-opacity=".2"/><text x="61" y="29" text-anchor="middle" fill="#f5cf68" font-family="Arial,sans-serif" font-size="24" font-weight="800">${safeYards}</text><text x="61" y="42" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="9" font-weight="800">yd</text><text x="61" y="55" text-anchor="middle" fill="#e7eee9" font-family="Arial,sans-serif" font-size="8" font-weight="800">${top}</text><line x1="14" y1="62" x2="108" y2="62" stroke="#f5cf68" stroke-opacity=".65"/><text x="61" y="76" text-anchor="middle" fill="#a9efc9" font-family="Arial,sans-serif" font-size="11" font-weight="800">${safeClub}</text></svg>`;
    return{url:`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,scaledSize:new google.maps.Size(122,82),anchor:new google.maps.Point(kind==='hit'?150:-28,41)};
  }

  function labelFacade(marker,kind){
    const facade=markerFacade(marker);
    facade.setPlannerContent=(yards,club,visible=true)=>{marker.setVisible(!!visible);if(visible)marker.setIcon(plannerLabelIcon(kind,yards,club))};
    return facade;
  }

  function fitRoundMap(green){
    if(inlineHoleMap?.provider!=='google'||!inlineHoleMap.raw)return;
    const raw=inlineHoleMap.raw,bounds=new google.maps.LatLngBounds();
    const points=[...(typeof holeRoute==='function'?holeRoute(green):[]),green.front,green.center,green.back,shotPlannerAim?.(green)].map(cleanPoint).filter(Boolean);
    for(const p of points)bounds.extend(p);
    if(points.length){raw.fitBounds(bounds,{top:120,right:82,bottom:120,left:82});google.maps.event.addListenerOnce(raw,'idle',()=>{const z=Number(raw.getZoom?.()||17);if(z>19)raw.setZoom(19)})}
    inlineHoleGreen=green;inlineViewResetting=false;inlineUserMovedMap=false;document.getElementById('mapRecenterButton')?.classList.add('hidden');
  }

  function updatePlannerClean(green){
    if(!selectedTee(green)||!green?.center||!inlinePlannerMarker)return;
    const origin=shotPlannerOrigin(green),aim=shotPlannerAim(green),remainingPoints=remainingRoutePoints(origin,aim,green);
    const toTarget=Math.round(distanceYards(origin,aim)),remaining=Math.round(routeDistance(remainingPoints)),routeTotal=toTarget+remaining;
    inlinePlannerMarker.setLatLng(aim);inlinePlannerLines[0]?.setLatLngs([origin,aim]);inlinePlannerLines[1]?.setLatLngs(remainingPoints);
    inlinePlannerLabels[0]?.setLatLng(pointBetween(origin,aim,.5));if(remainingPoints[1])inlinePlannerLabels[1]?.setLatLng(pointBetween(remainingPoints[0],remainingPoints[1],.5));
    const hitSuggestion=suggestedClubFor(toTarget,driverAllowedForCurrentShot()),goSuggestion=suggestedClubFor(remaining,false),hitClubName=hitSuggestion?.club||'Set Clubs',goClubName=goSuggestion?.club||'Set Clubs';
    inlinePlannerLabels[0]?.setPlannerContent?.(toTarget,hitClubName,true);inlinePlannerLabels[1]?.setPlannerContent?.(remaining,goClubName,remaining>=5);
    const yardage=document.getElementById('centerYards'),label=document.getElementById('yardageTargetLabel');if(yardage)yardage.textContent=routeTotal;if(label)label.textContent='Route Remaining';
    if(golferIsNearHole(green))updateClubSuggestion(toTarget,lastGpsAccuracyYards??999);
  }
  window.updateShotPlanner=updatePlannerClean;

  function drawRoundOverlays(green,{fit=true}={}){
    const raw=inlineHoleMap?.raw;if(!raw)return;
    clearCleanOverlays();inlineHoleGreen=green;shotPlannerGreen=green;
    for(const aimPoint of[green.aim1,green.aim2].filter(Boolean))remember(new google.maps.Marker({map:raw,position:cleanPoint(aimPoint),clickable:false,icon:symbolCircle('#e0bd66',6),title:'Aim point'}));
    const origin=shotPlannerOrigin(green),aim=shotPlannerAim(green),remainingPoints=remainingRoutePoints(origin,aim,green);
    const hitLine=remember(new google.maps.Polyline({map:raw,path:[cleanPoint(origin),cleanPoint(aim)],strokeColor:'#f5cf68',strokeWeight:3,strokeOpacity:1,zIndex:800}));
    const goLine=remember(new google.maps.Polyline({map:raw,path:remainingPoints.map(cleanPoint).filter(Boolean),strokeColor:'#f5dfa8',strokeWeight:2.5,strokeOpacity:.8,zIndex:790,icons:[{icon:{path:'M 0,-1 0,1',strokeColor:'#f5dfa8',strokeOpacity:.9,strokeWeight:2,scale:2},offset:'0',repeat:'14px'}]}));
    inlinePlannerLines=[polylineFacade(hitLine),polylineFacade(goLine)];
    const planner=remember(new google.maps.Marker({map:raw,position:cleanPoint(aim),draggable:true,zIndex:1200,icon:plannerIcon(),title:'Drag to plan your shot'}));inlinePlannerMarker=markerFacade(planner);
    const hitLabel=remember(new google.maps.Marker({map:raw,position:cleanPoint(pointBetween(origin,aim,.5)),clickable:false,zIndex:1100,icon:plannerLabelIcon('hit')}));
    const goPos=pointBetween(remainingPoints[0],remainingPoints[1]||remainingPoints[0],.5);const goLabel=remember(new google.maps.Marker({map:raw,position:cleanPoint(goPos),clickable:false,zIndex:1100,icon:plannerLabelIcon('go')}));
    inlinePlannerLabels=[labelFacade(hitLabel,'hit'),labelFacade(goLabel,'go')];
    planner.addListener('drag',()=>{const p=planner.getPosition();if(!p)return;shotPlannerAims[shotPlannerKey()]={lat:p.lat(),lng:p.lng()};updatePlannerClean(green)});
    planner.addListener('dragend',()=>{inlineUserMovedMap=true;document.getElementById('mapRecenterButton')?.classList.remove('hidden')});
    updatePlannerClean(green);if(fit)fitRoundMap(green);record('ROUND_OVERLAYS_OK');
  }

  window.fitLiveHoleView=fitRoundMap;
  window.resetLiveHoleView=function(){if(inlineHoleGreen)fitRoundMap(inlineHoleGreen)};
  window.zoomLiveHoleMap=function(change){if(inlineHoleMap?.provider==='google')inlineHoleMap.raw.setZoom((inlineHoleMap.raw.getZoom()||17)+Number(change||0))};
  window.setLiveMapStyle=function(style){liveMapStyle=style==='terrain'?'terrain':'satellite';localStorage.parfolioLiveMapStyle=liveMapStyle;if(s?.v==='round'&&inlineHoleMap?.provider==='google'){inlineHoleMap.raw.setMapTypeId(mapType());drawRoundOverlays(inlineHoleGreen,{fit:false})}else render()};

  window.initInlineHoleMapLeaflet=function(green){showGoogleError(document.getElementById('liveHoleMap'),new Error('Alternate map providers are disabled. ParFolio uses Google Maps only.'),'GOOGLE_ONLY_POLICY')};

  window.initInlineHoleMap=async function(green){
    const container=document.getElementById('liveHoleMap'),key=shotPlannerKey();if(!container||!selectedTee(green)||!green?.center)return;
    try{
      await window.loadGoogleMaps();if(document.getElementById('liveHoleMap')!==container||shotPlannerKey()!==key)return;if(authFailed)throw new Error('Google Maps authorization failed');
      const raw=new google.maps.Map(container,{center:cleanPoint(green.center),zoom:17,mapTypeId:mapType(),disableDefaultUI:true,clickableIcons:false,gestureHandling:'greedy',keyboardShortcuts:false,backgroundColor:'#173c2b'});
      inlineHoleMap=makeMapFacade(raw,container);document.querySelector('.live-map-viewport')?.classList.add('google-map-active');
      const label=document.querySelector('.forward-label');if(label)label.textContent=liveMapStyle==='satellite'?'GOOGLE SATELLITE · SHOT PLANNER':'GOOGLE MAP · SHOT PLANNER';
      const credit=document.querySelector('.hole-map-attribution');if(credit)credit.classList.add('hidden');
      drawRoundOverlays(green,{fit:true});raw.addListener('dragstart',()=>{inlineUserMovedMap=true;document.getElementById('mapRecenterButton')?.classList.remove('hidden')});raw.addListener('zoom_changed',()=>{if(!inlineViewResetting){inlineUserMovedMap=true;document.getElementById('mapRecenterButton')?.classList.remove('hidden')}});
      google.maps.event.addListenerOnce(raw,'tilesloaded',()=>record('ROUND_GOOGLE_TILES_OK',mapType()));record('ROUND_GOOGLE_MAP_OK',mapType());
    }catch(error){inlineHoleMap=null;showGoogleError(container,error,authFailed?'GOOGLE_AUTH_FAIL':'ROUND_GOOGLE_INIT_FAIL')}
  };

  window.updateInlineGolferPosition=function(here,green){
    if(inlineHoleMap?.provider!=='google'||!here||!green?.center||distanceYards(here,green.center)>3000)return;
    if(inlineGolferMarker){inlineGolferMarker.setLatLng(here);return}
    const marker=remember(new google.maps.Marker({map:inlineHoleMap.raw,position:cleanPoint(here),clickable:false,zIndex:1300,icon:symbolCircle('#2476d1',7),title:'Your location'}));inlineGolferMarker=markerFacade(marker);
  };

  window.updateGoogleRoundHole=function(){
    if(s.v!=='round'||inlineHoleMap?.provider!=='google')return false;
    const course=selectedRoundCourse(),green=course?.greens?.[s.hole-1],par=Number(s.pars[s.hole-1])||4;if(!selectedTee(green)||!green?.center)return false;
    stopLocation();const yards=mappedHoleDistance(green);if(document.getElementById('roundMapHole'))document.getElementById('roundMapHole').textContent=s.hole;if(document.getElementById('roundMapDistance'))document.getElementById('roundMapDistance').textContent=yards;if(document.getElementById('roundMapPar'))document.getElementById('roundMapPar').textContent=par;
    const previous=document.querySelector('.hole-edge-arrow.previous');if(previous)previous.disabled=s.hole===1;const name=myRoundPlayerName(),holeScore=scoreValue(name)||par,roundTotal=total(name,s.hole);if(document.getElementById('roundHoleScore'))document.getElementById('roundHoleScore').textContent=holeScore;if(document.getElementById('roundScoreTotal'))document.getElementById('roundScoreTotal').textContent=`Tap · Total ${roundTotal}`;
    inlineHoleMap.raw.setMapTypeId(mapType());drawRoundOverlays(green,{fit:true});const segment=activeRouteSegment(null,green);if(segment)loadWeather(segment.origin,segment.target,segment.origin);startLocation(green);save();record('ROUND_HOLE_SWITCH_OK',s.hole);return true;
  };

  window.initCoursePreviews=function(){
    const nodes=[...document.querySelectorAll('.course-preview-map')];if(!nodes.length)return;
    window.loadGoogleMaps().then(()=>{
      for(const node of nodes){if(node.dataset.ready)continue;node.dataset.ready='1';const center={lat:Number(node.dataset.lat),lng:Number(node.dataset.lng)};if(!Number.isFinite(center.lat)||!Number.isFinite(center.lng))continue;const raw=new google.maps.Map(node,{center,zoom:15,mapTypeId:'satellite',disableDefaultUI:true,gestureHandling:'none',keyboardShortcuts:false,clickableIcons:false});const facade=makeMapFacade(raw,node);coursePreviewMaps.push(facade);previewMaps.push(facade)}
    }).catch(error=>nodes.forEach(node=>showGoogleError(node,error,'COURSE_PREVIEW_GOOGLE_FAIL')));
  };

  window.initMap=async function(){
    const container=document.getElementById('courseMap');if(!container||!draft)return;
    try{
      await window.loadGoogleMaps();const g=draft.greens[draft.mapHole-1],existing=markerPoint(g,draft.target),any=g.center||g.aim1||g.aim2||g.tee||g.front||g.back,view=draft.mapView?{lat:Number(draft.mapView.lat),lng:Number(draft.mapView.lng)}:(cleanPoint(existing)||cleanPoint(any)||{lat:34.1,lng:-117.3}),zoom=Number(draft.mapView?.zoom??(existing||any?18:10));
      const raw=new google.maps.Map(container,{center:view,zoom,mapTypeId:draft.mapStyle==='satellite'?'satellite':'roadmap',disableDefaultUI:false,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,clickableIcons:false,gestureHandling:'greedy'});map=makeMapFacade(raw,container);map.raw=raw;
      const colors={tee:'#d8a93e',tee_black:'#111111',tee_blue:'#2571d9',tee_white:'#f5f5f5',tee_red:'#d93636',aim1:'#c68b2c',aim2:'#9b6c22',front:'#f4a340',center:'#176b45',back:'#174f9c'},route=holeRoute(g);
      if(route.length>1)new google.maps.Polyline({map:raw,path:route.map(cleanPoint).filter(Boolean),strokeColor:'#d29f31',strokeWeight:4,strokeOpacity:.9});
      for(const [k,p] of mapEditorMarkerEntries(g)){new google.maps.Marker({map:raw,position:cleanPoint(p),title:markerName(k),icon:symbolCircle(colors[k]||'#174f9c',k.startsWith('tee_')?6:7,k==='tee_white'?'#555':'#fff',k==='tee_white'?3:2)})}
      raw.addListener('click',event=>{if(!event.latLng)return;setMarkerPoint(draft.greens[draft.mapHole-1],draft.target,{lat:event.latLng.lat(),lng:event.latLng.lng()});render()});record('EDITOR_GOOGLE_MAP_OK');
    }catch(error){map=null;showGoogleError(container,error,'EDITOR_GOOGLE_MAP_FAIL')}
  };

  record('GOOGLE_ONLY_V269_READY');
})();
