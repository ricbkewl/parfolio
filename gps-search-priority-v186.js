/* ParFolio v186 — GPS-first search priority and three-color GPS indicator.
   Green = complete GPS Ready. Yellow = usable course location / incomplete GPS.
   Red = no usable location or quarantined geometry. */
(function(){
  function validPoint(p){
    const lat=Number(p?.lat),lng=Number(p?.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0);
  }

  function gpsState(course){
    const audited=window.parfolioAuditedGpsState?.(course);
    if(audited){
      if(audited.key==='ready')return{key:'ready',rank:3,priority:20000,label:'GPS Ready',shortLabel:'GPS Ready'};
      if(audited.key==='partial')return{key:'located',rank:2,priority:5000,label:'Partial GPS',shortLabel:'Partial GPS'};
      if(audited.key==='located')return{key:'located',rank:2,priority:2500,label:'Course Located',shortLabel:'Located'};
      return{key:'missing',rank:1,priority:0,label:audited.label||'No GPS Location',shortLabel:audited.short||'No Location'};
    }
    const mapped=typeof mappedCount==='function'?mappedCount(course):0,holes=Math.max(1,Number(course?.holes)||18);
    if(mapped>=holes)return{key:'ready',rank:3,priority:20000,label:'GPS Ready',shortLabel:'GPS Ready'};
    if(mapped>0)return{key:'located',rank:2,priority:5000,label:'Partial GPS',shortLabel:'Partial GPS'};
    if(validPoint(course?.catalog_point))return{key:'located',rank:2,priority:2500,label:'Course Located',shortLabel:'Located'};
    return{key:'missing',rank:1,priority:0,label:'No GPS Location',shortLabel:'No Location'};
  }
  window.smartCourseGpsState=gpsState;

  // Re-rank the full search result list. Keep the existing relevance matcher,
  // but make GPS readiness the strongest quality signal among matched courses.
  const priorRanked=window.rankedSharedCourses||globalThis.rankedSharedCourses;
  if(typeof priorRanked==='function'){
    const wrapped=function(){
      const rows=priorRanked();
      if(!String(globalThis.courseLibraryQuery||'').trim())return rows;
      return rows.map(row=>{
        const gps=gpsState(row.course);
        const relevance=Number(row.relevance)||Number(window.smartCourseSearchScore?.(row.course,globalThis.courseLibraryQuery||''))||0;
        return{...row,gps,_v186Score:gps.priority*100000000+relevance*100000+(Number(row.score)||0)%100000};
      }).sort((a,b)=>b._v186Score-a._v186Score||String(a.course?.name||'').localeCompare(String(b.course?.name||'')));
    };
    window.rankedSharedCourses=globalThis.rankedSharedCourses=wrapped;
  }

  function normalizeIndicators(root=document){
    root.querySelectorAll?.('.smart-course-row').forEach(row=>{
      const name=row.querySelector('.smart-course-copy b')?.textContent?.trim();
      const course=(globalThis.courses||[]).find(c=>c?.name===name);if(!course)return;
      const gps=gpsState(course),badge=row.querySelector('.smart-gps-badge');
      if(badge){badge.className=`smart-gps-badge ${gps.key}`;badge.textContent=`● ${gps.label}`;}
    });
    const suggestionBox=root.querySelector?.('.smart-course-suggestions');
    if(suggestionBox){
      const buttons=[...suggestionBox.querySelectorAll('button')];
      buttons.forEach(button=>{
        const name=button.querySelector('b')?.textContent?.trim();
        const course=(globalThis.courses||[]).find(c=>c?.name===name);if(!course)return;
        const gps=gpsState(course),badge=button.querySelector('.smart-search-status');
        button.dataset.gpsRank=String(gps.rank);button.dataset.gpsPriority=String(gps.priority);
        if(badge){badge.className=`smart-search-status ${gps.key}`;badge.setAttribute('aria-label',gps.label);badge.innerHTML=`<i>◎</i>${gps.shortLabel}`;}
      });
      // The original autocomplete function is closure-scoped. Reorder its
      // already-matched six suggestions so complete GPS courses float first.
      buttons.sort((a,b)=>Number(b.dataset.gpsPriority||0)-Number(a.dataset.gpsPriority||0)).forEach(b=>suggestionBox.appendChild(b));
    }
  }
  window.normalizeParFolioGpsIndicators=normalizeIndicators;
  new MutationObserver(()=>normalizeIndicators()).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(normalizeIndicators,300);
})();
