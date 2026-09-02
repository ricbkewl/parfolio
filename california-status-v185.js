/* ParFolio v185 — render audited California mapping states consistently. */
(function(){
  function courseForName(name){return (Array.isArray(courses)?courses:[]).find(c=>c.name===name)}
  function state(course){return window.parfolioAuditedGpsState?.(course)||null}
  function repair(){
    document.querySelectorAll('.course-library-card').forEach(card=>{
      const name=card.querySelector('.course-name-start')?.textContent?.trim(),course=courseForName(name),s=state(course);if(!course||!s)return;
      const meta=card.querySelector('.course-card-info small');
      if(meta){
        const distance=(meta.textContent.match(/·\s*[0-9.]+\s*MI/i)||[])[0]||'';
        meta.textContent=`${Number(course.holes)||'—'} HOLES · ${s.label}${distance?` ${distance}`:''}`;
      }
    });
    window.repairParFolioCaliforniaStatuses?.(document);
  }
  new MutationObserver(repair).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(repair,300);
})();
