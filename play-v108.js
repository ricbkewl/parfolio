/* Version 109: force maximum tilt, quick scorecard, and green scorecard theme */
(function(){
  const MAX_PLAY_TILT=67.5;

  function forceMaxGoogleTilt(green){
    if(inlineHoleMap?.provider!=='google'||!green?.center)return;
    const rawMap=inlineHoleMap.raw;
    const segment=activeRouteSegment(null,green),start=segment?.origin||selectedTee(green),end=segment?.target||green.center;
    if(!start||!end)return;
    const heading=bearingDegrees(start,end);
    rawMap.moveCamera({heading,tilt:MAX_PLAY_TILT});
  }

  const priorOrientInlineHoleMap=orientInlineHoleMap;
  orientInlineHoleMap=function(green,origin=null,target=null){
    if(!inlineHoleMap||!selectedTee(green)||!green?.center)return;
    const segment=activeRouteSegment(null,green),start=origin||segment?.origin||selectedTee(green),end=target||segment?.target||green.center,container=$('liveHoleMap'),bearing=bearingDegrees(start,end);
    if(inlineHoleMap.provider==='google'){
      if(container){container.dataset.forwardBearing=String(bearing);container.style.setProperty('--map-bearing','0deg');container.style.transform='none'}
      if(!inlineUserMovedMap||inlineViewResetting)inlineHoleMap.raw.moveCamera({heading:bearing,tilt:MAX_PLAY_TILT});
      return;
    }
    priorOrientInlineHoleMap(green,origin,target);
  };

  const priorInitInlineHoleMap=initInlineHoleMap;
  initInlineHoleMap=async function(green){
    await priorInitInlineHoleMap(green);
    if(inlineHoleMap?.provider==='google'&&(!inlineUserMovedMap||inlineViewResetting)){
      forceMaxGoogleTilt(green);
      setTimeout(()=>forceMaxGoogleTilt(green),250);
      setTimeout(()=>forceMaxGoogleTilt(green),800);
    }
  };

  floatingRoundScoreControl=function(){
    const name=myRoundPlayerName(),encoded=encodeURIComponent(name),holeScore=scoreValue(name)||Number(s.pars[s.hole-1])||0,roundTotal=total(name,s.hole);
    return`<div class="round-score-stack"><button class="quick-scorecard-button" onclick="openScorecard()" aria-label="Open scorecard">Scorecard</button><div class="round-floating-score" aria-label="Round score controls"><button onclick="changeScore('${encoded}',-1)" aria-label="Subtract one stroke">−</button><button onclick="openScoreEntry()"><b id="roundHoleScore">${holeScore}</b><small id="roundScoreTotal">Tap · Total ${roundTotal}</small></button><button onclick="changeScore('${encoded}',1)" aria-label="Add one stroke">+</button></div></div>`;
  };

  const priorRecap=recap;
  recap=function(){
    priorRecap();
    app.classList.add('scorecard-green');
  };

  /* app.js performs its first render before this enhancement file loads.
     Re-render an already-open round once so the new play controls and camera apply immediately. */
  if(s?.v==='round'&&!s?.done)setTimeout(()=>render(),0);
  else if(s?.v==='recap')setTimeout(()=>render(),0);
})();
