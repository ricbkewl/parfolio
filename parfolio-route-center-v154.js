/* ParFolio v154: TO GO planner line always anchors directly to Green Center.
   Course Aim 1 / Aim 2 markers remain visible references, but they do not bend
   or terminate the dotted remaining-shot line. */
(function(){
  remainingRoutePoints=function(origin,aim,green){
    if(!aim||!green?.center)return [];
    return [aim,green.center];
  };

  /* Refresh an already-open hole so the corrected dotted line appears without
     requiring the golfer to leave and restart the round. */
  if(s?.v==='round'&&!s?.done){
    setTimeout(()=>{
      const green=selectedRoundCourse()?.greens?.[s.hole-1];
      if(green)try{updateShotPlanner(green)}catch{}
    },0);
  }
})();
