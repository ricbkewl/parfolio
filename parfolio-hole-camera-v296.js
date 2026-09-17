/* ParFolio v297 — Google-only deterministic round-hole camera.
   One Google Maps instance. Satellite map remains owned by google-maps-clean-v269.
   No Leaflet, OSM, MapTiler, secondary renderer, flyover, polling, or camera loop.
   Camera contract on vector-capable Google Maps: tee at lower viewport (~90%),
   green center at upper viewport (~10%), tee->green toward 12 o'clock, maximum
   practical tilt. Framing is corrected after heading/tilt using the actual viewport. */
(function(){
  const MAX_TILT=67.5;
  const TOP_FRAC=.10;
  const BOTTOM_FRAC=.90;
  const applied=new WeakMap();

  function point(v){if(!v)return null;const lat=Number(v.lat),lng=Number(v.lng);return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null}
  function bearing(a,b){const p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,d=(b.lng-a.lng)*Math.PI/180;const y=Math.sin(d)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(d);return(Math.atan2(y,x)*180/Math.PI+360)%360}
  function currentGreen(){try{return selectedRoundCourse()?.greens?.[Number(s?.hole||1)-1]||null}catch{return null}}
  function vectorReady(raw){try{return raw?.getRenderingType?.()===google.maps.RenderingType.VECTOR}catch{return false}}
  function sig(g){const t=point(selectedTee(g)),c=point(g?.center);return t&&c?`${Number(s?.hole||1)}:${t.lat.toFixed(7)}:${t.lng.toFixed(7)}:${c.lat.toFixed(7)}:${c.lng.toFixed(7)}`:''}

  function project(raw,p){
    try{const pr=raw.getProjection?.();const b=raw.getBounds?.();if(!pr||!b)return null;const sw=pr.fromLatLngToPoint(b.getSouthWest()),ne=pr.fromLatLngToPoint(b.getNorthEast()),q=pr.fromLatLngToPoint(new google.maps.LatLng(p));const host=raw.getDiv();const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return null;return{x:(q.x-sw.x)/(ne.x-sw.x)*w,y:(ne.y-q.y)/(ne.y-sw.y)*h,w,h}}catch{return null}
  }

  function apply(raw,g){
    const tee=point(selectedTee(g)),green=point(g?.center),key=sig(g);if(!tee||!green||!key||applied.get(raw)===key||!vectorReady(raw))return false;
    try{
      // First orient. Keep Google's route-fit zoom as the safe starting scale.
      raw.moveCamera({center:{lat:(tee.lat+green.lat)/2,lng:(tee.lng+green.lng)/2},zoom:Number(raw.getZoom?.()||17),heading:bearing(tee,green),tilt:MAX_TILT});
      google.maps.event.addListenerOnce(raw,'idle',()=>{
        try{
          const tp=project(raw,tee),gp=project(raw,green);if(!tp||!gp)return;
          const desiredTop=gp.h*TOP_FRAC,desiredBottom=tp.h*BOTTOM_FRAC;
          const actualSpan=Math.max(1,tp.y-gp.y),desiredSpan=Math.max(1,desiredBottom-desiredTop);
          const zoomDelta=Math.log2(desiredSpan/actualSpan);
          const nextZoom=Math.max(15,Math.min(19.5,Number(raw.getZoom?.()||17)+zoomDelta));
          // Center vertically between the desired tee/green positions after scaling.
          raw.moveCamera({zoom:nextZoom,heading:bearing(tee,green),tilt:MAX_TILT});
          google.maps.event.addListenerOnce(raw,'idle',()=>{
            try{
              const t2=project(raw,tee),g2=project(raw,green);if(!t2||!g2)return;
              const desiredMid=(desiredTop+desiredBottom)/2,actualMid=(t2.y+g2.y)/2;
              raw.panBy(0,actualMid-desiredMid);
              applied.set(raw,key);
              const host=document.getElementById('liveHoleMap');if(host){host.dataset.cameraRule='v297-google-only-post-rotation';host.dataset.cameraTilt=String(MAX_TILT)}
            }catch(e){console.warn('[ParFolio Camera v297] center correction skipped',e)}
          });
        }catch(e){console.warn('[ParFolio Camera v297] framing correction skipped',e)}
      });
      return true;
    }catch(e){console.warn('[ParFolio Camera v297] camera skipped',e);return false}
  }

  function arm(raw,g){if(!raw||!g)return;try{if(google?.maps?.RenderingType?.VECTOR&&typeof raw.setRenderingType==='function'&&!vectorReady(raw))raw.setRenderingType(google.maps.RenderingType.VECTOR)}catch{}try{google.maps.event.addListenerOnce(raw,'idle',()=>apply(raw,g))}catch{}}
  const priorInit=window.initInlineHoleMap;if(typeof priorInit==='function')window.initInlineHoleMap=async function(g){await priorInit.apply(this,arguments);if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw)arm(inlineHoleMap.raw,g)};
  const priorUpdate=window.updateGoogleRoundHole;if(typeof priorUpdate==='function')window.updateGoogleRoundHole=function(){const r=priorUpdate.apply(this,arguments),g=currentGreen();if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw&&g)arm(inlineHoleMap.raw,g);return r};
  const priorReset=window.resetLiveHoleView;if(typeof priorReset==='function')window.resetLiveHoleView=function(){const r=priorReset.apply(this,arguments),g=currentGreen();if(inlineHoleMap?.provider==='google'&&inlineHoleMap.raw&&g){applied.delete(inlineHoleMap.raw);arm(inlineHoleMap.raw,g)}return r};
  console.info('[ParFolio] Google-only post-rotation hole camera v297 ready');
})();
