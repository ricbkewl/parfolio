/* ParFolio v193 — Offline Courses: persist nearby GPS-ready course packages for no-signal play. */
(function(){
  const VERSION=193, DB_NAME='parfolio-offline-v1', STORE='courses', RADIUS_MILES=30;
  const validPoint=p=>p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lng))<=180&&!(Number(p.lat)===0&&Number(p.lng)===0);
  const stableKey=c=>String(c?.parfolioCatalogId||c?.openGolfApiId||c?.id||'').trim();
  const distMiles=(a,b)=>{const R=3958.7613,toRad=v=>Number(v)*Math.PI/180,dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
  let cache=new Map(),dbPromise=null;

  function openDb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    return dbPromise;
  }
  async function allPackages(){const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});}
  async function putPackage(pkg){const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readwrite').objectStore(STORE).put(pkg);req.onsuccess=()=>resolve(pkg);req.onerror=()=>reject(req.error);});}
  async function deletePackage(key){const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readwrite').objectStore(STORE).delete(key);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);});}

  function cloneCourse(c){
    return {id:c.id,name:c.name,holes:Number(c.holes)||18,pars:Array.isArray(c.pars)?c.pars:[],greens:Array.isArray(c.greens)?c.greens:[],city:c.city||'',state:c.state||'',postal_code:c.postal_code||'',country:c.country||'',country_code:c.country_code||'',address:c.address||'',catalog_point:c.catalog_point||null,par_total:c.par_total||null,course_type:c.course_type||'',parfolioCatalogId:c.parfolioCatalogId||null,parfolioMappingClass:c.parfolioMappingClass||null,parfolioMappedHoleCount:c.parfolioMappedHoleCount||0,openGolfApiId:c.openGolfApiId||null,sourceLicense:c.sourceLicense||'',sourceAttribution:c.sourceAttribution||'',osmCourseUri:c.osmCourseUri||null,catalogApproved:c.catalogApproved!==false,catalogOnly:false,offlineReady:true};
  }
  function geometryComplete(c){const holes=Number(c?.holes)||0,greens=Array.isArray(c?.greens)?c.greens:[];return [9,18].includes(holes)&&greens.length===holes&&greens.every(g=>validPoint(g?.tee||g?.tees?.black)&&validPoint(g?.center));}

  async function hydrateForDownload(course){
    if(geometryComplete(course))return true;
    if(course?.parfolioMappingClass!=='gps_ready')throw new Error('Only GPS Ready courses can be downloaded for offline hole maps.');
    if(course?.parfolioTexasAudit&&typeof window.hydrateParFolioTexasCourse==='function')await window.hydrateParFolioTexasCourse(course);
    else if(course?.parfolioCaliforniaAudit&&typeof window.hydrateParFolioCaliforniaCourse==='function')await window.hydrateParFolioCaliforniaCourse(course);
    else if(course?.parfolioCatalogId&&typeof db!=='undefined'){
      const {data,error}=await db.rpc('parfolio_course_payload',{p_course_id:course.parfolioCatalogId});if(error)throw error;
      const rows=Array.isArray(data?.greens)?data.greens:[],holes=Number(data?.holes)||Number(course.holes)||0;
      const point=(lat,lng)=>{const p={lat:Number(lat),lng:Number(lng)};return validPoint(p)?p:null};
      if(![9,18].includes(holes)||rows.length!==holes)throw new Error('Offline package is incomplete.');
      course.holes=holes;course.greens=rows.map((g,i)=>({tee:point(g?.tee?.lat,g?.tee?.lng),tees:{black:point(g?.tee?.lat,g?.tee?.lng)},aim1:point(g?.aim1?.lat,g?.aim1?.lng),aim2:point(g?.aim2?.lat,g?.aim2?.lng),front:point(g?.front?.lat,g?.front?.lng),center:point(g?.center?.lat,g?.center?.lng),back:point(g?.back?.lat,g?.back?.lng),route:g?.route||null,_source:g?.source||'offline-catalog',_hole:Number(g?.hole)||i+1}));
      const pars=rows.map(g=>Number(g?.par));if(pars.length===holes&&pars.every(p=>p>=2&&p<=7))course.pars=pars;
    }
    if(!geometryComplete(course))throw new Error('Validated hole geometry could not be prepared for offline use.');
    return true;
  }

  async function downloadCourse(course){
    const key=stableKey(course);if(!key)throw new Error('This course does not have a stable download reference.');
    await hydrateForDownload(course);
    const pkg={key,version:VERSION,downloadedAt:new Date().toISOString(),course:cloneCourse(course)};await putPackage(pkg);cache.set(key,pkg);course.offlineReady=true;decorate();return pkg;
  }
  async function removeCourse(course){const key=stableKey(course);if(!key)return;await deletePackage(key);cache.delete(key);course.offlineReady=false;decorate();}

  function mergeOfflinePackage(pkg){
    const saved=pkg?.course;if(!saved)return;
    let idx=(courses||[]).findIndex(c=>stableKey(c)===pkg.key);
    if(idx<0&&saved.openGolfApiId)idx=(courses||[]).findIndex(c=>String(c?.openGolfApiId||'')===String(saved.openGolfApiId));
    if(idx>=0){const prior=courses[idx];courses[idx]={...saved,...prior,greens:geometryComplete(saved)?saved.greens:prior.greens,pars:saved.pars?.length?saved.pars:prior.pars,holes:saved.holes||prior.holes,offlineReady:true,offlineDownloadedAt:pkg.downloadedAt};}
    else courses.push({...saved,offlineReady:true,offlineDownloadedAt:pkg.downloadedAt});
  }
  async function restore(){try{for(const pkg of await allPackages()){cache.set(pkg.key,pkg);mergeOfflinePackage(pkg);}if(typeof render==='function')render();decorate();}catch(e){console.warn('Offline course restore failed',e);}}

  function getPosition(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Location is not available on this device.'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),reject,{enableHighAccuracy:true,timeout:12000,maximumAge:120000});});}
  function nearbyGpsReady(origin){return (courses||[]).map(c=>({course:c,point:c?.catalog_point,distance:validPoint(c?.catalog_point)?distMiles(origin,c.catalog_point):Infinity})).filter(x=>x.distance<=RADIUS_MILES&&x.course?.parfolioMappingClass==='gps_ready').sort((a,b)=>a.distance-b.distance);}

  function close(){document.querySelector('.pf-offline-overlay')?.remove();}
  function fmtDate(v){try{return new Date(v).toLocaleDateString();}catch{return'';}}
  function rowHtml(item){const c=item.course,key=stableKey(c),pkg=cache.get(key),ready=!!pkg;return `<div class="pf-offline-row"><div class="pf-offline-copy"><b>${esc(c.name||'Golf Course')}</b><span>${esc(c.city||'')}${c.state?`, ${esc(c.state)}`:''}${Number.isFinite(item.distance)?` · ${item.distance.toFixed(1)} mi`:''}</span><small>${ready?`✓ Offline Ready · ${fmtDate(pkg.downloadedAt)}`:'GPS Ready · not downloaded'}</small></div><button type="button" data-offline-key="${esc(key)}" data-action="${ready?'remove':'download'}">${ready?'Remove':'Download'}</button></div>`;}

  async function showOfflineManager(){
    close();const overlay=document.createElement('div');overlay.className='pf-offline-overlay';overlay.innerHTML=`<section class="pf-offline-sheet" role="dialog" aria-modal="true" aria-label="Offline Courses"><header><div><small>PARFOLIO</small><b>Offline Courses</b></div><button type="button" data-close aria-label="Close">×</button></header><div class="pf-offline-intro">Download GPS-ready courses before you play. GPS yardages and saved hole geometry remain available when cellular data disappears.</div><div class="pf-offline-actions"><button type="button" class="primary" data-nearby>Find courses within ${RADIUS_MILES} miles</button></div><div class="pf-offline-status">${navigator.onLine?'Online':'Offline'} · ${cache.size} course${cache.size===1?'':'s'} downloaded</div><div class="pf-offline-list"><div class="pf-offline-empty">Tap “Find courses” to see nearby GPS-ready courses.</div></div></section>`;document.body.appendChild(overlay);
    overlay.addEventListener('click',async e=>{
      if(e.target===overlay||e.target.closest('[data-close]'))return close();
      if(e.target.closest('[data-nearby]')){
        const btn=e.target.closest('[data-nearby]'),list=overlay.querySelector('.pf-offline-list');btn.disabled=true;btn.textContent='Locating…';
        try{const origin=await getPosition(),items=nearbyGpsReady(origin);list.innerHTML=items.length?`<div class="pf-offline-bulk"><b>${items.length} GPS-ready course${items.length===1?'':'s'} nearby</b><button type="button" data-download-all>Download All</button></div>${items.map(rowHtml).join('')}`:'<div class="pf-offline-empty">No GPS-ready courses were found within 30 miles.</div>';}
        catch(err){list.innerHTML=`<div class="pf-offline-empty">${esc(err?.message||'Could not access your location.')}</div>`;}
        finally{btn.disabled=false;btn.textContent=`Refresh courses within ${RADIUS_MILES} miles`;}
        return;
      }
      const action=e.target.closest('[data-action]');if(action){const key=action.dataset.offlineKey,course=(courses||[]).find(c=>stableKey(c)===key);if(!course)return;action.disabled=true;const old=action.textContent;action.textContent=action.dataset.action==='remove'?'Removing…':'Downloading…';try{if(action.dataset.action==='remove')await removeCourse(course);else await downloadCourse(course);await showOfflineManager();}catch(err){alert(err?.message||'Offline download failed.');action.disabled=false;action.textContent=old;}return;}
      if(e.target.closest('[data-download-all]')){
        const btn=e.target.closest('[data-download-all]'),rows=[...overlay.querySelectorAll('[data-action="download"]')];btn.disabled=true;let done=0;for(const row of rows){const key=row.dataset.offlineKey,course=(courses||[]).find(c=>stableKey(c)===key);if(!course)continue;btn.textContent=`Downloading ${done+1}/${rows.length}…`;try{await downloadCourse(course);done++;}catch(err){console.warn('Offline bulk download skipped',course.name,err);}}await showOfflineManager();
      }
    });
  }
  window.showParFolioOfflineCourses=showOfflineManager;window.downloadParFolioCourse=downloadCourse;window.removeParFolioOfflineCourse=removeCourse;

  const priorStart=typeof startCourseFromLibrary==='function'?startCourseFromLibrary:null;
  if(priorStart)startCourseFromLibrary=async function(index){const course=courses?.[index],pkg=cache.get(stableKey(course));if(pkg?.course&&geometryComplete(pkg.course)){course.greens=pkg.course.greens;course.pars=pkg.course.pars;course.holes=pkg.course.holes;course.catalogOnly=false;course.offlineReady=true;}return priorStart(index);};

  function decorate(){
    let button=document.querySelector('.pf-offline-fab');if(!button){button=document.createElement('button');button.type='button';button.className='pf-offline-fab';button.innerHTML='<span>⇩</span><b>Offline</b>';button.addEventListener('click',showOfflineManager);document.body.appendChild(button);}
    const playing=!!document.querySelector('#roundMapHole,.round-map-shell,.play-map');button.hidden=playing;
    document.querySelectorAll('.smart-course-row,.course-card').forEach(row=>{const name=row.querySelector('b,h3,.course-name')?.textContent?.trim(),course=(courses||[]).find(c=>c.name===name);if(!course?.offlineReady||row.querySelector('.pf-offline-badge'))return;const badge=document.createElement('span');badge.className='pf-offline-badge';badge.textContent='✓ Offline Ready';row.appendChild(badge);});
  }
  new MutationObserver(()=>requestAnimationFrame(decorate)).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('online',decorate);window.addEventListener('offline',decorate);
  restore();setTimeout(decorate,300);
})();

/* v194 UI bootstrap: country-code phone entry and one Edit action for map editing. */
(function(){
  if(document.querySelector('script[data-parfolio-ui-v194]'))return;
  const script=document.createElement('script');script.src='ui-consistency-v194.js?v=194';script.async=false;script.dataset.parfolioUiV194='1';document.head.appendChild(script);
})();
