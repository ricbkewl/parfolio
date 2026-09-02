/* ParFolio v188 — render audited California mapping states without DOM observer loops. */
(function(){
  let scheduled=false;
  function courseForName(name){return (Array.isArray(courses)?courses:[]).find(c=>c.name===name)}
  function state(course){return window.parfolioAuditedGpsState?.(course)||null}
  function repair(){
    scheduled=false;
    document.querySelectorAll('.course-library-card').forEach(card=>{
      const name=card.querySelector('.course-name-start')?.textContent?.trim(),course=courseForName(name),s=state(course);if(!course||!s)return;
      const meta=card.querySelector('.course-card-info small');
      if(meta){
        const distance=(meta.textContent.match(/·\s*[0-9.]+\s*MI/i)||[])[0]||'';
        const desired=`${Number(course.holes)||'—'} HOLES · ${s.label}${distance?` ${distance}`:''}`;
        if(meta.textContent!==desired)meta.textContent=desired;
      }
    });
    window.repairParFolioCaliforniaStatuses?.(document);
  }
  function scheduleRepair(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(repair);
  }
  new MutationObserver(scheduleRepair).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(scheduleRepair,300);
})();
