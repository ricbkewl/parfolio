/* ParFolio v188 — audited California catalog + validated GPS loader.
   ParFolio-private catalog data is merged by stable OpenGolf ID first.
   Complete GPS payloads are hydrated lazily at play time so 1,146 California
   courses remain searchable without hundreds of startup geometry requests. */
(function(){
  const STATE='CA';
  const VERSION=188;
  let loading=null,statusRepairScheduled=false;
  const hydrated=new Set();
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const validPoint=p=>p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lng))<=180&&!(Number(p.lat)===0&&Number(p.lng)===0);
  const point=(lat,lng)=>{const p={lat:Number(lat),lng:Number(lng)};return validPoint(p)?p:null};
  const actualMappedCount=course=>(course?.greens||[]).filter(g=>(g?.tee||g?.tees?.black)&&g?.center).length;

  function findIndex(row){
    let idx=(courses||[]).findIndex(c=>String(c?.openGolfApiId||'')===String(row.source_id||''));
    if(idx>=0)return idx;
    const key=norm(row.name),city=norm(row.city);
    return (courses||[]).findIndex(c=>norm(c?.name)===key&&(!city||!c?.city||norm(c.city)===city));
  }

  function mergeRow(row){
    const idx=findIndex(row),location=point(row.lat,row.lng),mapping=String(row.mapping_class||'location_pending');
    const common={parfolioCatalogId:row.catalog_id,parfolioMappingClass:mapping,parfolioMappedHoleCount:Number(row.mapped_holes)||0,parfolioCaliforniaAudit:true,openGolfApiId:row.source_id||null,city:row.city||'',state:row.state_code||STATE,postal_code:row.postal_code||'',country:'United States',country_code:row.country_code||'US',address:row.address||'',catalog_point:location,par_total:Number(row.par)||null,course_type:row.course_type||'',sourceLicense:row.source_license||'ODbL-1.0',sourceAttribution:row.source_attribution||'',osmCourseUri:row.osm_course_uri||null,catalogApproved:mapping!=='quarantined',catalogOnly:mapping!=='gps_ready'};
    if(idx>=0){
      const prior=courses[idx],existingMapped=actualMappedCount(prior);
      courses[idx]={...prior,...common,name:prior.name||row.name,holes:Number(row.holes)||prior.holes||18,pars:Array.isArray(prior.pars)?prior.pars:[],greens:Array.isArray(prior.greens)?prior.greens:[]};
      if(existingMapped>=Number(prior.holes||row.holes||18))courses[idx].parfolioPreservedVerifiedGeometry=true;
      return{added:false,course:courses[idx]};
    }
    const holes=Number(row.holes)||18;
    const course={id:`parfolio-ca-${row.catalog_id}`,name:row.name,holes,pars:[],greens:[],...common,course_type:row.course_type||'California Catalog'};
    courses.push(course);return{added:true,course};
  }

  async function fetchCatalog(){
    const rows=[];
    for(let offset=0;;offset+=500){
      const {data,error}=await db.rpc('parfolio_course_catalog_page',{p_state_code:STATE,p_offset:offset,p_limit:500});
      if(error)throw error;
      const page=Array.isArray(data)?data:[];rows.push(...page);
      if(page.length<500)break;
      if(offset>5000)throw new Error('California catalog pagination exceeded safety limit');
    }
    return rows;
  }

  async function hydrateCourse(course){
    if(!course||course.parfolioMappingClass!=='gps_ready'||!course.parfolioCatalogId)return true;
    if(hydrated.has(course.parfolioCatalogId))return true;
    const declared=Number(course.holes)||0,existing=actualMappedCount(course);
    if(declared&&(existing>=declared||course.parfolioPreservedVerifiedGeometry)){hydrated.add(course.parfolioCatalogId);course.catalogOnly=false;return true;}
    const {data,error}=await db.rpc('parfolio_course_payload',{p_course_id:course.parfolioCatalogId});
    if(error)throw error;
    const rows=Array.isArray(data?.greens)?data.greens:[],holes=Number(data?.holes)||declared;
    if(![9,18].includes(holes)||rows.length!==holes)throw new Error('GPS-ready payload is incomplete');
    const greens=rows.map((g,index)=>({tee:point(g?.tee?.lat,g?.tee?.lng),tees:{black:point(g?.tee?.lat,g?.tee?.lng)},aim1:point(g?.aim1?.lat,g?.aim1?.lng),aim2:point(g?.aim2?.lat,g?.aim2?.lng),front:point(g?.front?.lat,g?.front?.lng),center:point(g?.center?.lat,g?.center?.lng),back:point(g?.back?.lat,g?.back?.lng),route:g?.route||null,_review:'parfolio-california-osm-validated',_source:g?.source||'openstreetmap_qlever',_hole:Number(g?.hole)||index+1}));
    if(!greens.every(g=>g.tee&&g.center))throw new Error('GPS-ready payload failed tee/center validation');
    course.holes=holes;course.greens=greens;course.catalogOnly=false;course.parfolioMappedHoleCount=holes;
    const pars=rows.map(g=>Number(g?.par));if(pars.length===holes&&pars.every(p=>Number.isFinite(p)&&p>=2&&p<=7))course.pars=pars;
    hydrated.add(course.parfolioCatalogId);try{localStorage.parfolioCourses=JSON.stringify(courses)}catch{}return true;
  }
  window.hydrateParFolioCaliforniaCourse=hydrateCourse;

  async function loadCalifornia(){
    if(loading)return loading;
    loading=(async()=>{
      const stats={version:VERSION,loaded:false,rows:0,added:0,matched:0,gpsReady:0,partialGps:0,courseLocated:0,locationPending:0,quarantined:0,error:null,loadedAt:null};
      try{
        if(typeof window.loadSharedCourseLibrary==='function')try{await window.loadSharedCourseLibrary({rerender:false})}catch{}
        const rows=await fetchCatalog();stats.rows=rows.length;
        for(const row of rows){const result=mergeRow(row);if(result.added)stats.added++;else stats.matched++;if(row.mapping_class==='gps_ready')stats.gpsReady++;else if(row.mapping_class==='partial_gps')stats.partialGps++;else if(row.mapping_class==='course_located')stats.courseLocated++;else if(row.mapping_class==='location_pending')stats.locationPending++;else if(row.mapping_class==='quarantined')stats.quarantined++;}
        courses.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));try{localStorage.parfolioCourses=JSON.stringify(courses)}catch{}
        stats.loaded=true;stats.loadedAt=new Date().toISOString();window.PARFOLIO_CA_CATALOG=stats;if(typeof render==='function')render();return true;
      }catch(error){stats.error=String(error?.message||error);stats.loadedAt=new Date().toISOString();window.PARFOLIO_CA_CATALOG=stats;console.warn('California catalog load failed',error);return false;}
    })();return loading;
  }
  window.loadParFolioCaliforniaCatalog=loadCalifornia;

  const priorMappedCount=typeof mappedCount==='function'?mappedCount:null;
  mappedCount=function(course){if(course?.parfolioCaliforniaAudit){if(course.parfolioMappingClass==='gps_ready')return Number(course.holes)||Number(course.parfolioMappedHoleCount)||0;if(course.parfolioMappingClass==='partial_gps')return Math.max(1,Number(course.parfolioMappedHoleCount)||0);return 0;}return priorMappedCount?priorMappedCount(course):actualMappedCount(course);};

  const priorStartCourseFromLibrary=startCourseFromLibrary;
  startCourseFromLibrary=async function(index){const course=courses?.[index];if(course?.parfolioCaliforniaAudit&&course.parfolioMappingClass==='quarantined')alert(`${course.name} has ambiguous or unsafe GPS geometry and is not published for GPS play. Scorecard use remains available while the map is reviewed.`);if(course?.parfolioCaliforniaAudit&&course.parfolioMappingClass==='gps_ready'){try{await hydrateCourse(course)}catch(error){console.warn('California GPS hydration failed',error);alert('This course is listed as GPS Ready, but its validated hole payload could not be loaded. Please try again.');return;}}return priorStartCourseFromLibrary(index);};

  function auditedState(course){const m=course?.parfolioMappingClass;if(m==='gps_ready')return{key:'ready',label:'GPS Ready',short:'GPS Ready'};if(m==='partial_gps')return{key:'partial',label:'Partial GPS',short:'Partial GPS'};if(m==='course_located')return{key:'located',label:'Course Located',short:'Located'};if(m==='quarantined')return{key:'missing',label:'Quarantined',short:'Review'};if(m==='location_pending')return{key:'missing',label:'Location Pending',short:'Pending'};return null;}
  window.parfolioAuditedGpsState=auditedState;

  function updateBadge(badge,className,label,html=false){if(!badge)return;if(badge.className!==className)badge.className=className;if(html){if(badge.innerHTML!==label)badge.innerHTML=label;}else if(badge.textContent!==label)badge.textContent=label;}
  function repairStatuses(root=document){
    statusRepairScheduled=false;
    root.querySelectorAll?.('.smart-course-row').forEach(row=>{const name=row.querySelector('.smart-course-copy b')?.textContent?.trim();const course=(courses||[]).find(c=>c.name===name),state=auditedState(course);if(!state)return;const badge=row.querySelector('.smart-gps-badge');updateBadge(badge,`smart-gps-badge ${state.key}`,`● ${state.label}`);});
    root.querySelectorAll?.('.smart-course-suggestions button').forEach(button=>{const name=button.querySelector('b')?.textContent?.trim();const course=(courses||[]).find(c=>c.name===name),state=auditedState(course);if(!state)return;const badge=button.querySelector('.smart-search-status');if(badge?.getAttribute('aria-label')!==state.label)badge?.setAttribute('aria-label',state.label);updateBadge(badge,`smart-search-status ${state.key}`,`<i>◎</i>${state.short}`,true);});
  }
  function scheduleStatusRepair(){if(statusRepairScheduled)return;statusRepairScheduled=true;requestAnimationFrame(()=>repairStatuses(document));}
  window.repairParFolioCaliforniaStatuses=repairStatuses;
  new MutationObserver(scheduleStatusRepair).observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(loadCalifornia,0);
})();
