/* ParFolio v157: lock application UI scale while preserving map gestures. */
(function(){
  const isMapTarget=target=>Boolean(target?.closest?.('#liveHoleMap,#map,.course-preview-map,.leaflet-container,.gm-style'));

  document.addEventListener('gesturestart',event=>{if(!isMapTarget(event.target))event.preventDefault()},{passive:false});
  document.addEventListener('gesturechange',event=>{if(!isMapTarget(event.target))event.preventDefault()},{passive:false});
  document.addEventListener('gestureend',event=>{if(!isMapTarget(event.target))event.preventDefault()},{passive:false});

  let lastTouchEnd=0;
  document.addEventListener('touchend',event=>{
    if(isMapTarget(event.target))return;
    const now=Date.now();
    if(now-lastTouchEnd<=300)event.preventDefault();
    lastTouchEnd=now;
  },{passive:false});
})();
