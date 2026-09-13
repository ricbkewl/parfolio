/* ParFolio v212 search interaction hardening. */
(function(){
  const priorQuick=window.smartQuickFilter;
  if(typeof priorQuick==='function')window.smartQuickFilter=function(name,value=true){
    if(name==='holes')value=Number(value)||null;
    return priorQuick(name,value);
  };

  // Later GPS-first ranking can otherwise let courses matching only one word of
  // a multi-word query outrank the intended fuzzy match. Require every
  // meaningful term to match somewhere before GPS priority is applied.
  const STRICT_STOP=new Set(['golf','course','courses','club','clubs','the','at','of','and','near','around','in','me','country','hole','holes']);
  const strictNorm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/&/g,' and ').replace(/\bst[.]?\b/g,'saint').replace(/\bmt[.]?\b/g,'mount')
    .replace(/\bgc\b/g,'golf club').replace(/\bcc\b/g,'country club')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const strictTerms=value=>strictNorm(value).split(' ').filter(t=>t&&!STRICT_STOP.has(t)&&!/^\d+$/.test(t));
  function strictLev(a,b){
    if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;
    const prev=Array.from({length:b.length+1},(_,i)=>i),cur=new Array(b.length+1);
    for(let i=1;i<=a.length;i++){
      cur[0]=i;
      for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      for(let j=0;j<=b.length;j++)prev[j]=cur[j];
    }
    return prev[b.length];
  }
  function strictTokenMatch(qt,ft){
    if(ft===qt)return true;
    if(Math.min(ft.length,qt.length)>=3&&(ft.startsWith(qt)||qt.startsWith(ft)))return true;
    if(qt.length<4||ft.length<4)return false;
    const d=strictLev(qt,ft),max=Math.max(qt.length,ft.length);
    return d<=1||(d===2&&max>=6);
  }
  function strictMultiMatch(course,query){
    const normalized=strictNorm(query);
    if(/^\d{3,5}$/.test(normalized))return String(course?.postal_code||'').startsWith(normalized);
    const terms=strictTerms(query);if(!terms.length)return null;
    const fields=[course?.name,course?.city,course?.state,course?.postal_code,course?.country,course?.country_code,course?.address]
      .filter(Boolean).flatMap(v=>strictNorm(v).split(' ').filter(Boolean));
    return terms.every(qt=>fields.some(ft=>strictTokenMatch(qt,ft)));
  }

  const priorSmartMatch=window.smartCourseMatchesQuery;
  if(typeof priorSmartMatch==='function')window.smartCourseMatchesQuery=function(course,query){
    const strict=strictMultiMatch(course,query);
    return strict===null?priorSmartMatch(course,query):strict;
  };

  const priorRankedStrict=typeof rankedSharedCourses==='function'?rankedSharedCourses:null;
  if(priorRankedStrict)rankedSharedCourses=function(){
    const rows=priorRankedStrict.apply(this,arguments);
    const query=String(typeof courseLibraryQuery!=='undefined'?courseLibraryQuery:'').trim();
    return rows.map(row=>{const strict=strictMultiMatch(row.course,query);return {...row,searchMatch:strict===null?row.searchMatch:strict}});
  };

  // Autocomplete names may contain apostrophes. Handle suggestion selection in
  // capture phase so text is read from the DOM instead of interpolated JS.
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.smart-course-suggestions button');
    if(!button)return;
    const name=button.querySelector('b')?.textContent?.trim();
    if(!name)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.smartCourseChoose?.(name);
  },true);

  // The map browser's original filter expects one literal substring. Convert
  // smart multi-field or typo searches to the strongest useful map context.
  const priorOpenMap=window.openCourseMapBrowser;
  if(typeof priorOpenMap==='function')window.openCourseMapBrowser=function(){
    const original=String(typeof courseLibraryQuery!=='undefined'?courseLibraryQuery:'').trim();
    if(!original)return priorOpenMap();
    const literal=(Array.isArray(courses)?courses:[]).some(c=>[c?.name,c?.city,c?.state,c?.country].some(v=>String(v||'').toLowerCase().includes(original.toLowerCase())));
    if(literal)return priorOpenMap();
    const ranked=(Array.isArray(courses)?courses:[]).map(c=>({c,score:window.smartCourseSearchScore?.(c,original)||0})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    const top=ranked[0]?.c;
    if(!top)return priorOpenMap();
    const q=original.toLowerCase();
    const context=[top.city,top.state,top.postal_code,top.country].find(v=>v&&q.includes(String(v).toLowerCase()))||top.city||top.name;
    try{courseLibraryQuery=String(context||original).toLowerCase();return priorOpenMap();}
    finally{courseLibraryQuery=original.toLowerCase();}
  };
})();

/* ParFolio v274 — Recent Searches in Courses.
   Keep the last five courses selected from search ahead of Nearby & Recommended.
   Stored locally only; no profile/private-data coupling. */
(function(){
  const STORAGE_KEY='parfolioRecentCourseSearchesV274';
  const MAX_RECENT=5;
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stableKey=course=>String(course?.parfolioCatalogId||course?.openGolfApiId||course?.id||course?.name||'').trim();

  function readRecent(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
      return Array.isArray(value)?value.slice(0,MAX_RECENT):[];
    }catch{return[];}
  }
  function writeRecent(value){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value.slice(0,MAX_RECENT)));}catch{}
  }
  function resolveRecent(entry){
    const list=Array.isArray(courses)?courses:[];
    return list.find(c=>stableKey(c)===entry.key)||list.find(c=>norm(c?.name)===norm(entry.name));
  }
  function rememberCourse(course){
    if(!course?.name)return;
    const key=stableKey(course),items=readRecent().filter(item=>item.key!==key&&norm(item.name)!==norm(course.name));
    items.unshift({key,name:course.name,at:Date.now()});
    writeRecent(items);
    scheduleRender();
  }
  function findCourseByName(name){return (Array.isArray(courses)?courses:[]).find(c=>norm(c?.name)===norm(name));}

  function gpsLabel(course){
    try{return window.smartCourseGpsState?.(course)?.label||((typeof mappedCount==='function'&&mappedCount(course))?'GPS Mapped':'Course Listed');}
    catch{return'Course Listed';}
  }
  function recentRows(){
    return readRecent().map(entry=>{
      const course=resolveRecent(entry);if(!course)return null;
      const index=(Array.isArray(courses)?courses:[]).indexOf(course);if(index<0)return null;
      const location=[course.city,course.state].filter(Boolean).join(', ')||course.country||'Location available';
      return `<button type="button" class="pf-recent-course-row" onclick="startCourseFromLibrary(${index})"><span class="pf-recent-course-icon">⛳</span><span class="pf-recent-course-copy"><b>${escapeHtml(course.name)}</b><small>${escapeHtml(location)} · ${escapeHtml(gpsLabel(course))}</small></span><i>›</i></button>`;
    }).filter(Boolean);
  }
  function ensureStyle(){
    if(document.getElementById('pf-recent-searches-v274-style'))return;
    const style=document.createElement('style');style.id='pf-recent-searches-v274-style';style.textContent=`
      .pf-recent-searches{margin:18px 0 20px;padding:0}
      .pf-recent-searches-head{display:flex;align-items:center;justify-content:space-between;margin:0 2px 8px}
      .pf-recent-searches-head b{font-size:15px;color:#163f32}
      .pf-recent-searches-head button{border:0;background:transparent;color:#647b72;font-size:12px;font-weight:700;padding:5px 3px}
      .pf-recent-course-list{display:grid;gap:7px}
      .pf-recent-course-row{width:100%;display:flex;align-items:center;gap:10px;text-align:left;border:1px solid #dce6e1;background:#fff;border-radius:14px;padding:11px 12px;color:#173e32;box-shadow:0 2px 8px rgba(25,61,49,.04)}
      .pf-recent-course-icon{font-size:18px;flex:0 0 auto}
      .pf-recent-course-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
      .pf-recent-course-copy b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pf-recent-course-copy small{font-size:11px;color:#708078;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pf-recent-course-row>i{font-style:normal;font-size:22px;color:#8ba098}
    `;document.head.appendChild(style);
  }
  function renderRecent(){
    const existing=document.querySelector('.pf-recent-searches');
    const inCourses=typeof s!=='undefined'&&s?.v==='coursesView';
    const query=String(typeof courseLibraryQuery!=='undefined'?courseLibraryQuery:'').trim();
    const filters=typeof activeCourseFilterCount==='function'?activeCourseFilterCount():0;
    if(!inCourses||query||filters){existing?.remove();return;}
    const rows=recentRows();
    if(!rows.length){existing?.remove();return;}
    ensureStyle();
    const heading=document.querySelector('.course-results-heading');if(!heading)return;
    let section=existing;
    if(!section){section=document.createElement('section');section.className='pf-recent-searches';heading.parentNode.insertBefore(section,heading);}
    section.innerHTML=`<div class="pf-recent-searches-head"><b>Recent Searches</b><button type="button" data-clear-recent-courses>Clear</button></div><div class="pf-recent-course-list">${rows.join('')}</div>`;
    section.querySelector('[data-clear-recent-courses]')?.addEventListener('click',()=>{writeRecent([]);renderRecent();});
  }
  let pending=false;
  function scheduleRender(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;renderRecent();});}

  const priorChoose=window.smartCourseChoose;
  if(typeof priorChoose==='function')window.smartCourseChoose=function(value){
    const course=findCourseByName(value);if(course)rememberCourse(course);
    const out=priorChoose.apply(this,arguments);setTimeout(scheduleRender,0);return out;
  };

  const priorStart=typeof startCourseFromLibrary==='function'?startCourseFromLibrary:null;
  if(priorStart)window.startCourseFromLibrary=startCourseFromLibrary=function(index){
    try{
      const query=String(typeof courseLibraryQuery!=='undefined'?courseLibraryQuery:'').trim();
      const course=Array.isArray(courses)?courses[index]:null;
      if(query&&course)rememberCourse(course);
    }catch{}
    return priorStart.apply(this,arguments);
  };

  const priorRefresh=typeof refreshCourseLibrary==='function'?refreshCourseLibrary:null;
  if(priorRefresh)window.refreshCourseLibrary=refreshCourseLibrary=function(){const out=priorRefresh.apply(this,arguments);setTimeout(scheduleRender,0);return out;};

  new MutationObserver(scheduleRender).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  setTimeout(scheduleRender,300);
})();
