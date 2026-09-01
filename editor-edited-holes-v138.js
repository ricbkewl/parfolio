/* Version 140: clickable hole-status navigator plus edited-hole map references. */
(function(){
  function editorHoleReady(g){return Boolean((g?.tees?.black||g?.tee)&&g?.center)}
  function editedHoleIndices(){
    return (draft?.greens||[]).map((g,i)=>editorHoleReady(g)?i+1:null).filter(Boolean);
  }
  function editedHolesVisible(){return localStorage.atgEditorEditedHoles!=='off'}
  window.toggleEditedHoleReferences=function(){
    localStorage.atgEditorEditedHoles=editedHolesVisible()?'off':'on';
    render();
  };
  window.highlightEditedHole=function(hole){
    if(!draft||hole===draft.mapHole)return;
    draft._referenceHole=Number(hole)||null;
    render();
  };
  window.goToEditorHole=async function(hole){
    if(!draft)return;
    const target=Math.max(1,Math.min(Number(hole)||1,draft.holes||draft.greens?.length||1));
    if(target===draft.mapHole)return;
    /* Protect current work before allowing a non-sequential jump. */
    if(typeof autoSaveCurrentCourseHole==='function'){
      const ok=await autoSaveCurrentCourseHole();
      if(!ok)return;
    }
    const g=draft.greens?.[target-1]||{};
    const point=(g.tees?.black||g.tee||g.aim1||g.aim2||g.center||g.front||g.back);
    draft.mapHole=target;
    draft._referenceHole=null;
    /* Edited holes open centered on their mapped location. Unmapped holes retain
       the current camera so the mapper can continue walking the course naturally. */
    if(point)draft.mapView={lat:Number(point.lat),lng:Number(point.lng),zoom:18};
    render();
  };
  function referenceStrip(){
    if(!draft?.greens?.length)return'';
    const edited=editedHoleIndices(),current=draft.mapHole||1,visible=editedHolesVisible();
    const pills=Array.from({length:draft.holes||draft.greens.length},(_,i)=>{
      const h=i+1,done=edited.includes(h),active=h===current,ref=h===draft._referenceHole;
      const status=active?'Current':done?'Edited':'Not mapped';
      return `<button type="button" class="edited-hole-pill ${done?'done':''} ${active?'current':''} ${ref?'reference':''}" onclick="goToEditorHole(${h})" aria-current="${active?'true':'false'}" aria-label="Go to Hole ${h}. ${status}">${done||active?`Hole ${h}${done?' ✓':''}`:`Hole ${h}`}</button>`;
    }).join('');
    return `<section class="edited-holes-panel"><div><small>HOLE STATUS</small><b>${edited.length} mapped</b><span>Tap any hole to go directly there. Your current hole is auto-saved before switching.</span></div><button type="button" class="edited-holes-toggle ${visible?'on':''}" onclick="toggleEditedHoleReferences()">${visible?'Hide':'Show'} references</button><div class="edited-hole-strip">${pills}</div></section>`;
  }
  function getRawGoogleMap(){
    try{return map?.raw||map?._raw||map?.googleMap||null}catch{return null}
  }
  function routeLabelPoint(route){
    if(!route?.length)return null;
    if(route.length===1)return route[0];
    const middle=Math.floor((route.length-1)/2);
    const a=route[middle],b=route[Math.min(middle+1,route.length-1)];
    return {lat:(a.lat+b.lat)/2,lng:(a.lng+b.lng)/2};
  }
  function addGoogleReferences(rawMap){
    if(!rawMap||!editedHolesVisible()||!draft)return;
    const current=draft.mapHole||1,focus=draft._referenceHole;
    (draft.greens||[]).forEach((g,i)=>{
      const h=i+1;if(h===current||!editorHoleReady(g))return;
      const route=holeRoute(g);if(route.length<2)return;
      const emphasized=h===focus;
      new google.maps.Polyline({map:rawMap,path:route.map(googlePoint),strokeColor:emphasized?'#f1c75b':'#ffffff',strokeOpacity:emphasized?.9:.42,strokeWeight:emphasized?5:2,zIndex:emphasized?5:1});
      const tee=selectedTee(g)||g.tee,center=g.center,labelPoint=routeLabelPoint(route);
      if(tee)new google.maps.Marker({map:rawMap,position:googlePoint(tee),title:`Hole ${h} tee`,icon:{path:google.maps.SymbolPath.CIRCLE,scale:emphasized?7:5,fillColor:emphasized?'#f1c75b':'#ffffff',fillOpacity:.9,strokeColor:'#173126',strokeWeight:1.5},zIndex:emphasized?7:2});
      if(center)new google.maps.Marker({map:rawMap,position:googlePoint(center),title:`Hole ${h} green`,icon:{path:google.maps.SymbolPath.CIRCLE,scale:emphasized?6:4,fillColor:'#176b45',fillOpacity:.85,strokeColor:'#ffffff',strokeWeight:1.5},zIndex:emphasized?6:2});
      if(labelPoint)new google.maps.Marker({map:rawMap,position:googlePoint(labelPoint),title:`Hole ${h}`,label:{text:`Hole ${h}`,color:'#173126',fontSize:'12px',fontWeight:'800'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:12,fillColor:emphasized?'#f1c75b':'#ffffff',fillOpacity:.92,strokeColor:'#173126',strokeOpacity:.3,strokeWeight:1},zIndex:emphasized?10:8});
    });
  }
  function addLeafletReferences(leafletMap){
    if(!leafletMap||!editedHolesVisible()||!draft||!window.L)return;
    const current=draft.mapHole||1,focus=draft._referenceHole;
    (draft.greens||[]).forEach((g,i)=>{
      const h=i+1;if(h===current||!editorHoleReady(g))return;
      const route=holeRoute(g);if(route.length<2)return;
      const emphasized=h===focus;
      L.polyline(route.map(p=>[p.lat,p.lng]),{color:emphasized?'#f1c75b':'#ffffff',weight:emphasized?5:2,opacity:emphasized?.9:.45,dashArray:emphasized?null:'6 7',interactive:false}).addTo(leafletMap);
      const tee=selectedTee(g)||g.tee,labelPoint=routeLabelPoint(route);
      if(tee)L.circleMarker([tee.lat,tee.lng],{radius:emphasized?7:5,color:'#173126',weight:1.5,fillColor:emphasized?'#f1c75b':'#ffffff',fillOpacity:.9,interactive:false}).addTo(leafletMap);
      if(g.center)L.circleMarker([g.center.lat,g.center.lng],{radius:emphasized?6:4,color:'#fff',weight:1.5,fillColor:'#176b45',fillOpacity:.85,interactive:false}).addTo(leafletMap);
      if(labelPoint)L.marker([labelPoint.lat,labelPoint.lng],{interactive:false,icon:L.divIcon({className:'edited-hole-label-icon',html:`<span class="edited-hole-map-label ${emphasized?'emphasized':''}">Hole ${h}</span>`,iconSize:[72,26],iconAnchor:[36,13]})}).addTo(leafletMap);
    });
  }
  const priorMapCourse138=mapCourse;
  mapCourse=function(){
    priorMapCourse138();
    const toolbar=app.querySelector('.map-toolbar')||app.querySelector('.editor-provider-toggle');
    if(toolbar&&!app.querySelector('.edited-holes-panel'))toolbar.insertAdjacentHTML('beforebegin',referenceStrip());
  };
  const priorInitMap138=initMap;
  initMap=async function(){
    await priorInitMap138();
    if(!draft||!editedHolesVisible())return;
    setTimeout(()=>{
      try{
        if((draft.mapProvider||'maptiler')==='google')addGoogleReferences(getRawGoogleMap());
        else addLeafletReferences(map);
      }catch(error){console.warn('Edited-hole reference overlay unavailable',error)}
    },80);
  };
})();
