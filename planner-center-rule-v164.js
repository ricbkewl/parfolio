/* ParFolio v164: live planner ignores Aim 2 as a routing target.
   Aim 2 remains visible as a mapping reference, but the live route is Tee -> Aim 1 -> Green Center.
   The dotted TO GO line always anchors directly to Green Center. */
(function(){
  holeRoute=function(green){
    return [selectedTee(green),green?.aim1,green?.center].filter(Boolean);
  };
  remainingRoutePoints=function(origin,aim,green){
    if(!aim||!green?.center)return [];
    return [aim,green.center];
  };
  if(typeof s!=='undefined'&&s?.v==='round'&&!s?.done){
    setTimeout(()=>{
      try{
        const green=selectedRoundCourse()?.greens?.[s.hole-1];
        if(!green)return;
        if(inlineHoleMap?.provider==='google')drawGoogleLiveHole(green);
        else updateShotPlanner(green);
      }catch(error){console.warn('Planner center rule refresh skipped',error)}
    },0);
  }
})();
