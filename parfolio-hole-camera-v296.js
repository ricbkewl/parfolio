/* ParFolio v296 — single deterministic round-hole camera controller.
   Contract: Google Maps only; satellite renderer remains owned by google-maps-clean-v269.
   One camera pass per hole after the renderer fits the route. No animation, no flyover,
   no polling/retry loop, no secondary provider, and no camera updates after the initial pass.
   When Google vector rendering is available: tee -> 6 o'clock, green -> 12 o'clock,
   maximum practical tilt. If vector rendering is unavailable, the working satellite map
   remains untouched rather than risking a reload/crash. */
(function(){
  const MAX_TILT=67.5;
  const applied=new WeakMap();

  function point(v){
    if(!v)return null;
    const lat=Number(v.lat),lng=Number(v.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
  }
  function bearing(a,b){
    const p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,d=(b.lng-a.lng)*Math.PI/180;
    const y=Math.sin(d)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(d);
    return (Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  function currentGreen(){
    try{return selectedRoundCourse()?.greens?.[Number(s?.hole||1)-1]||null}catch{return null}
  }
  function vectorReady(raw){
    try{return raw?.getRenderingType?.()===google.maps.RenderingType.VECTOR}catch{return false}
  }
  function signature(green){
    const tee=point(selectedTee(green)),target=point(green?.center);
    return tee&&target?`${Number(s?.hole||1)}:${tee.lat.toFixed(7)}:${tee.lng.toFixed(7)}:${target.lat.toFixed(7)}:${target.lng.toFixed(7)}`:'';
  }
  function applyOnce(raw,green){
    if(!raw||!green)return false;
    const tee=point(selectedTee(green)),target=point(green.center);if(!tee||!target)return false;
    const sig=signature(green);if(!sig||applied.get(raw)===sig)return true;
    if(!vectorReady(raw))return false;
    try{
      const fitted=Number(raw.getZoom?.()||17);
      raw.moveCamera({
        center:{lat:(tee.lat+target.lat)/2,lng:(tee.lng+target.lng)/2},
        zoom:Math.max(15.5,Math.min(19.25,fitted+.35)),
        heading:bearing(tee,target),
        tilt:MAX_TILT
      });
      applied.set(raw,sig);
      const host=document.getElementById('liveHoleMap');
      if(host){host.dataset.cameraRule='v296-single-pass';host.dataset.cameraTilt=String(MAX_TILT)}
      return true;
    }catch(error){console.warn('[ParFolio Camera v296] camera pass skipped',error);return false}
  }
  function arm(raw,green){
    if(!raw||!green)return;
    try{
      if(google?.maps?.RenderingType?.VECTOR&&typeof raw.setRenderingType==='function'&&!vectorReady(raw))raw.setRenderingType(google.maps.RenderingType.VECTOR);
    }catch{}
    // Exactly one post-fit opportunity. No interval, recursive timeout, or rendering loop.
    try{google.maps.event.addListenerOnce(raw,'idle',()=>applyOnce(raw,green))}catch{}
  }

  const priorInit=window.initInlineHoleMap;
  if(typeof priorInit==='function')window.initInlineHoleMap=async function(green){
    await priorInit.apply(this,arguments);
    if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw)arm(inlineHoleMap.raw,green);
  };

  const priorUpdate=window.updateGoogleRoundHole;
  if(typeof priorUpdate==='function')window.updateGoogleRoundHole=function(){
    const result=priorUpdate.apply(this,arguments);
    const green=currentGreen();
    if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw&&green)arm(inlineHoleMap.raw,green);
    return result;
  };

  const priorReset=window.resetLiveHoleView;
  if(typeof priorReset==='function')window.resetLiveHoleView=function(){
    const result=priorReset.apply(this,arguments),green=currentGreen();
    if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw&&green){applied.delete(inlineHoleMap.raw);arm(inlineHoleMap.raw,green)}
    return result;
  };

  console.info('[ParFolio] deterministic Google hole camera v296 ready');
})();
