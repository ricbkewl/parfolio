/* ParFolio v298 — interaction-safe Google-only round camera.
   Google Maps + satellite only. No alternate provider and no flyover.
   Camera auto-frames once when a hole becomes active. User interaction immediately
   cancels pending camera work; changing holes invalidates callbacks from the old hole.
   This prevents stale idle callbacks from fighting gestures or later hole changes. */
(function(){
  const MAX_TILT=67.5, TOP=.10, BOTTOM=.90;
  let generation=0;
  const applied=new WeakMap();
  const interacted=new WeakMap();
  const armedInteraction=new WeakSet();
  const point=v=>{if(!v)return null;const lat=Number(v.lat),lng=Number(v.lng);return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null};
  function bearing(a,b){const p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,d=(b.lng-a.lng)*Math.PI/180;return(Math.atan2(Math.sin(d)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(d))*180/Math.PI+360)%360}
  function currentGreen(){try{return selectedRoundCourse()?.greens?.[Number(s?.hole||1)-1]||null}catch{return null}}
  function vectorReady(raw){try{return raw?.getRenderingType?.()===google.maps.RenderingType.VECTOR}catch{return false}}
  function key(g){const t=point(selectedTee(g)),c=point(g?.center);return t&&c?`${Number(s?.hole||1)}:${t.lat.toFixed(7)}:${t.lng.toFixed(7)}:${c.lat.toFixed(7)}:${c.lng.toFixed(7)}`:''}
  function project(raw,p){try{const pr=raw.getProjection?.(),b=raw.getBounds?.(),host=raw.getDiv();if(!pr||!b||!host.clientWidth||!host.clientHeight)return null;const sw=pr.fromLatLngToPoint(b.getSouthWest()),ne=pr.fromLatLngToPoint(b.getNorthEast()),q=pr.fromLatLngToPoint(new google.maps.LatLng(p));return{x:(q.x-sw.x)/(ne.x-sw.x)*host.clientWidth,y:(ne.y-q.y)/(ne.y-sw.y)*host.clientHeight,w:host.clientWidth,h:host.clientHeight}}catch{return null}}
  function valid(raw,token,k){return token===generation&&inlineHoleMap?.raw===raw&&!interacted.get(raw)&&key(currentGreen())===k}
  function markInteraction(raw){interacted.set(raw,true);generation++}
  function watchInteraction(raw){if(armedInteraction.has(raw))return;armedInteraction.add(raw);for(const event of['dragstart','zoom_changed','heading_changed','tilt_changed']){try{raw.addListener(event,()=>{if(raw.__parfolioCameraWriting)return;markInteraction(raw)})}catch{}}}
  function move(raw,opts){raw.__parfolioCameraWriting=true;try{raw.moveCamera(opts)}finally{queueMicrotask(()=>{raw.__parfolioCameraWriting=false})}}
  function apply(raw,g,token){
    const tee=point(selectedTee(g)),green=point(g?.center),k=key(g);if(!tee||!green||!k||!valid(raw,token,k)||applied.get(raw)===k||!vectorReady(raw))return;
    try{
      move(raw,{center:{lat:(tee.lat+green.lat)/2,lng:(tee.lng+green.lng)/2},zoom:Number(raw.getZoom?.()||17),heading:bearing(tee,green),tilt:MAX_TILT});
      google.maps.event.addListenerOnce(raw,'idle',()=>{
        if(!valid(raw,token,k))return;const tp=project(raw,tee),gp=project(raw,green);if(!tp||!gp)return;
        const desiredTop=gp.h*TOP,desiredBottom=tp.h*BOTTOM,actualSpan=Math.max(1,tp.y-gp.y),desiredSpan=Math.max(1,desiredBottom-desiredTop);
        const z=Math.max(15,Math.min(19.5,Number(raw.getZoom?.()||17)+Math.log2(desiredSpan/actualSpan)));
        move(raw,{zoom:z,heading:bearing(tee,green),tilt:MAX_TILT});
        google.maps.event.addListenerOnce(raw,'idle',()=>{
          if(!valid(raw,token,k))return;const t2=project(raw,tee),g2=project(raw,green);if(!t2||!g2)return;
          raw.__parfolioCameraWriting=true;try{raw.panBy(0,(t2.y+g2.y)/2-(desiredTop+desiredBottom)/2)}finally{queueMicrotask(()=>{raw.__parfolioCameraWriting=false})}
          applied.set(raw,k);const host=document.getElementById('liveHoleMap');if(host)host.dataset.cameraRule='v298-google-only-interaction-safe';
        });
      });
    }catch(e){console.warn('[ParFolio Camera v298] skipped',e)}
  }
  function arm(raw,g){if(!raw||!g)return;generation++;const token=generation;interacted.set(raw,false);watchInteraction(raw);try{if(google?.maps?.RenderingType?.VECTOR&&typeof raw.setRenderingType==='function'&&!vectorReady(raw)){raw.__parfolioCameraWriting=true;raw.setRenderingType(google.maps.RenderingType.VECTOR);queueMicrotask(()=>{raw.__parfolioCameraWriting=false})}}catch{}try{google.maps.event.addListenerOnce(raw,'idle',()=>apply(raw,g,token))}catch{}}
  const init=window.initInlineHoleMap;if(typeof init==='function')window.initInlineHoleMap=async function(g){await init.apply(this,arguments);if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw)arm(inlineHoleMap.raw,g)};
  const update=window.updateGoogleRoundHole;if(typeof update==='function')window.updateGoogleRoundHole=function(){generation++;const r=update.apply(this,arguments),g=currentGreen();if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw&&g){applied.delete(inlineHoleMap.raw);arm(inlineHoleMap.raw,g)}return r};
  const reset=window.resetLiveHoleView;if(typeof reset==='function')window.resetLiveHoleView=function(){generation++;const r=reset.apply(this,arguments),g=currentGreen();if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw&&g){applied.delete(inlineHoleMap.raw);arm(inlineHoleMap.raw,g)}return r};
  console.info('[ParFolio] interaction-safe Google-only camera v298 ready');
})();