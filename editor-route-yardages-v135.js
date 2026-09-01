/* Version 135: live yardage labels for course-editor route planning. */
(function(){
  function editorRouteTee(g){return g?.tees?.black||g?.tee||null}
  function editorRoutePoints(g){
    const tee=editorRouteTee(g);
    return [
      tee?{key:'tee',label:'Black Tee',point:tee}:null,
      g?.aim1?{key:'aim1',label:'Aim 1',point:g.aim1}:null,
      g?.aim2?{key:'aim2',label:'Aim 2',point:g.aim2}:null,
      g?.center?{key:'center',label:'Center Green',point:g.center}:null
    ].filter(Boolean);
  }
  function editorRouteSegments(g){
    const points=editorRoutePoints(g),segments=[];
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(!a?.point||!b?.point)continue;
      segments.push({from:a,to:b,yards:Math.round(distanceYards(a.point,b.point)),mid:pointBetween(a.point,b.point,.5)});
    }
    return segments;
  }
  function editorRouteTotal(g){return editorRouteSegments(g).reduce((sum,s)=>sum+s.yards,0)}

  function routeSummaryMarkup(){
    if(!draft?.greens?.length)return '';
    const g=draft.greens[draft.mapHole-1]||{},segments=editorRouteSegments(g);
    if(!editorRouteTee(g)||!g.center)return `<div class="editor-route-yardages incomplete" id="editorRouteYardages"><b>Route yardage</b><span>Set Black Tee and Center Green to calculate hole distance.</span></div>`;
    const chips=segments.map(s=>`<span><small>${s.from.label} → ${s.to.label}</small><b>${s.yards} yd</b></span>`).join('');
    return `<div class="editor-route-yardages" id="editorRouteYardages"><div class="editor-route-yardage-title"><div><small>LIVE ROUTE YARDAGE</small><b>Hole ${draft.mapHole}</b></div><strong>${editorRouteTotal(g)} yd total</strong></div><div class="editor-route-yardage-chips">${chips}</div></div>`;
  }

  function insertRouteSummary(){
    const old=document.getElementById('editorRouteYardages');if(old)old.remove();
    const message=document.getElementById('mapMessage');
    if(message)message.insertAdjacentHTML('afterend',routeSummaryMarkup());
    else document.querySelector('.map-toolbar')?.insertAdjacentHTML('afterend',routeSummaryMarkup());
  }

  function googleYardageLabel(rawMap,segment){
    const size=Math.max(21,Math.min(29,18+String(segment.yards).length*2.5));
    return new google.maps.Marker({
      map:rawMap,
      position:googlePoint(segment.mid),
      clickable:false,
      zIndex:900,
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:size,fillColor:'#123f2b',fillOpacity:.88,strokeColor:'#e0bd66',strokeOpacity:.95,strokeWeight:1.5},
      label:{text:`${segment.yards} yd`,color:'#ffffff',fontWeight:'700',fontSize:'12px'}
    });
  }

  function leafletYardageLabel(leafletMap,segment){
    const marker=L.marker([segment.mid.lat,segment.mid.lng],{opacity:0,interactive:false});
    marker.addTo(leafletMap).bindTooltip(`${segment.yards} yd`,{permanent:true,direction:'center',className:'editor-route-yardage-map-label',opacity:1});
    marker.openTooltip();return marker;
  }

  const priorInitMap135=initMap;
  initMap=async function(){
    await priorInitMap135();
    insertRouteSummary();
    if(!draft||!map)return;
    const g=draft.greens?.[draft.mapHole-1]||{},segments=editorRouteSegments(g);
    if(!segments.length)return;
    if((draft.mapProvider||'maptiler')==='google'){
      const raw=map.raw||map._raw||map.googleMap||null;
      if(raw){segments.forEach(segment=>googleYardageLabel(raw,segment));return;}
      /* The provider facade intentionally hides some implementation details on older builds.
         If raw access is unavailable, the summary still supplies the live route yardages. */
      return;
    }
    if(window.L&&map?.addLayer)segments.forEach(segment=>leafletYardageLabel(map,segment));
  };

  const priorMapCourse135=mapCourse;
  mapCourse=function(){priorMapCourse135();setTimeout(insertRouteSummary,0)};
})();
