/* ParFolio v300 — live golfer 6 o'clock / green 12 o'clock camera.
   Stability-first: one persistent Google map; no forced vector rendering, 3D tilt,
   flyover, or chained idle animations. When live GPS is valid and on/near the hole,
   it becomes the bottom anchor. Otherwise the selected tee is the bottom anchor. */
(function(){
  let generation=0;
  const applied=new WeakMap(), interacted=new WeakMap(), armed=new WeakSet();
  const point=v=>{if(!v)return null;const lat=Number(v.lat),lng=Number(v.lng);return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null};
  function green(){try{return selectedRoundCourse()?.greens?.[Number(s?.hole||1)-1]||null}catch{return null}}
  function livePoint(g){
    try{
      const candidates=[window.lastKnownPosition,window.lastGpsPosition,window.currentPosition,window.currentGpsPosition,window.golferPosition,window.lastLocation];
      for(const v of candidates){const p=point(v);if(p&&g?.center&&typeof distanceYards==='function'&&distanceYards(p,g.center)<3000)return p}
    }catch{}
    return null;
  }
  function bottom(g){return livePoint(g)||point(selectedTee(g))}
  function k(g){const a=bottom(g),c=point(g?.center);return a&&c?`${Number(s?.hole||1)}:${a.lat.toFixed(5)}:${a.lng.toFixed(5)}:${c.lat.toFixed(5)}:${c.lng.toFixed(5)}`:''}
  function valid(raw,t,key){return t===generation&&inlineHoleMap?.raw===raw&&!interacted.get(raw)&&k(green())===key}
  function watch(raw){if(armed.has(raw))return;armed.add(raw);for(const e of ['dragstart','zoom_changed'])try{raw.addListener(e,()=>{if(!raw.__pfCamWrite){interacted.set(raw,true);generation++}})}catch{}}
  function frame(raw,g,force=false){
    const a=bottom(g),c=point(g?.center),key=k(g);if(!a||!c||!key)return;
    generation++;const token=generation;if(force)interacted.set(raw,false);if(interacted.get(raw)||applied.get(raw)===key)return;
    try{
      const bounds=new google.maps.LatLngBounds();bounds.extend(a);bounds.extend(c);
      for(const p of [g?.front,g?.back,g?.aim1,g?.aim2].map(point).filter(Boolean))bounds.extend(p);
      raw.__pfCamWrite=true;raw.setTilt?.(0);raw.setHeading?.(0);
      raw.fitBounds(bounds,{top:52,right:46,bottom:112,left:46});
      setTimeout(()=>{if(!valid(raw,token,key))return;try{
        raw.__pfCamWrite=true;const z=Number(raw.getZoom?.()||17);if(z>19)raw.setZoom(19);if(z<15)raw.setZoom(15);
        raw.panBy?.(0,-34);applied.set(raw,key);
        const host=document.getElementById('liveHoleMap');if(host){host.dataset.cameraRule='v300-live-6-to-12';host.dataset.cameraAnchor=livePoint(g)?'golfer':'tee'}
      }finally{setTimeout(()=>raw.__pfCamWrite=false,100)}},160);
      setTimeout(()=>raw.__pfCamWrite=false,100);
    }catch(e){raw.__pfCamWrite=false;console.warn('[ParFolio Camera v300]',e)}
  }
  function arm(raw,g){if(!raw||!g)return;interacted.set(raw,false);watch(raw);applied.delete(raw);setTimeout(()=>frame(raw,g,true),80)}
  const init=window.initInlineHoleMap;if(typeof init==='function')window.initInlineHoleMap=async function(g){await init.apply(this,arguments);if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw)arm(inlineHoleMap.raw,g)};
  const update=window.updateGoogleRoundHole;if(typeof update==='function')window.updateGoogleRoundHole=function(){generation++;const raw=inlineHoleMap?.raw;const r=update.apply(this,arguments),g=green();if(raw&&inlineHoleMap?.raw===raw&&g)arm(raw,g);return r};
  const reset=window.resetLiveHoleView;if(typeof reset==='function')window.resetLiveHoleView=function(){generation++;const r=reset.apply(this,arguments),g=green();if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw&&g)arm(inlineHoleMap.raw,g);return r};
  const gps=window.updateInlineGolferPosition;if(typeof gps==='function')window.updateInlineGolferPosition=function(here,g){const r=gps.apply(this,arguments);const raw=inlineHoleMap?.raw;if(raw&&g&&point(here)){window.lastKnownPosition=point(here);if(!interacted.get(raw)){applied.delete(raw);clearTimeout(raw.__pfGpsFrameTimer);raw.__pfGpsFrameTimer=setTimeout(()=>frame(raw,g,true),450)}}return r};
  console.info('[ParFolio] live golfer 6-to-12 camera v300 ready');
})();