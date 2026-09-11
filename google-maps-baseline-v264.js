/* ParFolio v266 — flat Google Maps baseline.
   Stability-first architecture: Google base map + standard markers + normal pan/zoom only.
   No forced vector mode, heading, tilt, 3D camera steering, or flyover state transitions.
   OpenStreetMap is used only after a real base API or map-constructor failure. */
(function(){
  let mapsPromise=null;
  const diag=[];
  const MAX_DIAG=40;

  function record(stage,detail=''){
    const entry={time:new Date().toISOString(),stage,detail:String(detail||'')};
    diag.push(entry);if(diag.length>MAX_DIAG)diag.shift();
    window.PARFOLIO_MAP_DIAGNOSTICS=diag.slice();
    try{localStorage.parfolioMapDiagnostics=JSON.stringify(diag.slice(-20))}catch{}
    if(stage.includes('FAIL'))console.warn('[ParFolio Maps]',stage,detail);else console.info('[ParFolio Maps]',stage,detail);
  }
  window.parfolioMapDiagnostics=()=>diag.slice();
  window.parfolioClearMapDiagnostics=()=>{diag.length=0;try{delete localStorage.parfolioMapDiagnostics}catch{}};

  function configuredKey(){return String(window.PARFOLIO_GOOGLE_MAPS_API_KEY||'').trim()}

  async function getKey(){
    const existing=configuredKey();
    if(existing)return existing;
    record('CONFIG_FETCH_START');
    const response=await fetch(new URL('./parfolio-public-config.json',document.baseURI),{cache:'no-store'});
    if(!response.ok)throw new Error(`public config HTTP ${response.status}`);
    const config=await response.json();
    const key=String(config?.google_maps_browser_key||'').trim();
    if(!key)throw new Error('Google Maps browser key missing from public config');
    window.PARFOLIO_GOOGLE_MAPS_API_KEY=key;
    record('CONFIG_OK');
    return key;
  }

  function baseReady(){return typeof window.google?.maps?.Map==='function'}

  loadGoogleMaps=function(){
    if(baseReady()){record('BASE_API_REUSED');return Promise.resolve(window.google.maps)}
    if(mapsPromise)return mapsPromise;
    mapsPromise=getKey().then(key=>new Promise((resolve,reject)=>{
      record('BASE_API_LOAD_START');
      const callback='__parfolioGoogleMapsBaseReady266';
      let settled=false;
      const fail=message=>{
        if(settled)return;settled=true;mapsPromise=null;
        try{delete window[callback]}catch{}
        record('BASE_API_FAIL',message);
        reject(new Error(message));
      };
      const finish=()=>{
        if(settled)return;
        if(!baseReady()){fail('Google Maps callback fired before google.maps.Map existed');return}
        settled=true;try{delete window[callback]}catch{}
        record('BASE_API_OK');resolve(window.google.maps);
      };
      window[callback]=finish;
      document.querySelectorAll('script[data-parfolio-google-base="1"]').forEach(node=>node.remove());
      const script=document.createElement('script');
      script.dataset.parfolioGoogleBase='1';
      script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${encodeURIComponent(callback)}`;
      script.async=true;script.defer=true;
      script.onerror=()=>fail('Google Maps JavaScript API network load failed');
      document.head.appendChild(script);
      setTimeout(()=>{if(!settled)(baseReady()?finish():fail('Google Maps base API timeout after 15 seconds'))},15000);
    })).catch(error=>{mapsPromise=null;throw error});
    return mapsPromise;
  };

  function legacyMarker(options){
    const marker=new google.maps.Marker({map:options.map,position:options.position,title:options.title||'',clickable:options.clickable!==false,draggable:!!options.draggable,zIndex:options.zIndex,icon:options.icon,label:options.label||undefined});
    return{raw:marker,addListener:(name,callback)=>marker.addListener(name,callback),setPosition:value=>marker.setPosition(value),getPosition:()=>marker.getPosition(),setMap:value=>marker.setMap(value),setVisible:value=>marker.setVisible(value),setIcon:icon=>marker.setIcon(icon)};
  }
  createGoogleMarker=legacyMarker;

  function mapTypeForLive(){return liveMapStyle==='satellite'?'satellite':'terrain'}

  function createRoundGoogleMap(container,green){
    const options={
      center:googlePoint(green.center),
      zoom:17,
      mapTypeId:mapTypeForLive(),
      disableDefaultUI:true,
      clickableIcons:false,
      gestureHandling:'greedy',
      keyboardShortcuts:false,
      backgroundColor:'#173c2b'
    };
    record('MAP_CONSTRUCTOR_START',options.mapTypeId);
    const rawMap=new google.maps.Map(container,options);
    record('MAP_CONSTRUCTOR_OK');
    try{google.maps.event.addListenerOnce(rawMap,'tilesloaded',()=>record('TILES_LOADED','flat'))}catch{}
    return rawMap;
  }

  function fallBackToLeaflet(container,green,error){
    const message=error?.message||String(error);
    record('GOOGLE_BASE_OR_MAP_FAIL',message);
    window.PARFOLIO_LAST_MAP_ERROR=message;
    try{localStorage.parfolioMapLastFailure=JSON.stringify({time:new Date().toISOString(),message})}catch{}
    if($('liveHoleMap')!==container)return;
    document.querySelector('.live-map-viewport')?.classList.remove('google-map-active');
    initInlineHoleMapLeaflet(green);
    const label=document.querySelector('.forward-label');if(label)label.textContent='OPENSTREETMAP FALLBACK · GOOGLE BASE FAILED';
  }

  initInlineHoleMap=async function(green){
    const container=$('liveHoleMap'),key=shotPlannerKey();
    if(!container||!selectedTee(green)||!green?.center)return;

    let rawMap;
    try{
      await loadGoogleMaps();
      if($('liveHoleMap')!==container||shotPlannerKey()!==key)return;
      rawMap=createRoundGoogleMap(container,green);
    }catch(error){fallBackToLeaflet(container,green,error);return}

    document.querySelector('.live-map-viewport')?.classList.add('google-map-active');
    inlineHoleMap=googleMapFacade(rawMap,container);
    const label=document.querySelector('.forward-label');if(label)label.textContent=liveMapStyle==='satellite'?'GOOGLE SATELLITE · SHOT PLANNER':'GOOGLE MAP · SHOT PLANNER';

    try{drawGoogleLiveHole(green);record('OVERLAYS_OK')}
    catch(error){
      const message=error?.message||String(error);
      record('OVERLAYS_FAIL_STAY_GOOGLE',message);
      window.PARFOLIO_LAST_OVERLAY_ERROR=message;
      try{localStorage.parfolioMapLastOverlayFailure=JSON.stringify({time:new Date().toISOString(),message})}catch{}
    }

    setTimeout(()=>{
      if(inlineHoleMap?.raw!==rawMap)return;
      try{rawMap.addListener('dragstart',showMapRecenterButton);rawMap.addListener('zoom_changed',showMapRecenterButton)}catch(error){record('MAP_LISTENER_FAIL_STAY_GOOGLE',error?.message||error)}
    },650);
    record('GOOGLE_ROUND_READY_FLAT');
  };

  if(typeof updateGoogleRoundHole==='function'){
    updateGoogleRoundHole=function(){
      if(s.v!=='round'||inlineHoleMap?.provider!=='google')return false;
      const course=selectedRoundCourse(),green=course?.greens?.[s.hole-1],par=Number(s.pars[s.hole-1])||4;if(!selectedTee(green)||!green?.center)return false;
      try{
        stopLocation();const yards=mappedHoleDistance(green);$('roundMapHole').textContent=s.hole;$('roundMapDistance').textContent=yards;$('roundMapPar').textContent=par;$('liveHoleMap')?.setAttribute('aria-label',`Course view of Hole ${s.hole}`);
        const previous=document.querySelector('.hole-edge-arrow.previous');if(previous)previous.disabled=s.hole===1;
        const name=myRoundPlayerName(),holeScore=scoreValue(name)||par,roundTotal=total(name,s.hole);if($('roundHoleScore'))$('roundHoleScore').textContent=holeScore;if($('roundScoreTotal'))$('roundScoreTotal').textContent=`Tap · Total ${roundTotal}`;
        inlineHoleMap.raw.setMapTypeId(mapTypeForLive());
        try{drawGoogleLiveHole(green);record('HOLE_OVERLAYS_OK',s.hole)}catch(error){record('HOLE_OVERLAYS_FAIL_STAY_GOOGLE',error?.message||error)}
        try{fitLiveHoleView(green)}catch(error){record('HOLE_FIT_FAIL_STAY_GOOGLE',error?.message||error)}
        const segment=activeRouteSegment(null,green);if(segment)loadWeather(segment.origin,segment.target,segment.origin);startLocation(green);save();record('HOLE_SWITCH_OK',s.hole);return true;
      }catch(error){record('HOLE_SWITCH_FAIL_STAY_GOOGLE',error?.message||error);return true}
    };
  }

  record('BASELINE_V266_READY_FLAT');
})();
