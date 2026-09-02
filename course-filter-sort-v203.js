/* ParFolio v203 — scalable Filter & Sort Courses sheet. */
(function(){
  const STORE='parfolioCourseFilterSort:v203';
  const superAdmin=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  const clean=v=>String(v||'').trim();
  const lower=v=>clean(v).toLowerCase();
  const escAttr=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gpsState=c=>typeof window.smartCourseGpsState==='function'?window.smartCourseGpsState(c):(()=>{const mapped=typeof mappedCount==='function'?mappedCount(c):0,holes=Number(c?.holes)||18;if(mapped>=holes)return{key:'ready'};if(mapped>0)return{key:'partial'};if(c?.catalog_point)return{key:'located'};return{key:'missing'}})();
  const defaults={gpsStatus:'all',country:'',stateRegion:'',city:'',offline:false,sortBy:'gps',adminStatus:'all'};
  let extra={...defaults};
  try{extra={...extra,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{}

  function persist(){try{localStorage.setItem(STORE,JSON.stringify(extra))}catch{}}
  function countryOf(c){return clean(c?.country)||clean(c?.country_code)}
  function stateOf(c){return clean(c?.state)||clean(c?.state_code)}
  function cityOf(c){return clean(c?.city)}
  function adminClass(c){return clean(c?.parfolioMappingClass||'').toLowerCase()}
  function filterCount(){
    const f=courseLibraryFilters||{};let n=0;
    if(f.nearby)n++;if(f.favorites)n++;if(f.recent)n++;if(f.holes)n++;if(f.par3)n++;
    if(extra.gpsStatus!=='all'||f.mapped)n++;
    if(extra.country)n++;if(extra.stateRegion)n++;if(extra.city)n++;if(extra.offline)n++;
    if(superAdmin()&&extra.adminStatus!=='all')n++;
    return n;
  }

  const priorMatches=typeof courseMatchesFilters==='function'?courseMatchesFilters:null;
  courseMatchesFilters=function(course){
    if(priorMatches&&!priorMatches(course))return false;
    const f=courseLibraryFilters||{},gps=gpsState(course).key,status=f.mapped?'ready':extra.gpsStatus;
    if(status!=='all'&&gps!==status)return false;
    if(extra.country&&lower(countryOf(course))!==lower(extra.country))return false;
    if(extra.stateRegion&&lower(stateOf(course))!==lower(extra.stateRegion))return false;
    if(extra.city&&lower(cityOf(course))!==lower(extra.city))return false;
    if(extra.offline&&!course?.offlineReady)return false;
    if(superAdmin()&&extra.adminStatus!=='all'&&adminClass(course)!==extra.adminStatus)return false;
    return true;
  };

  const priorRanked=typeof rankedSharedCourses==='function'?rankedSharedCourses:null;
  if(priorRanked)rankedSharedCourses=function(){
    const rows=priorRanked.apply(this,arguments);if(String(courseLibraryQuery||'').trim())return rows;
    const recent=typeof recentCourseIds==='function'?recentCourseIds():[];
    return [...rows].sort((a,b)=>{
      if(extra.sortBy==='nearest')return (a.distance??Infinity)-(b.distance??Infinity)||String(a.course.name).localeCompare(String(b.course.name));
      if(extra.sortBy==='name')return String(a.course.name).localeCompare(String(b.course.name));
      if(extra.sortBy==='recent'){const ai=recent.indexOf(a.course.id),bi=recent.indexOf(b.course.id),ar=ai<0?9999:ai,br=bi<0?9999:bi;return ar-br||String(a.course.name).localeCompare(String(b.course.name));}
      const ga=gpsState(a.course),gb=gpsState(b.course),rank={ready:4,partial:3,located:2,missing:1};return (rank[gb.key]||0)-(rank[ga.key]||0)||(a.distance??Infinity)-(b.distance??Infinity)||String(a.course.name).localeCompare(String(b.course.name));
    });
  };

  activeCourseFilterCount=function(){return filterCount()};

  function optionList(values,selected,label){const unique=[...new Set(values.map(clean).filter(Boolean))].sort((a,b)=>a.localeCompare(b));return `<option value="">${label}</option>`+unique.map(v=>`<option value="${escAttr(v)}" ${v===selected?'selected':''}>${escAttr(v)}</option>`).join('')}
  function currentMatches(){
    const q=String(courseLibraryQuery||'').trim();return (Array.isArray(courses)?courses:[]).filter(c=>courseMatchesFilters(c)&&(!q||(typeof window.smartCourseMatchesQuery==='function'?window.smartCourseMatchesQuery(c,q):[c.name,c.city,c.state,c.country,c.postal_code].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase())))).length;
  }
  function chip(label,value,key='gpsStatus'){const on=extra[key]===value;return `<button type="button" class="pf203-chip ${on?'on':''}" data-extra-key="${key}" data-extra-value="${value}">${label}</button>`}
  function boolChip(label,key,legacy=false){const on=legacy?!!courseLibraryFilters[key]:!!extra[key];return `<button type="button" class="pf203-chip ${on?'on':''}" data-bool-key="${key}" data-legacy="${legacy?'1':'0'}">${label}</button>`}

  renderCourseFilterSheet=function(){
    const sheet=document.querySelector('.course-filter-sheet');if(!sheet)return;
    const all=Array.isArray(courses)?courses:[],countries=all.map(countryOf),states=all.filter(c=>!extra.country||lower(countryOf(c))===lower(extra.country)).map(stateOf),cities=all.filter(c=>(!extra.country||lower(countryOf(c))===lower(extra.country))&&(!extra.stateRegion||lower(stateOf(c))===lower(extra.stateRegion))).map(cityOf),count=currentMatches();
    sheet.classList.add('pf203-filter-sheet');
    sheet.innerHTML=`<header><button type="button" data-close>Cancel</button><b>Filter & Sort Courses</b><span class="pf203-count-badge">${filterCount()||''}</span></header><div class="course-filter-body pf203-body">
      <h3>GPS Status</h3><div class="pf203-grid">${chip('🟢 GPS Ready','ready')}${chip('🟡 Partial GPS','partial')}${chip('🟠 Course Located','located')}${chip('All','all')}</div>
      <h3>Location</h3><div class="pf203-grid compact">${boolChip('📍 Near Me','nearby',true)}</div><div class="pf203-selects"><select data-location="country">${optionList(countries,extra.country,'All Countries')}</select><select data-location="stateRegion">${optionList(states,extra.stateRegion,'All States / Provinces')}</select><select data-location="city">${optionList(cities,extra.city,'All Cities')}</select></div>
      <h3>Course</h3><div class="pf203-grid">${boolChip('18 Holes','holes18')}${boolChip('9 Holes','holes9')}${boolChip('Par 3','par3',true)}</div>
      <h3>My Courses</h3><div class="pf203-grid">${boolChip('★ Favorites','favorites',true)}${boolChip('↻ Recently Played','recent',true)}${boolChip('⇩ Offline','offline')}</div>
      <h3>Sort By</h3><div class="pf203-sort">${[['gps','GPS Ready First'],['nearest','Nearest'],['name','Course Name A–Z'],['recent','Recently Played']].map(([v,l])=>`<label><input type="radio" name="pf203-sort" value="${v}" ${extra.sortBy===v?'checked':''}><span>${l}</span></label>`).join('')}</div>
      ${superAdmin()?`<section class="pf203-admin"><h3>Admin / Audit</h3><div class="pf203-grid">${chip('All','all','adminStatus')}${chip('GPS Ready','gps_ready','adminStatus')}${chip('Partial GPS','partial_gps','adminStatus')}${chip('Course Located','course_located','adminStatus')}${chip('Quarantined','quarantined','adminStatus')}</div><button type="button" class="pf203-indonesia" data-indonesia>Indonesia Audit</button></section>`:''}
    </div><footer><button type="button" data-clear>Clear All</button><button type="button" class="primary" data-apply>Show ${count} Course${count===1?'':'s'}</button></footer>`;
    bindSheet(sheet);
  };

  function bindSheet(sheet){
    sheet.querySelector('[data-close]')?.addEventListener('click',closeCourseFilters);
    sheet.querySelector('[data-clear]')?.addEventListener('click',()=>{courseLibraryFilters={nearby:false,favorites:false,recent:false,holes:null,mapped:false,par3:false,difficulty:null};extra={...defaults};persist();renderCourseFilterSheet();refreshCourseLibrary();decorateQuick();});
    sheet.querySelector('[data-apply]')?.addEventListener('click',()=>{persist();closeCourseFilters();refreshCourseLibrary();decorateQuick();});
    sheet.querySelectorAll('[data-extra-key]').forEach(btn=>btn.addEventListener('click',()=>{extra[btn.dataset.extraKey]=btn.dataset.extraValue;if(btn.dataset.extraKey==='gpsStatus')courseLibraryFilters.mapped=false;persist();renderCourseFilterSheet();refreshCourseLibrary();decorateQuick();}));
    sheet.querySelectorAll('[data-bool-key]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.boolKey;if(key==='holes18'||key==='holes9'){const v=key==='holes18'?18:9;courseLibraryFilters.holes=courseLibraryFilters.holes===v?null:v;}else if(btn.dataset.legacy==='1')courseLibraryFilters[key]=!courseLibraryFilters[key];else extra[key]=!extra[key];persist();renderCourseFilterSheet();refreshCourseLibrary();decorateQuick();}));
    sheet.querySelectorAll('[data-location]').forEach(sel=>sel.addEventListener('change',()=>{const key=sel.dataset.location;extra[key]=sel.value;if(key==='country'){extra.stateRegion='';extra.city='';}if(key==='stateRegion')extra.city='';persist();renderCourseFilterSheet();refreshCourseLibrary();}));
    sheet.querySelectorAll('input[name="pf203-sort"]').forEach(r=>r.addEventListener('change',()=>{extra.sortBy=r.value;persist();refreshCourseLibrary();renderCourseFilterSheet();}));
    sheet.querySelector('[data-indonesia]')?.addEventListener('click',async()=>{if(typeof window.toggleIndonesiaAuditFilter==='function')await window.toggleIndonesiaAuditFilter();closeCourseFilters();refreshCourseLibrary();});
  }

  const priorSmartQuick=window.smartQuickFilter;
  if(typeof priorSmartQuick==='function')window.smartQuickFilter=function(name,value=true){if(name==='mapped'){courseLibraryFilters.mapped=!courseLibraryFilters.mapped;extra.gpsStatus=courseLibraryFilters.mapped?'ready':'all';persist();decorateQuick();refreshCourseLibrary();return;}return priorSmartQuick.apply(this,arguments)};

  function decorateQuick(){
    const row=document.querySelector('.smart-course-quick-filters');if(!row)return;
    row.querySelector('[data-indonesia-audit]')?.classList.add('pf203-hide-audit-chip');
    const gps=[...row.querySelectorAll('button')].find(b=>b.textContent.includes('GPS Ready'));if(gps)gps.classList.toggle('on',extra.gpsStatus==='ready'||!!courseLibraryFilters.mapped);
    const trigger=document.querySelector('[onclick*="showCourseFilters"]');if(trigger){trigger.dataset.activeFilters=String(filterCount());trigger.setAttribute('aria-label',filterCount()?`Filter courses, ${filterCount()} active`:'Filter courses');}
  }

  const style=document.createElement('style');style.textContent=`
    [data-indonesia-audit].pf203-hide-audit-chip{display:none!important}.pf203-filter-sheet{max-height:min(88vh,820px);overflow:hidden}.pf203-filter-sheet header{align-items:center}.pf203-count-badge{min-width:24px;height:24px;border-radius:12px;display:grid;place-items:center;background:#d4ad51;color:#14281f;font-weight:800;font-size:12px}.pf203-body{overflow:auto;padding-bottom:18px}.pf203-body h3{margin:18px 0 9px}.pf203-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pf203-grid.compact{grid-template-columns:1fr}.pf203-chip,.pf203-indonesia{min-height:44px;border:1px solid rgba(126,113,72,.35);border-radius:12px;background:rgba(255,255,255,.72);font-weight:700}.pf203-chip.on{background:#153d2f;color:#fff;border-color:#d4ad51}.pf203-selects{display:grid;gap:8px;margin-top:8px}.pf203-selects select{width:100%;min-height:44px;border-radius:12px;padding:0 12px;border:1px solid rgba(126,113,72,.3);background:#fff}.pf203-sort{display:grid;gap:7px}.pf203-sort label{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(126,113,72,.25);border-radius:12px;background:rgba(255,255,255,.65)}.pf203-admin{margin-top:18px;padding:12px;border-radius:15px;background:rgba(19,61,47,.08);border:1px solid rgba(19,61,47,.18)}.pf203-indonesia{width:100%;margin-top:8px;background:#173d30;color:#fff;border-color:#d4ad51}.course-filter-sheet footer .primary{background:#173d30;color:#fff;border-color:#d4ad51}.course-discovery-tools [onclick*="showCourseFilters"]{position:relative}.course-discovery-tools [onclick*="showCourseFilters"][data-active-filters]:not([data-active-filters="0"])::after{content:attr(data-active-filters);position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#d4ad51;color:#14281f;font:800 11px/18px system-ui;text-align:center}
  `;document.head.appendChild(style);

  const priorCourses=typeof coursesView==='function'?coursesView:null;if(priorCourses)window.coursesView=coursesView=function(){const out=priorCourses.apply(this,arguments);setTimeout(decorateQuick,0);setTimeout(decorateQuick,400);return out};
  new MutationObserver(()=>requestAnimationFrame(decorateQuick)).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(decorateQuick,300);
})();