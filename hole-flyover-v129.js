/* Version 137: faster helicopter flyover ending on the exact normal hole camera. */
(function(){
  const FLYOVER_MS=2750;
  let flyoverFrame=null,flyoverResolve=null,flyoverActive=false;

  function reducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches}
  function flyoverAllowed(){return localStorage.atgHoleFlyover!=='off'&&!reducedMotion()}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function smoothstep(t){t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10)}
  function lerp(a,b,t){return a+(b-a)*t}
  function pointLerp(a,b,t){return{lat:lerp(a.lat,b.lat,t),lng:lerp(a.lng,b.lng,t)}}
  function headingLerp(a,b,t){let delta=((b-a+540)%360)-180;return(a+delta*t+360)%360}
  function targetYards(green){return mappedHoleDistance(green)||Math.round(distanceYards(selectedTee(green),green.center))}
  function finalCamera(green){
    if(typeof window.atgHoleFinalCamera==='function')return window.atgHoleFinalCamera(green);
    const tee=selectedTee(green),target=holeRoute(green)[1]||green.center,yards=targetYards(green);
    return{center:pointBetween(tee,target,.46),zoom:18,heading:bearingDegrees(tee,target),tilt:67.5,yards};
  }

  function removeFlyoverCard(){document.querySelector('.hole-flyover-card')?.remove();document.querySelector('.live-hole-map')?.classList.remove('hole-flyover-active')}
  function showFlyoverCard(hole,par,yards){
    removeFlyoverCard();
    const host=document.querySelector('.live-hole-map');if(!host)return;
    host.classList.add('hole-flyover-active');
    const card=document.createElement('div');card.className='hole-flyover-card';
    card.innerHTML=`<small>NEXT HOLE</small><b>Hole ${hole}</b><span>Par ${par} · ${yards} yd</span><button type="button">Skip</button>`;
    card.querySelector('button').addEventListener('click',skipHoleFlyover);
    host.appendChild(card);
  }

  function adoptNextHoleBeforeLanding(targetHole){
    const course=selectedRoundCourse(),green=course?.greens?.[targetHole-1],par=Number(s.pars[targetHole-1])||4;
    if(!green||!selectedTee(green)||!green.center)return false;
    s.hole=targetHole;stopLocation();
    const yards=mappedHoleDistance(green);
    if($('roundMapHole'))$('roundMapHole').textContent=targetHole;
    if($('roundMapDistance'))$('roundMapDistance').textContent=yards;
    if($('roundMapPar'))$('roundMapPar').textContent=par;
    if($('centerYards'))$('centerYards').textContent=yards;
    $('liveHoleMap')?.setAttribute('aria-label',`Forward-facing course view of Hole ${targetHole}`);
    const previous=document.querySelector('.hole-edge-arrow.previous');if(previous)previous.disabled=targetHole===1;
    const name=myRoundPlayerName(),holeScore=scoreValue(name)||par,roundTotal=total(name,targetHole);
    if($('roundHoleScore'))$('roundHoleScore').textContent=holeScore;
    if($('roundScoreTotal'))$('roundScoreTotal').textContent=`Tap · Total ${roundTotal}`;
    if(inlineHoleMap?.provider==='google'){
      try{inlineHoleMap.raw.setMapTypeId(liveMapStyle);}catch{}
      drawGoogleLiveHole(green);
    }
    const segment=activeRouteSegment(null,green);if(segment)loadWeather(segment.origin,segment.target,segment.origin);
    save();return true;
  }

  function finishFlyover(targetHole,green){
    if(flyoverFrame)cancelAnimationFrame(flyoverFrame);flyoverFrame=null;flyoverActive=false;
    removeFlyoverCard();
    if(s.hole!==targetHole)adoptNextHoleBeforeLanding(targetHole);
    /* Keep automatic GPS camera steering off after arrival. The map is already on
       the same deterministic camera the normal hole view uses. */
    inlineUserMovedMap=true;
    try{startLocation(green);}catch{}
    const done=flyoverResolve;flyoverResolve=null;if(done)done(true);
  }
  window.skipHoleFlyover=function(){if(flyoverActive&&flyoverResolve)flyoverResolve('skip')};

  function runGoogleFlyover(targetHole){
    return new Promise(resolve=>{
      const course=selectedRoundCourse(),green=course?.greens?.[targetHole-1],tee=selectedTee(green),camera=finalCamera(green);
      if(!green||!tee||!green.center||!camera||inlineHoleMap?.provider!=='google'||!inlineHoleMap.raw){resolve(false);return;}
      const raw=inlineHoleMap.raw,startCenter=inlineHoleMap.getCenter?.()||tee,startZoom=Number(raw.getZoom?.()||18),startHeading=Number(raw.getHeading?.()||0),startTilt=Number(raw.getTilt?.()||67.5);
      const destination=camera.center,heading=camera.heading,finalZoom=camera.zoom,cruiseZoom=clamp(finalZoom-1.55,15.8,17.3),par=Number(s.pars[targetHole-1])||4,yards=camera.yards||targetYards(green);
      showFlyoverCard(targetHole,par,yards);stopLocation();flyoverActive=true;flyoverResolve=resolve;
      const started=performance.now();let adopted=false;
      function frame(now){
        if(!flyoverActive){resolve(false);return;}
        const t=clamp((now-started)/FLYOVER_MS,0,1);
        let center,zoom,tilt,cameraHeading;
        if(t<.13){
          const p=smoothstep(t/.13);center=startCenter;zoom=lerp(startZoom,cruiseZoom,p);tilt=lerp(startTilt,31,p);cameraHeading=headingLerp(startHeading,heading,p*.16);
        }else if(t<.62){
          const p=smoothstep((t-.13)/.49);center=pointLerp(startCenter,destination,p);zoom=cruiseZoom;tilt=31;cameraHeading=headingLerp(startHeading,heading,.16+.84*p);
        }else if(t<.69){
          center=destination;zoom=cruiseZoom;tilt=31;cameraHeading=heading;
          if(!adopted)adopted=adoptNextHoleBeforeLanding(targetHole);
        }else{
          if(!adopted)adopted=adoptNextHoleBeforeLanding(targetHole);
          const p=smoothstep((t-.69)/.31);
          center=destination;zoom=lerp(cruiseZoom,finalZoom,p);tilt=lerp(31,camera.tilt,p);cameraHeading=heading;
        }
        try{raw.moveCamera({center,zoom,heading:cameraHeading,tilt});}catch{}
        if(t>=1){
          /* This is both the last animation frame and the normal next-hole camera. */
          try{raw.moveCamera(camera);}catch{}
          finishFlyover(targetHole,green);return;
        }
        flyoverFrame=requestAnimationFrame(frame);
      }
      const originalResolve=flyoverResolve;
      flyoverResolve=value=>{if(value==='skip'){if(!adopted)adoptNextHoleBeforeLanding(targetHole);try{raw.moveCamera(camera);}catch{}finishFlyover(targetHole,green);return;}originalResolve(value)};
      flyoverFrame=requestAnimationFrame(frame);
    });
  }

  async function moveHoleWithFlyover(targetHole){
    if(flyoverActive||targetHole<1||targetHole>s.holes)return;
    const course=selectedRoundCourse(),target=course?.greens?.[targetHole-1];
    if(!flyoverAllowed()||inlineHoleMap?.provider!=='google'||!selectedTee(target)||!target?.center){s.hole=targetHole;showRoundHole();return;}
    await runGoogleFlyover(targetHole);
  }

  const priorPrev129=prev,priorNext129=next;
  prev=function(){if(s.hole>1)return moveHoleWithFlyover(s.hole-1);return priorPrev129();};
  next=function(){if(s.hole<s.holes)return moveHoleWithFlyover(s.hole+1);return priorNext129();};
  window.setHoleFlyoverEnabled=function(enabled){localStorage.atgHoleFlyover=enabled?'on':'off';};
})();
