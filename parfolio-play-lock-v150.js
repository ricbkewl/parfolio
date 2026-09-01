/* ParFolio v150: authoritative live-play camera + flyover lock.
   Loaded last so GPS/route helpers cannot re-anchor the camera on Aim 1/Aim 2.
   Camera orientation is always Playing Tee -> Green Center. */
(function(){
  const FLYOVER_MS=2800;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const pointLerp=(a,b,t)=>({lat:lerp(a.lat,b.lat,t),lng:lerp(a.lng,b.lng,t)});
  let flying=false,frame=null;

  function cameraFor(green){
    const tee=selectedTee(green);if(!tee||!green?.center)return null;
    const yards=mappedHoleDistance(green)||Math.round(distanceYards(tee,green.center));
    const safe=Math.max(140,Number(yards)||350);
    const zoom=clamp(19.05-Math.log2(safe/150)*.72,17.35,19.0);
    return{
      center:pointBetween(tee,green.center,.50),
      zoom,
      heading:bearingDegrees(tee,green.center),
      tilt:67.5,
      yards,
      tee,
      greenCenter:green.center
    };
  }

  window.atgHoleFinalCamera=cameraFor;
  window.parfolioHoleFinalCamera=cameraFor;

  function applyCamera(green,force=false){
    if(inlineHoleMap?.provider!=='google'||!inlineHoleMap.raw)return;
    const camera=cameraFor(green);if(!camera)return;
    const container=$('liveHoleMap');
    if(container){container.dataset.forwardBearing=String(camera.heading);container.style.setProperty('--map-bearing','0deg');container.style.transform='none';}
    if(force||!inlineUserMovedMap||inlineViewResetting){
      try{inlineHoleMap.raw.moveCamera({center:camera.center,zoom:camera.zoom,heading:camera.heading,tilt:camera.tilt});}catch{}
    }
  }

  /* Absolute rule: Aim points affect route/yardage only, never camera orientation. */
  orientInlineHoleMap=function(green){applyCamera(green,false)};

  const priorInit=initInlineHoleMap;
  initInlineHoleMap=async function(green){
    await priorInit(green);
    inlineUserMovedMap=false;
    applyCamera(green,true);
    setTimeout(()=>applyCamera(green,true),180);
    setTimeout(()=>applyCamera(green,true),650);
  };

  const priorUpdateGoogleRoundHole=updateGoogleRoundHole;
  updateGoogleRoundHole=function(){
    const result=priorUpdateGoogleRoundHole();
    if(result){
      const green=selectedRoundCourse()?.greens?.[s.hole-1];
      inlineUserMovedMap=false;
      applyCamera(green,true);
      setTimeout(()=>applyCamera(green,true),120);
      setTimeout(()=>applyCamera(green,true),520);
    }
    return result;
  };

  /* GPS may update planner/yardage, but cannot turn the map toward an intermediate aim. */
  const priorStartLocation=startLocation;
  startLocation=function(green){
    priorStartLocation(green);
    if(inlineHoleMap?.provider==='google'&&!inlineUserMovedMap){
      setTimeout(()=>applyCamera(green,true),80);
      setTimeout(()=>applyCamera(green,true),500);
    }
  };

  function removeCard(){document.querySelector('.hole-flyover-card')?.remove();document.querySelector('.live-hole-map')?.classList.remove('hole-flyover-active')}
  function showCard(hole,par,yards){
    removeCard();const host=document.querySelector('.live-hole-map');if(!host)return;
    host.classList.add('hole-flyover-active');const card=document.createElement('div');card.className='hole-flyover-card';
    card.innerHTML=`<small>NEXT HOLE</small><b>Hole ${hole}</b><span>Par ${par} · ${yards} yd</span><button type="button">Skip</button>`;
    card.querySelector('button')?.addEventListener('click',()=>finishFlyoverNow(hole));host.appendChild(card);
  }

  let pendingTarget=null,pendingCamera=null;
  function adoptHole(hole){
    s.hole=hole;stopLocation();
    const green=selectedRoundCourse()?.greens?.[hole-1],par=Number(s.pars[hole-1])||4,yards=mappedHoleDistance(green);
    if($('roundMapHole'))$('roundMapHole').textContent=hole;
    if($('roundMapDistance'))$('roundMapDistance').textContent=yards;
    if($('roundMapPar'))$('roundMapPar').textContent=par;
    if($('centerYards'))$('centerYards').textContent=yards;
    const previous=document.querySelector('.hole-edge-arrow.previous');if(previous)previous.disabled=hole===1;
    if(inlineHoleMap?.provider==='google'){try{inlineHoleMap.raw.setMapTypeId(liveMapStyle)}catch{};drawGoogleLiveHole(green);}
    save();return green;
  }

  function finishFlyoverNow(hole=pendingTarget){
    if(frame)cancelAnimationFrame(frame);frame=null;
    if(!hole){flying=false;removeCard();return;}
    const green=s.hole===hole?selectedRoundCourse()?.greens?.[hole-1]:adoptHole(hole),camera=pendingCamera||cameraFor(green);
    if(camera&&inlineHoleMap?.provider==='google'){try{inlineHoleMap.raw.moveCamera({center:camera.center,zoom:camera.zoom,heading:camera.heading,tilt:camera.tilt})}catch{}}
    inlineUserMovedMap=false;applyCamera(green,true);removeCard();flying=false;pendingTarget=null;pendingCamera=null;
    try{startLocation(green)}catch{}
  }

  function flyToHole(hole){
    if(flying||hole<1||hole>s.holes)return;
    const green=selectedRoundCourse()?.greens?.[hole-1],camera=cameraFor(green);
    if(inlineHoleMap?.provider!=='google'||!camera||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){s.hole=hole;showRoundHole();return;}
    const raw=inlineHoleMap.raw,start=inlineHoleMap.getCenter?.()||camera.tee,startZoom=Number(raw.getZoom?.()||camera.zoom),startHeading=Number(raw.getHeading?.()||camera.heading),startTilt=Number(raw.getTilt?.()||67.5);
    const par=Number(s.pars[hole-1])||4;showCard(hole,par,camera.yards);flying=true;pendingTarget=hole;pendingCamera=camera;stopLocation();
    const cruiseZoom=clamp(camera.zoom-1.45,15.8,17.4),began=performance.now();let adopted=false;
    const animate=now=>{
      if(!flying)return;const t=clamp((now-began)/FLYOVER_MS,0,1);let center,zoom,tilt,heading;
      if(t<.18){const p=smooth(t/.18);center=start;zoom=lerp(startZoom,cruiseZoom,p);tilt=lerp(startTilt,30,p);heading=lerp(startHeading,camera.heading,p*.2)}
      else if(t<.68){const p=smooth((t-.18)/.50);center=pointLerp(start,camera.center,p);zoom=cruiseZoom;tilt=30;heading=lerp(startHeading,camera.heading,.2+.8*p)}
      else {if(!adopted){adoptHole(hole);adopted=true}const p=smooth((t-.68)/.32);center=camera.center;zoom=lerp(cruiseZoom,camera.zoom,p);tilt=lerp(30,camera.tilt,p);heading=camera.heading}
      try{raw.moveCamera({center,zoom,tilt,heading})}catch{}
      if(t>=1){finishFlyoverNow(hole);return}frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
  }

  /* Replace all earlier hole-navigation wrappers with the authoritative ParFolio behavior. */
  prev=function(){if(s.hole>1)flyToHole(s.hole-1)};
  next=function(){if(s.hole<s.holes)flyToHole(s.hole+1)};
  window.skipHoleFlyover=()=>finishFlyoverNow();
  window.setHoleFlyoverEnabled=function(enabled){localStorage.parfolioHoleFlyover=enabled?'on':'off'};

  if(s?.v==='round'&&!s?.done){
    const green=selectedRoundCourse()?.greens?.[s.hole-1];
    setTimeout(()=>{inlineUserMovedMap=false;applyCamera(green,true)},0);
    setTimeout(()=>applyCamera(green,true),500);
  }
})();
