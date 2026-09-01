/* Version 118: keep the course editor exactly where the previous hole was completed.
   Next/Previous Hole preserve center, zoom, provider and map style so mapping can continue naturally. */
(function(){
  function captureEditorView(){
    if(!draft||!map)return null;
    try{
      const center=map.getCenter();
      if(!center)return null;
      const lat=typeof center.lat==='function'?center.lat():center.lat;
      const lng=typeof center.lng==='function'?center.lng():center.lng;
      const zoom=Number(map.getZoom());
      if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng)))return null;
      return {lat:Number(lat),lng:Number(lng),zoom:Number.isFinite(zoom)?zoom:17};
    }catch{return null;}
  }

  function preserveThroughHoleChange(action){
    if(!draft){action();return;}
    const heldView=captureEditorView()||draft.mapView&&{...draft.mapView};
    const heldProvider=draft.mapProvider||'maptiler';
    const heldStyle=draft.mapStyle||'satellite';

    /* Allow the normal hole-change routine to do everything else it already does. */
    action();

    /* render() is synchronous and schedules the new map initialization with setTimeout.
       Restore the camera state before that initialization runs. */
    if(draft&&heldView){
      draft.mapView={...heldView};
      draft.mapProvider=heldProvider;
      draft.mapStyle=heldStyle;
      draft.skipMapViewSave=false;
    }
  }

  if(typeof mapNext==='function'){
    const originalMapNext=mapNext;
    mapNext=function(){preserveThroughHoleChange(()=>originalMapNext());};
  }

  if(typeof mapPrev==='function'){
    const originalMapPrev=mapPrev;
    mapPrev=function(){preserveThroughHoleChange(()=>originalMapPrev());};
  }
})();
