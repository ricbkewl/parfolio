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

  const priorRanked=typeof rankedSharedCourses==='function'?rankedSharedCourses:null;
  if(priorRanked){
    rankedSharedCourses=function(){
      const rows=priorRanked();
      const query=String(typeof courseLibraryQuery!=='undefined'?courseLibraryQuery:'').trim();
      if(!query)return rows;
      return rows.map(row=>{
        const gps=gpsState(row.course);
        const relevance=Number(row.relevance)||Number(window.smartCourseSearchScore?.(row.course,query))||0;
        return{...row,gps,_v186Score:gps.priority*100000000+relevance*100000+(Number(row.score)||0)%100000};
      }).sort((a,b)=>b._v186Score-a._v186Score||String(a.course?.name||'').localeCompare(String(b.course?.name||'')));
    };
  }

  function setBadge(badge,gps,kind){
    if(!badge)return;
    const className=`${kind} ${gps.key}`,label=kind==='smart-gps-badge'?`● ${gps.label}`:gps.shortLabel;
    if(badge.className!==className)badge.className=className;
    if(badge.getAttribute('aria-label')!==gps.label)badge.setAttribute('aria-label',gps.label);
    if(kind==='smart-gps-badge'){
      if(badge.textContent!==label)badge.textContent=label;
    }else{
      const desired=`<i>◎</i>${label}`;
      if(badge.innerHTML!==desired)badge.innerHTML=desired;
    }
  }

  function normalizeIndicators(root=document){
    root.querySelectorAll?.('.smart-course-row').forEach(row=>{
      const name=row.querySelector('.smart-course-copy b')?.textContent?.trim();
      const course=(typeof courses!=='undefined'&&Array.isArray(courses)?courses:[]).find(c=>c?.name===name);if(!course)return;
      setBadge(row.querySelector('.smart-gps-badge'),gpsState(course),'smart-gps-badge');
    });
    const suggestionBox=root.querySelector?.('.smart-course-suggestions');
    if(suggestionBox){
      const buttons=[...suggestionBox.querySelectorAll('button')];
      buttons.forEach(button=>{
        const name=button.querySelector('b')?.textContent?.trim();
        const course=(typeof courses!=='undefined'&&Array.isArray(courses)?courses:[]).find(c=>c?.name===name);if(!course)return;
        const gps=gpsState(course);button.dataset.gpsPriority=String(gps.priority);
        setBadge(button.querySelector('.smart-search-status'),gps,'smart-search-status');
      });
      const sorted=[...buttons].sort((a,b)=>Number(b.dataset.gpsPriority||0)-Number(a.dataset.gpsPriority||0));
      const changed=sorted.some((button,index)=>button!==buttons[index]);
      if(changed)sorted.forEach(button=>suggestionBox.appendChild(button));
    }
  }
  window.normalizeParFolioGpsIndicators=normalizeIndicators;
  new MutationObserver(()=>normalizeIndicators()).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(normalizeIndicators,300);
})();
