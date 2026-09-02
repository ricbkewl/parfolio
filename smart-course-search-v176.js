/* ParFolio v176 — unified smart course discovery/search.
   Keeps the existing floating 6-o'clock Map launcher and shared course catalog. */
(function(){
  let visibleLimit=25;
  let lastQuery='';

  const STOP=new Set(['golf','course','courses','club','clubs','the','at','of','and','near','around','in','me','country']);
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/&/g,' and ').replace(/\bst[.]?\b/g,'saint').replace(/\bmt[.]?\b/g,'mount')
    .replace(/\bgc\b/g,'golf club').replace(/\bcc\b/g,'country club')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const escSmart=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tokens=value=>norm(value).split(' ').filter(Boolean);
  const meaningful=value=>tokens(value).filter(t=>!STOP.has(t)&&!/^\d+$/.test(t));

  function levenshtein(a,b){
    a=String(a||'');b=String(b||'');
    if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;
    const prev=Array.from({length:b.length+1},(_,i)=>i),cur=new Array(b.length+1);
    for(let i=1;i<=a.length;i++){
      cur[0]=i;
      for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      for(let j=0;j<=b.length;j++)prev[j]=cur[j];
    }
    return prev[b.length];
  }

  function fuzzyTokenScore(qt,fieldTokens){
    let best=0;
    for(const ft of fieldTokens){
      if(ft===qt)best=Math.max(best,80);
      else if(ft.startsWith(qt)||qt.startsWith(ft))best=Math.max(best,55);
      else if(qt.length>=4&&ft.length>=4){
        const d=levenshtein(qt,ft),max=Math.max(qt.length,ft.length);
        if(d<=1)best=Math.max(best,48);
        else if(d===2&&max>=6)best=Math.max(best,30);
      }
    }
    return best;
  }

  function searchInfo(course,index,query){
    const q=norm(query);
    const name=norm(course?.name),city=norm(course?.city),state=norm(course?.state),postal=norm(course?.postal_code),country=norm(course?.country||course?.country_code),address=norm(course?.address);
    const all=[name,city,state,postal,country,address].filter(Boolean).join(' ');
    let relevance=0;
    if(!q)return{match:true,relevance:0};

    const cleaned=meaningful(q).join(' '),qTokens=tokens(q).filter(t=>!['near','around','in','me'].includes(t));
    if(name===q||name===cleaned)relevance+=10000;
    if(name.startsWith(q)||cleaned&&name.startsWith(cleaned))relevance+=6500;
    if(name.includes(q)||cleaned&&name.includes(cleaned))relevance+=4300;
    if(city===q||state===q||postal===q||country===q)relevance+=3600;
    if([city,state,postal,country].some(v=>v&&q.includes(v)))relevance+=1600;
    if(all.includes(q))relevance+=2300;

    const fieldTokens=tokens(all),nameTokens=tokens(name);
    let tokenHits=0;
    for(const qt of qTokens){
      if(STOP.has(qt))continue;
      let tokenScore=fuzzyTokenScore(qt,nameTokens);
      if(!tokenScore)tokenScore=Math.round(fuzzyTokenScore(qt,fieldTokens)*.55);
      if(tokenScore){relevance+=tokenScore;tokenHits++;}
    }

    const wants18=/\b18\s*(hole|holes)?\b/.test(q),wants9=/\b9\s*(hole|holes)?\b/.test(q);
    if(wants18&&Number(course?.holes)===18)relevance+=900;
    if(wants9&&Number(course?.holes)===9)relevance+=900;
    if(/mapped|gps|gps ready/.test(q)&&typeof mappedCount==='function'&&mappedCount(course)>0)relevance+=1000;

    const meaningfulCount=qTokens.filter(t=>!STOP.has(t)&&!/^(9|18)$/.test(t)&&!/^holes?$/.test(t)).length;
    const match=relevance>0||(meaningfulCount===0&&(wants18||wants9));
    return{match,relevance};
  }

  window.smartCourseMatchesQuery=function(course,query){return searchInfo(course,0,query).match};
  window.smartCourseSearchScore=function(course,query){return searchInfo(course,0,query).relevance};

  const originalRanked=typeof rankedSharedCourses==='function'?rankedSharedCourses:null;
  rankedSharedCourses=function(){
    const favorites=typeof favoriteCourseIds==='function'?favoriteCourseIds():new Set(),recent=typeof recentCourseIds==='function'?recentCourseIds():[];
    return (Array.isArray(courses)?courses:[]).map((course,index)=>{
      const distance=typeof courseDistanceMiles==='function'?courseDistanceMiles(course):null;
      const recentIndex=recent.indexOf(course.id);
      let discovery=0;
      if(favorites.has(course.id))discovery+=100000;
      if(recentIndex>=0)discovery+=20000-recentIndex*100;
      if(distance!==null)discovery+=Math.max(0,10000-distance*100);
      if(typeof mappedCount==='function')discovery+=mappedCount(course)*8;
      const search=searchInfo(course,index,courseLibraryQuery||'');
      return{course,index,distance,score:courseLibraryQuery?search.relevance*100000+discovery:discovery,searchMatch:search.match,relevance:search.relevance};
    }).sort((a,b)=>b.score-a.score||a.course.name.localeCompare(b.course.name));
  };

  function gpsBadge(course){
    const mapped=typeof mappedCount==='function'?mappedCount(course):0,holes=Number(course?.holes)||18;
    if(mapped>=holes)return'<span class="smart-gps-badge ready">● GPS Ready</span>';
    if(mapped>0)return'<span class="smart-gps-badge partial">● Partial GPS</span>';
    return'<span class="smart-gps-badge catalog">Course Catalog</span>';
  }

  function compactCard(course,index,distance){
    const favorite=typeof favoriteCourseIds==='function'&&favoriteCourseIds().has(course.id),loc=[course.city,course.state].filter(Boolean).join(', '),miles=distance===null?'':` · ${distance<10?distance.toFixed(1):Math.round(distance)} mi`;
    return `<article class="smart-course-row"><button class="smart-course-main" onclick="startCourseFromLibrary(${index})"><span class="smart-course-pin">⛳</span><span class="smart-course-copy"><b>${escSmart(course.name)}</b><small>${escSmart(loc||course.country||'Location pending')}${miles}</small><em>${Number(course.holes)||18} holes ${gpsBadge(course)}</em></span><i>›</i></button><button class="smart-row-favorite ${favorite?'on':''}" onclick="toggleCourseFavorite('${escSmart(course.id)}',event)" aria-label="${favorite?'Remove from':'Add to'} favorites">${favorite?'★':'☆'}</button>${adminRole?`<button class="smart-row-admin" onclick="${course.catalogOnly?'mapCatalogCourse':'editCourse'}(${index})">${course.catalogOnly?'Map':'Edit'}</button>`:''}</article>`;
  }

  const originalCard=typeof courseLibraryCard==='function'?courseLibraryCard:null;
  courseLibraryCard=function(course,index,distance=null){
    if(String(courseLibraryQuery||'').trim())return compactCard(course,index,distance);
    return originalCard?originalCard(course,index,distance):compactCard(course,index,distance);
  };

  function suggestionsFor(query){
    if(norm(query).length<2)return[];
    return (Array.isArray(courses)?courses:[]).map((course,index)=>({course,index,info:searchInfo(course,index,query),distance:typeof courseDistanceMiles==='function'?courseDistanceMiles(course):null}))
      .filter(x=>x.info.match).sort((a,b)=>b.info.relevance-a.info.relevance||(a.distance??Infinity)-(b.distance??Infinity)).slice(0,6);
  }

  function renderSuggestions(query){
    const box=document.querySelector('.smart-course-suggestions');if(!box)return;
    const rows=suggestionsFor(query);
    box.classList.toggle('hidden',!rows.length);
    box.innerHTML=rows.map(({course})=>`<button type="button" onclick="smartCourseChoose('${escSmart(course.name).replace(/'/g,'&#39;')}')"><b>${escSmart(course.name)}</b><span>${escSmart([course.city,course.state].filter(Boolean).join(', ')||course.country||'')}</span></button>`).join('');
  }

  window.smartCourseChoose=function(value){
    const input=document.querySelector('.course-library-search input');if(input)input.value=value;
    filterSharedCourses(value);
    document.querySelector('.smart-course-suggestions')?.classList.add('hidden');
  };

  filterSharedCourses=function(value){
    courseLibraryQuery=String(value||'').trim().toLowerCase();
    if(courseLibraryQuery!==lastQuery){visibleLimit=25;lastQuery=courseLibraryQuery;}
    refreshCourseLibrary();renderSuggestions(value);
  };

  refreshCourseLibrary=function(){
    const grid=document.getElementById('courseLibraryGrid');if(!grid)return;
    for(const previewMap of coursePreviewMaps){try{previewMap.remove()}catch{}}coursePreviewMaps=[];
    const query=courseLibraryQuery;
    const filtered=rankedSharedCourses().filter(item=>(!query||item.searchMatch)&&courseMatchesFilters(item.course));
    const searching=Boolean(query),filtering=activeCourseFilterCount()>0;
    const visible=searching||filtering?filtered.slice(0,visibleLimit):filtered.slice(0,7);
    grid.classList.toggle('smart-search-active',searching);
    grid.innerHTML=visible.map(item=>courseLibraryCard(item.course,item.index,item.distance)).join('');
    if((searching||filtering)&&filtered.length>visible.length){
      grid.insertAdjacentHTML('beforeend',`<button type="button" class="smart-show-more" onclick="smartCourseShowMore()">Show 25 More <small>${visible.length} of ${filtered.length}</small></button>`);
    }
    const empty=document.getElementById('courseLibraryEmpty');if(empty)empty.classList.toggle('hidden',visible.length>0);
    const heading=document.getElementById('courseResultsHeading');if(heading)heading.textContent=searching?`${filtered.length} Course${filtered.length===1?'':'s'} Found`:filtering?`${filtered.length} Course${filtered.length===1?'':'s'} Found`:'Nearby & Recommended';
    const count=document.getElementById('courseFilterCount');if(count){count.textContent=activeCourseFilterCount()||'';count.classList.toggle('hidden',!activeCourseFilterCount())}
    if(!searching)setTimeout(initCoursePreviews,0);
  };

  window.smartCourseShowMore=function(){visibleLimit+=25;refreshCourseLibrary()};

  window.smartQuickFilter=function(name,value=true){
    if(name==='holes')courseLibraryFilters.holes=courseLibraryFilters.holes===value?null:value;
    else courseLibraryFilters[name]=!courseLibraryFilters[name];
    decorateQuickFilters();refreshCourseLibrary();
  };

  function quickChip(label,name,value=true){
    const on=name==='holes'?courseLibraryFilters.holes===value:courseLibraryFilters[name]===true;
    return `<button type="button" class="smart-quick-chip ${on?'on':''}" onclick="smartQuickFilter('${name}',${typeof value==='string'?`'${value}'`:value})">${label}</button>`;
  }

  function decorateQuickFilters(){
    const row=document.querySelector('.smart-course-quick-filters');if(!row)return;
    row.innerHTML=quickChip('Near Me','nearby')+quickChip('Favorites','favorites')+quickChip('GPS Ready','mapped')+quickChip('18 Holes','holes','18');
  }

  function decorateCourses(){
    if(typeof s==='undefined'||s.v!=='coursesView')return;
    const tools=document.querySelector('.course-discovery-tools');if(!tools)return;
    const label=tools.querySelector('.course-library-search');
    const input=label?.querySelector('input');
    if(input){
      input.placeholder='Search course, city, ZIP or area';
      input.setAttribute('autocomplete','off');
      input.setAttribute('spellcheck','false');
      if(!label.querySelector('.smart-course-suggestions'))label.insertAdjacentHTML('beforeend','<div class="smart-course-suggestions hidden"></div>');
      if(!input.dataset.smartBound){input.dataset.smartBound='1';input.addEventListener('focus',()=>renderSuggestions(input.value));input.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('.smart-course-suggestions')?.classList.add('hidden')});}
    }
    document.querySelector('.course-location-search-panel')?.remove();
    if(!document.querySelector('.smart-course-quick-filters'))tools.insertAdjacentHTML('afterend','<div class="smart-course-quick-filters"></div>');
    decorateQuickFilters();
    const sub=document.querySelector('h1 + .muted');if(sub)sub.textContent='Find nearby courses or search the complete ParFolio course library.';
    const resultSub=document.querySelector('.course-results-heading span');if(resultSub)resultSub.textContent='Closest and most relevant first';
  }

  const priorCourses176=window.coursesView||coursesView;
  window.coursesView=coursesView=function(){const out=priorCourses176.apply(this,arguments);setTimeout(()=>{decorateCourses();refreshCourseLibrary();},0);return out;};

  // Keep UI decoration in sync when existing filter sheet actions rerender results.
  const priorSetFilter=window.setCourseFilter||setCourseFilter;
  if(typeof priorSetFilter==='function')window.setCourseFilter=setCourseFilter=function(){const out=priorSetFilter.apply(this,arguments);setTimeout(decorateQuickFilters,0);return out;};
  const priorClear=window.clearCourseFilters||clearCourseFilters;
  if(typeof priorClear==='function')window.clearCourseFilters=clearCourseFilters=function(){const out=priorClear.apply(this,arguments);setTimeout(decorateQuickFilters,0);return out;};

  setTimeout(decorateCourses,250);
})();