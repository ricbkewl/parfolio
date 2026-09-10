/* ParFolio v260 — travel-friendly per-course offline downloads. */
(function(){
  const validPoint=p=>p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lng))<=180&&!(Number(p.lat)===0&&Number(p.lng)===0);
  const geometryComplete=c=>{const holes=Number(c?.holes)||0,greens=Array.isArray(c?.greens)?c.greens:[];return [9,18].includes(holes)&&greens.length===holes&&greens.every(g=>validPoint(g?.tee||g?.tees?.black)&&validPoint(g?.center));};
  const downloadable=c=>!!c&&(c.offlineReady||c.parfolioMappingClass==='gps_ready'||geometryComplete(c));
  const courseFromRow=row=>{const name=row?.querySelector('b,h3,.course-name')?.textContent?.trim();return name?(courses||[]).find(c=>c.name===name):null;};

  function injectStyle(){
    if(document.getElementById('pf-course-download-v260-style'))return;
    const style=document.createElement('style');style.id='pf-course-download-v260-style';style.textContent=`
      .pf-course-download{display:inline-flex;align-items:center;justify-content:center;gap:4px;margin:7px 0 0 8px;border:1px solid #b8c8c1;border-radius:999px;background:#f7faf8;color:#164b39;padding:6px 9px;font-size:10px;font-weight:800;line-height:1;cursor:pointer}
      .pf-course-download:hover{background:#edf5f1}
      .pf-course-download:disabled{cursor:default;opacity:.72}
      .pf-course-download.is-downloaded{background:#e5f5ec;border-color:#bddcca;color:#146746}
    `;document.head.appendChild(style);
  }

  async function downloadFromRow(event){
    event.preventDefault();event.stopPropagation();
    const button=event.currentTarget,row=button.closest('.smart-course-row,.course-card'),course=courseFromRow(row);if(!course)return;
    if(course.offlineReady)return;
    if(typeof window.downloadParFolioCourse!=='function'){alert('Course download is not ready yet. Please refresh ParFolio and try again.');return;}
    button.disabled=true;button.textContent='Downloading…';
    try{
      await window.downloadParFolioCourse(course);
      course.offlineReady=true;button.classList.add('is-downloaded');button.textContent='✓ Downloaded';button.setAttribute('aria-label',`${course.name} downloaded for offline use`);
    }catch(error){
      button.disabled=false;button.textContent='Download 🗺️';alert(error?.message||'Course download failed.');
    }
  }

  function decorateCourseRows(){
    injectStyle();
    const fab=document.querySelector('.pf-offline-fab');if(fab){fab.innerHTML='<span>⇩</span><b>Download 🗺️</b>';fab.setAttribute('aria-label','Download course maps for offline use');}
    document.querySelectorAll('.smart-course-row,.course-card').forEach(row=>{
      const course=courseFromRow(row);if(!downloadable(course))return;
      let button=row.querySelector('.pf-course-download');
      if(!button){button=document.createElement('button');button.type='button';button.className='pf-course-download';button.addEventListener('click',downloadFromRow);row.appendChild(button);}
      const ready=!!course.offlineReady;button.disabled=ready;button.classList.toggle('is-downloaded',ready);button.textContent=ready?'✓ Downloaded':'Download 🗺️';button.setAttribute('aria-label',ready?`${course.name} downloaded for offline use`:`Download ${course.name} for offline use`);
    });
  }

  let pending=false;
  const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;decorateCourseRows();});};
  new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  window.addEventListener('online',schedule);window.addEventListener('offline',schedule);
  setTimeout(schedule,350);
})();
