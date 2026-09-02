/* ParFolio v163: visual course map browser for the Courses screen. */
(function(){
  let courseMapBrowser=null;
  let courseMapMarkers=[];

  const escMap=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function courseMapPoint(course){
    const p=typeof coursePreviewPoint==='function'?coursePreviewPoint(course):null;
    if(p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng)))return{lat:Number(p.lat),lng:Number(p.lng)};
    if(course?.catalog_point&&Number.isFinite(Number(course.catalog_point.lat))&&Number.isFinite(Number(course.catalog_point.lng)))return{lat:Number(course.catalog_point.lat),lng:Number(course.catalog_point.lng)};
    const greens=Array.isArray(course?.greens)?course.greens:[];
    for(const g of greens){
      const q=g?.center||g?.tee||g?.tees?.black||g?.front||g?.back;
      if(q&&Number.isFinite(Number(q.lat))&&Number.isFinite(Number(q.lng)))return{lat:Number(q.lat),lng:Number(q.lng)};
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

  function destroyMap(){
    if(courseMapBrowser){try{courseMapBrowser.remove()}catch(_){}courseMapBrowser=null;}
    courseMapMarkers=[];
  }

  window.closeCourseMapBrowser=function(){
    destroyMap();
    document.querySelector('.course-map-browser')?.remove();
    document.body.classList.remove('course-map-browser-open');
  };

  window.openCourseMapBrowser=function(){
    closeCourseMapBrowser();
    const entries=filteredMapCourses();
    const overlay=document.createElement('section');
    overlay.className='course-map-browser';
    overlay.innerHTML=`<header class="course-map-browser-header"><button type="button" class="course-map-back" aria-label="Back to course list">‹</button><div><b>Course Map</b><small>${entries.length} located course${entries.length===1?'':'s'}</small></div><button type="button" class="course-map-list-button">List</button></header><div id="courseMapBrowserCanvas" class="course-map-browser-canvas" aria-label="Map of golf courses"></div><button type="button" class="course-map-locate" aria-label="Center map on my location">⌖</button>`;
    document.body.appendChild(overlay);
    document.body.classList.add('course-map-browser-open');
    overlay.querySelector('.course-map-back')?.addEventListener('click',closeCourseMapBrowser);
    overlay.querySelector('.course-map-list-button')?.addEventListener('click',closeCourseMapBrowser);
    if(!window.L){overlay.querySelector('#courseMapBrowserCanvas').innerHTML='<div class="course-map-error">Map could not be loaded.</div>';return;}

    const fallback=entries[0]?.point||{lat:34.05,lng:-117.45};
    courseMapBrowser=L.map('courseMapBrowserCanvas',{zoomControl:false,attributionControl:true}).setView([fallback.lat,fallback.lng],10);
    if(typeof addStreetLayer==='function')addStreetLayer(courseMapBrowser);else L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(courseMapBrowser);
    L.control.zoom({position:'bottomright'}).addTo(courseMapBrowser);

    const bounds=[];
    entries.forEach(({course,index,point})=>{
      const icon=L.divIcon({className:'parfolio-course-map-marker-wrap',html:'<span class="parfolio-course-map-marker">⛳</span>',iconSize:[38,38],iconAnchor:[19,36],popupAnchor:[0,-34]});
      const marker=L.marker([point.lat,point.lng],{icon,title:course.name||'Golf Course'}).addTo(courseMapBrowser).bindPopup(popupHtml(course,index),{maxWidth:270,closeButton:true});
      marker.on('click',()=>marker.openPopup());
      courseMapMarkers.push(marker);bounds.push([point.lat,point.lng]);
    });

    function fitAll(){if(bounds.length===1)courseMapBrowser.setView(bounds[0],13);else if(bounds.length>1)courseMapBrowser.fitBounds(bounds,{padding:[42,42],maxZoom:12});}
    fitAll();

    const locate=overlay.querySelector('.course-map-locate');
    locate?.addEventListener('click',()=>{
      if(!navigator.geolocation){fitAll();return;}
      locate.classList.add('loading');
      navigator.geolocation.getCurrentPosition(pos=>{
        locate.classList.remove('loading');
        const here=[pos.coords.latitude,pos.coords.longitude];
        courseMapBrowser.setView(here,11,{animate:true});
        L.circleMarker(here,{radius:7,weight:3,fillOpacity:1}).addTo(courseMapBrowser).bindTooltip('You are here',{permanent:false,direction:'top'});
      },()=>{locate.classList.remove('loading');fitAll()},{enableHighAccuracy:false,timeout:8000,maximumAge:300000});
    });
  };

  function installMapButton(){
    if(s?.v!=='coursesView')return;
    if(document.querySelector('.course-map-launch'))return;
    const tools=document.querySelector('.course-discovery-tools');
    if(!tools)return;
    const button=document.createElement('button');
    button.type='button';button.className='course-map-launch';button.innerHTML='<span>▰</span><b>Map</b>';button.setAttribute('aria-label','Show courses on map');button.addEventListener('click',openCourseMapBrowser);
    tools.insertAdjacentElement('afterend',button);
  }

  const priorRender=window.render;
  if(typeof priorRender==='function'){
    window.render=function(){const out=priorRender.apply(this,arguments);setTimeout(installMapButton,0);return out;};
  }
  const priorCourses=window.coursesView||window.coursesView;
  if(typeof priorCourses==='function'){
    window.coursesView=function(){const out=priorCourses.apply(this,arguments);setTimeout(installMapButton,0);return out;};
  }
  setTimeout(installMapButton,300);
})();