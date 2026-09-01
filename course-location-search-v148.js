/* Version 148: structured course search by city, state/province, postal code and country. */
(function(){
  const norm=v=>String(v||'').trim().toLowerCase();
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function locationText(c){return [c.city,c.state,c.postal_code,c.country,c.country_code].filter(Boolean).join(', ')}
  function matches(c,f){
    const city=norm(c.city),state=norm(c.state),postal=norm(c.postal_code),country=norm(c.country),countryCode=norm(c.country_code);
    return (!f.city||city.includes(f.city))&&
      (!f.state||state.includes(f.state))&&
      (!f.postal||postal.includes(f.postal))&&
      (!f.country||country.includes(f.country)||countryCode===f.country);
  }
  function values(){return{
    city:norm(document.getElementById('courseLocationCity')?.value),
    state:norm(document.getElementById('courseLocationState')?.value),
    postal:norm(document.getElementById('courseLocationPostal')?.value),
    country:norm(document.getElementById('courseLocationCountry')?.value)
  }}
  window.searchCoursesByLocation=function(){
    const box=document.getElementById('courseLocationResults');if(!box)return;
    const f=values();
    if(!f.city&&!f.state&&!f.postal&&!f.country){box.innerHTML='<div class="course-location-search-empty">Enter at least one location field.</div>';return}
    const found=(Array.isArray(courses)?courses:[]).map((c,index)=>({c,index})).filter(x=>matches(x.c,f)).slice(0,100);
    box.innerHTML=found.length?`<div class="course-location-search-count">${found.length}${found.length===100?'+':''} course${found.length===1?'':'s'} found</div>${found.map(({c,index})=>`<button type="button" class="course-location-result" onclick="startCourseFromLibrary(${index})"><b>${escHtml(c.name)}</b><span>${escHtml(locationText(c)||'Location details pending')}</span><small>${Number(c.holes)||18} holes · ${String(c.sharedMappingStatus||'catalog_only').replaceAll('_',' ')}</small></button>`).join('')}`:'<div class="course-location-search-empty">No courses match those location fields.</div>';
  };
  window.clearCourseLocationSearch=function(){
    ['courseLocationCity','courseLocationState','courseLocationPostal','courseLocationCountry'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
    const box=document.getElementById('courseLocationResults');if(box)box.innerHTML='';
  };
  function panel(){return `<details class="course-location-search-panel"><summary><span>Search by Location</span><small>City · State/Province · ZIP/Postal · Country</small></summary><div class="course-location-search-body"><div class="course-location-fields"><label>City<input id="courseLocationCity" placeholder="e.g. Jakarta"></label><label>State / Province<input id="courseLocationState" placeholder="e.g. California or Bali"></label><label>ZIP / Postal Code<input id="courseLocationPostal" placeholder="e.g. 92336"></label><label>Country<input id="courseLocationCountry" placeholder="e.g. Indonesia or ID"></label></div><div class="course-location-actions"><button type="button" onclick="clearCourseLocationSearch()">Clear</button><button type="button" onclick="searchCoursesByLocation()">Search Location</button></div><div id="courseLocationResults" class="course-location-results"></div></div></details>`}
  const priorCoursesView148=window.coursesView||coursesView;
  window.coursesView=coursesView=function(){
    priorCoursesView148();
    const tools=document.querySelector('.course-discovery-tools');
    if(tools&&!document.querySelector('.course-location-search-panel'))tools.insertAdjacentHTML('afterend',panel());
  };
})();
