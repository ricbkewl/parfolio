/* Version 109: force maximum tilt, quick scorecard, and green scorecard theme */
(function(){
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
