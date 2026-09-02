/* ParFolio v168: location-first, viewport-loaded visual course map browser. */
(function(){
  let courseMapBrowser=null;
  let courseMapMarkers=[];
  let courseMapUserMarker=null;
  let courseMapEntries=[];
  let courseMapHeaderCount=null;
  let courseMapMoveTimer=null;

  const INITIAL_RADIUS_MILES=30;
  const INITIAL_MARKER_LIMIT=30;
  const VIEWPORT_MARKER_LIMIT=90;

  const escMap=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function courseMapPoint(course){
    const p=typeof coursePreviewPoint==='function'?coursePreviewPoint(course):null;
    const valid=value=>value&&Number.isFinite(Number(value.lat))&&Number.isFinite(Number(value.lng))&&Math.abs(Number(value.lat))<=90&&Math.abs(Number(value.lng))<=180&&!(Number(value.lat)===0&&Number(value.lng)===0);
    if(valid(p))return{lat:Number(p.lat),lng:Number(p.lng)};
    if(valid(course?.catalog_point))return{lat:Number(course.catalog_point.lat),lng:Number(course.catalog_point.lng)};
    const greens=Array.isArray(course?.greens)?course.greens:[];
    for(const g of greens){
      const q=g?.center||g?.tee||g?.tees?.black||g?.front||g?.back;
      if(valid(q))return{lat:Number(q.lat),lng:Number(q.lng)};
    }
    return null;
  }

  function mapButtonLabel(course){
    if(!adminRole)return'';
    return course?.catalogOnly?'Map':'Edit';
  }

  function mapAdminAction(index,course){
    if(!adminRole)return'';
    const label=mapButtonLabel(course);
    const action=course?.catalogOnly?`mapCatalogCourse(${index})`:`editCourse(${index})`;
    return `<button type="button" class="course-map-admin-action" onclick="closeCourseMapBrowser();${action}">${label}</button>`;
  }

  function popupHtml(course,index){
    const mapped=typeof mappedCount==='function'?mappedCount(course):0;
    const status=mapped?`${mapped} mapped`:course?.catalogOnly?'Catalog only':'GPS available';
    const loc=[course?.city,course?.state].filter(Boolean).join(', ');
    return `<div class="course-map-popup"><b>${escMap(course?.name||'Golf Course')}</b>${loc?`<span>${escMap(loc)}</span>`:''}<small>${Number(course?.holes)||18} holes · ${escMap(status)}</small><div><button type="button" class="course-map-open" onclick="closeCourseMapBrowser();startCourseFromLibrary(${index})">Open Course</button>${mapAdminAction(index,course)}</div></div>`;
  }

  function filteredMapCourses(){
    const list=Array.isArray(courses)?courses:[];
    const q=String(typeof courseLibraryQuery!=='undefined'?courseLibraryQuery:'').trim().toLowerCase();
    return list.map((course,index)=>({course,index,point:courseMapPoint(course)})).filter(x=>x.point&&(!q||[x.course.name,x.course.city,x.course.state,x.course.country].some(v=>String(v||'').toLowerCase().includes(q))));
  }

  function distanceMiles(a,b){
    const R=3958.7613,toRad=x=>x*Math.PI/180;
    const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng),lat1=toRad(a.lat),lat2=toRad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
  }

  function clearCourseMarkers(){
    courseMapMarkers.forEach(marker=>{try{marker.remove()}catch(_){}});
    courseMapMarkers=[];
  }

  function updateHeaderCount(shown,total){
    if(courseMapHeaderCount)courseMapHeaderCount.textContent=`${shown} shown · ${total} located`;
  }

  function addMarkers(entries){
    if(!courseMapBrowser)return;
    clearCourseMarkers();
    entries.forEach(({course,index,point})=>{
      const icon=L.divIcon({className:'parfolio-course-map-marker-wrap',html:'<span class="parfolio-course-map-marker">⛳</span>',iconSize:[38,38],iconAnchor:[19,36],popupAnchor:[0,-34]});
      const marker=L.marker([point.lat,point.lng],{icon,title:course.name||'Golf Course'}).addTo(courseMapBrowser).bindPopup(popupHtml(course,index),{maxWidth:270,closeButton:true});
      courseMapMarkers.push(marker);
    });
    updateHeaderCount(entries.length,courseMapEntries.length);
  }

  function entriesInsideCurrentView(){
    if(!courseMapBrowser)return[];
    const bounds=courseMapBrowser.getBounds().pad(.18);
    const center=courseMapBrowser.getCenter();
    return courseMapEntries
      .filter(e=>bounds.contains([e.point.lat,e.point.lng]))
      .map(e=>({...e,viewDistance:distanceMiles({lat:center.lat,lng:center.lng},e.point)}))
      .sort((a,b)=>a.viewDistance-b.viewDistance)
      .slice(0,VIEWPORT_MARKER_LIMIT);
  }

  function refreshVisibleMarkers(){
    const visible=entriesInsideCurrentView();
    addMarkers(visible);
  }

  function scheduleViewportRefresh(){
    clearTimeout(courseMapMoveTimer);
    courseMapMoveTimer=setTimeout(refreshVisibleMarkers,120);
  }

  function showLocalArea(here){
    if(!courseMapBrowser)return;
    if(courseMapUserMarker)try{courseMapUserMarker.remove()}catch(_){}
    courseMapUserMarker=L.circleMarker([here.lat,here.lng],{radius:7,weight:3,fillOpacity:1}).addTo(courseMapBrowser).bindTooltip('You are here',{direction:'top'});

    const nearby=courseMapEntries
      .map(e=>({...e,miles:distanceMiles(here,e.point)}))
      .filter(e=>e.miles<=INITIAL_RADIUS_MILES)
      .sort((a,b)=>a.miles-b.miles)
      .slice(0,INITIAL_MARKER_LIMIT);

    if(nearby.length>=2){
      const bounds=L.latLngBounds([[here.lat,here.lng],...nearby.map(e=>[e.point.lat,e.point.lng])]);
      courseMapBrowser.fitBounds(bounds,{padding:[44,44],maxZoom:12,animate:false});
    }else{
      courseMapBrowser.setView([here.lat,here.lng],11,{animate:false});
    }
    addMarkers(nearby);
  }

  function fallbackLocalArea(){
    const fallback=courseMapEntries[0]?.point||{lat:34.05,lng:-117.45};
    courseMapBrowser.setView([fallback.lat,fallback.lng],10,{animate:false});
    setTimeout(refreshVisibleMarkers,0);
  }

  function destroyMap(){
    clearTimeout(courseMapMoveTimer);
    clearCourseMarkers();
    if(courseMapBrowser){try{courseMapBrowser.remove()}catch(_){}courseMapBrowser=null;}
    courseMapUserMarker=null;courseMapEntries=[];courseMapHeaderCount=null;
  }

  window.closeCourseMapBrowser=function(){
    destroyMap();
    document.querySelector('.course-map-browser')?.remove();
    document.body.classList.remove('course-map-browser-open');
  };

  window.openCourseMapBrowser=function(){
    closeCourseMapBrowser();
    courseMapEntries=filteredMapCourses();
    const overlay=document.createElement('section');
    overlay.className='course-map-browser';
    overlay.innerHTML=`<header class="course-map-browser-header"><button type="button" class="course-map-back" aria-label="Back to course list">‹</button><div><b>Course Map</b><small class="course-map-visible-count">Finding nearby courses…</small></div><button type="button" class="course-map-list-button">List</button></header><div id="courseMapBrowserCanvas" class="course-map-browser-canvas" aria-label="Map of golf courses"></div><button type="button" class="course-map-locate" aria-label="Center map on my location">⌖</button>`;
    document.body.appendChild(overlay);
    document.body.classList.add('course-map-browser-open');
    courseMapHeaderCount=overlay.querySelector('.course-map-visible-count');
    overlay.querySelector('.course-map-back')?.addEventListener('click',closeCourseMapBrowser);
    overlay.querySelector('.course-map-list-button')?.addEventListener('click',closeCourseMapBrowser);
    if(!window.L){overlay.querySelector('#courseMapBrowserCanvas').innerHTML='<div class="course-map-error">Map could not be loaded.</div>';return;}

    const fallback=courseMapEntries[0]?.point||{lat:34.05,lng:-117.45};
    courseMapBrowser=L.map('courseMapBrowserCanvas',{zoomControl:false,attributionControl:true}).setView([fallback.lat,fallback.lng],10);
    if(typeof addStreetLayer==='function')addStreetLayer(courseMapBrowser);else L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(courseMapBrowser);
    L.control.zoom({position:'bottomright'}).addTo(courseMapBrowser);
    courseMapBrowser.on('moveend zoomend',scheduleViewportRefresh);

    const locate=overlay.querySelector('.course-map-locate');
    function locateMe(){
      if(!navigator.geolocation){fallbackLocalArea();return;}
      locate?.classList.add('loading');
      navigator.geolocation.getCurrentPosition(pos=>{
        locate?.classList.remove('loading');
        showLocalArea({lat:pos.coords.latitude,lng:pos.coords.longitude});
      },()=>{
        locate?.classList.remove('loading');
        fallbackLocalArea();
      },{enableHighAccuracy:false,timeout:6500,maximumAge:300000});
    }
    locate?.addEventListener('click',locateMe);
    setTimeout(locateMe,120);
  };

  function installMapButton(){
    if(s?.v!=='coursesView')return;
    if(document.querySelector('.course-map-launch'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='course-map-launch';
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5 8.5 4l7 2.5 5-2.5v13.5l-5 2.5-7-2.5-5 2.5V6.5Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M8.5 4v13.5M15.5 6.5V20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg><span>Map</span>';
    button.setAttribute('aria-label','Show courses on map');
    button.addEventListener('click',openCourseMapBrowser);
    document.body.appendChild(button);
  }

  function removeMapButtonOutsideCourses(){
    if(s?.v!=='coursesView')document.querySelector('.course-map-launch')?.remove();
  }

  const priorRender=window.render;
  if(typeof priorRender==='function')window.render=function(){const out=priorRender.apply(this,arguments);setTimeout(()=>{removeMapButtonOutsideCourses();installMapButton();},0);return out;};
  const priorCourses=window.coursesView||window.coursesView;
  if(typeof priorCourses==='function')window.coursesView=function(){const out=priorCourses.apply(this,arguments);setTimeout(installMapButton,0);return out;};
  setTimeout(installMapButton,300);
})();
