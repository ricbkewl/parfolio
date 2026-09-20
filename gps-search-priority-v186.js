/* ParFolio v318 compatibility — GPS state provider only; no post-render DOM rewrites.
   Search ordering is owned by smart-course-search-v176.js. This legacy layer must
   never re-rank active search results or autocomplete suggestions after render. */
(function(){
  function validPoint(p){
    const lat=Number(p?.lat),lng=Number(p?.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0);
  }

  function gpsState(course){
    const audited=window.parfolioAuditedGpsState?.(course);
    if(audited){
      if(audited.key==='ready')return{key:'ready',rank:3,priority:20000,label:'GPS Ready',shortLabel:'GPS Ready'};
      if(audited.key==='partial')return{key:'partial',rank:2,priority:5000,label:'Partial GPS',shortLabel:'Partial GPS'};
      if(audited.key==='located')return{key:'located',rank:2,priority:2500,label:'Course Located',shortLabel:'Located'};
      return{key:'missing',rank:1,priority:0,label:audited.label||'No GPS Location',shortLabel:audited.short||'No Location'};
    }
    const mapped=typeof mappedCount==='function'?mappedCount(course):0,holes=Math.max(1,Number(course?.holes)||18);
    if(mapped>=holes)return{key:'ready',rank:3,priority:20000,label:'GPS Ready',shortLabel:'GPS Ready'};
    if(mapped>0)return{key:'partial',rank:2,priority:5000,label:'Partial GPS',shortLabel:'Partial GPS'};
    if(validPoint(course?.catalog_point))return{key:'located',rank:2,priority:2500,label:'Course Located',shortLabel:'Located'};
    return{key:'missing',rank:1,priority:0,label:'No GPS Location',shortLabel:'No Location'};
  }
  window.smartCourseGpsState=gpsState;

  window.normalizeParFolioGpsIndicators=function(){/* v318: badges are rendered correctly on first paint by the search owner. */};
})();
