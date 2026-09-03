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
    if(ft===qt||ft.startsWith(qt)||qt.startsWith(ft))return true;
    if(qt.length<4||ft.length<4)return false;
    const d=strictLev(qt,ft),max=Math.max(qt.length,ft.length);
    return d<=1||(d===2&&max>=6);
  }
  function strictMultiMatch(course,query){
    const terms=strictTerms(query);if(terms.length<2)return null;
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
    if(strictTerms(query).length<2)return rows;
    return rows.map(row=>({...row,searchMatch:strictMultiMatch(row.course,query)===true}));
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