/* ParFolio v261 — Google Maps is primary for every online course map style.
   The existing Leaflet/OpenStreetMap renderer remains an actual offline/failure fallback only. */
(function(){
  async function googleFirstInlineHoleMap(green){
    const container=$('liveHoleMap'),key=shotPlannerKey();if(!container||!selectedTee(green)||!green?.center)return;
    try{
      await loadGoogleMaps();if($('liveHoleMap')!==container||shotPlannerKey()!==key)return;
      document.querySelector('.live-map-viewport')?.classList.add('google-map-active');
      const mapType=liveMapStyle==='satellite'?'satellite':'terrain';
      const rawMap=new google.maps.Map(container,{center:googlePoint(green.center),zoom:17,...(GOOGLE_MAP_ID?{mapId:GOOGLE_MAP_ID}:{}),renderingType:google.maps.RenderingType.VECTOR,mapTypeId:mapType,heading:bearingDegrees(selectedTee(green),green.center),tilt:LIVE_MAP_TILT,disableDefaultUI:true,clickableIcons:false,gestureHandling:'greedy',keyboardShortcuts:false,headingInteractionEnabled:true,tiltInteractionEnabled:true,backgroundColor:'#173c2b'});
      inlineHoleMap=googleMapFacade(rawMap,container);
      const label=document.querySelector('.forward-label');if(label)label.textContent=mapType==='satellite'?'GOOGLE SATELLITE · TEE 6 · GREEN 12':'GOOGLE MAP · TEE 6 · GREEN 12';
      drawGoogleLiveHole(green);
      setTimeout(()=>{if(inlineHoleMap?.raw!==rawMap)return;rawMap.addListener('dragstart',showMapRecenterButton);rawMap.addListener('zoom_changed',showMapRecenterButton);rawMap.addListener('heading_changed',showMapRecenterButton);rawMap.addListener('tilt_changed',showMapRecenterButton)},650);
    }catch(error){
      console.warn('Google Maps unavailable; using OpenStreetMap fallback for this map only.',error);
      if($('liveHoleMap')!==container)return;
      document.querySelector('.live-map-viewport')?.classList.remove('google-map-active');
      initInlineHoleMapLeaflet(green);
    }
  }

  initInlineHoleMap=googleFirstInlineHoleMap;

  const priorUpdate=typeof updateGoogleRoundHole==='function'?updateGoogleRoundHole:null;
  if(priorUpdate){
    updateGoogleRoundHole=function(){
      if(s.v!=='round'||inlineHoleMap?.provider!=='google')return false;
      const course=selectedRoundCourse(),green=course?.greens?.[s.hole-1],par=Number(s.pars[s.hole-1])||4;if(!selectedTee(green)||!green?.center)return false;
      stopLocation();const yards=mappedHoleDistance(green);$('roundMapHole').textContent=s.hole;$('roundMapDistance').textContent=yards;$('roundMapPar').textContent=par;$('liveHoleMap')?.setAttribute('aria-label',`Forward-facing course view of Hole ${s.hole}`);
      const previous=document.querySelector('.hole-edge-arrow.previous');if(previous)previous.disabled=s.hole===1;
      const name=myRoundPlayerName(),holeScore=scoreValue(name)||par,roundTotal=total(name,s.hole);if($('roundHoleScore'))$('roundHoleScore').textContent=holeScore;if($('roundScoreTotal'))$('roundScoreTotal').textContent=`Tap · Total ${roundTotal}`;
      inlineHoleMap.raw.setMapTypeId(liveMapStyle==='satellite'?'satellite':'terrain');drawGoogleLiveHole(green);const segment=activeRouteSegment(null,green);if(segment)loadWeather(segment.origin,segment.target,segment.origin);startLocation(green);save();return true;
    };
  }

  window.addEventListener('online',()=>{try{window.parfolioResetGoogleMapsHealth?.()}catch{}});
})();
