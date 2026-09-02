/* ParFolio v197 — audited Indonesia catalog + validated GPS loader. */
(function(){
  const COUNTRY_CODE='ID', VERSION=197;
  let loading=null;
  const hydrated=new Set();
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const validPoint=p=>p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lng))<=180&&!(Number(p.lat)===0&&Number(p.lng)===0);
  const point=(lat,lng)=>{const p={lat:Number(lat),lng:Number(lng)};return validPoint(p)?p:null};
  const actualMappedCount=course=>(course?.greens||[]).filter(g=>(g?.tee||g?.tees?.black)&&g?.center).length;

  function findIndex(row){
    let idx=(courses||[]).findIndex(c=>String(c?.parfolioCatalogId||'')===String(row.id||''));
    if(idx>=0)return idx;
    idx=(courses||[]).findIndex(c=>String(c?.osmCourseUri||c?.osmId||'')===String(row.osm_course_uri||''));
    if(idx>=0)return idx;
    const key=norm(row.name);
    return (courses||[]).findIndex(c=>norm(c?.name)===key&&String(c?.country_code||'').toUpperCase()==='ID');
  }

  function mergeRow(row){
    const idx=findIndex(row),location=point(row.latitude,row.longitude),mapping=String(row.mapping_class||'location_pending');
    const base={
      parfolioCatalogId:row.id,
      parfolioMappingClass:mapping,
      parfolioMappedHoleCount:mapping==='gps_ready'?Number(row.holes)||0:(mapping==='partial_gps'?1:0),
      parfolioIndonesiaAudit:true,
      sourceLicense:row.source_license||'ODbL-1.0',
      sourceAttribution:row.source_attribution||'Contains data from OpenStreetMap contributors, ODbL 1.0',
      osmCourseUri:row.osm_course_uri||null,
      catalogApproved:mapping!=='quarantined',
      catalogOnly:mapping!=='gps_ready'
    };
    if(idx>=0){
      const prior=courses[idx],existingMapped=actualMappedCount(prior);
      courses[idx]={...prior,...base,
        name:prior.name||row.name,
        city:row.city||prior.city||'',
        state:row.state_code||prior.state||'',
        postal_code:row.postal_code||prior.postal_code||'',
        country:'Indonesia',country_code:'ID',
        address:row.address||prior.address||'',
        catalog_point:location||prior.catalog_point||null,
        par_total:Number(row.par)||prior.par_total||null,
        course_type:row.course_type||prior.course_type||'Golf Course',
        holes:Number(row.holes)||prior.holes||18,
        pars:Array.isArray(prior.pars)?prior.pars:[],greens:Array.isArray(prior.greens)?prior.greens:[]
      };
      if(existingMapped>=Number(courses[idx].holes||18))courses[idx].parfolioPreservedVerifiedGeometry=true;
      return{added:false,course:courses[idx]};
    }
    const holes=Number(row.holes)||18;
    const course={id:`parfolio-id-${row.id}`,name:row.name,holes,pars:[],greens:[],...base,
      city:row.city||'',state:row.state_code||'',postal_code:row.postal_code||'',country:'Indonesia',country_code:'ID',
      address:row.address||'',catalog_point:location,par_total:Number(row.par)||null,course_type:row.course_type||'Indonesia Catalog'};
    courses.push(course);return{added:true,course};
  }

  async function fetchCatalog(){
    const rows=[];
    for(let from=0;;from+=500){
      const to=from+499;
      const {data,error}=await db.from('course_catalog')
        .select('id,source_id,source_name,normalized_name,name,city,state_code,postal_code,country_code,address,latitude,longitude,holes,par,course_type,phone,website,osm_course_uri,mapping_class,source_license,source_attribution,is_active,rejection_reason')
        .eq('country_code',COUNTRY_CODE)
        .eq('is_active',true)
        .is('rejection_reason',null)
        .range(from,to);
      if(error)throw error;
      const page=Array.isArray(data)?data:[];rows.push(...page);
      if(page.length<500)break;
      if(from>5000)throw new Error('Indonesia catalog pagination exceeded safety limit');
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
    if(![9,18].includes(holes)||rows.length!==holes)throw new Error('Indonesia GPS-ready payload is incomplete');
    const greens=rows.map((g,index)=>({
      tee:point(g?.tee?.lat,g?.tee?.lng),tees:{black:point(g?.tee?.lat,g?.tee?.lng)},
      aim1:point(g?.aim1?.lat,g?.aim1?.lng),aim2:point(g?.aim2?.lat,g?.aim2?.lng),front:point(g?.front?.lat,g?.front?.lng),
      center:point(g?.center?.lat,g?.center?.lng),back:point(g?.back?.lat,g?.back?.lng),route:g?.route||null,
      _review:'parfolio-indonesia-osm-validated',_source:g?.source||'openstreetmap_qlever',_hole:Number(g?.hole)||index+1
    }));
    if(!greens.every(g=>g.tee&&g.center))throw new Error('Indonesia GPS-ready payload failed tee/center validation');
    course.holes=holes;course.greens=greens;course.catalogOnly=false;course.parfolioMappedHoleCount=holes;
    const pars=rows.map(g=>Number(g?.par));if(pars.length===holes&&pars.every(p=>Number.isFinite(p)&&p>=2&&p<=7))course.pars=pars;
    hydrated.add(course.parfolioCatalogId);return true;
  }
  window.hydrateParFolioIndonesiaCourse=hydrateCourse;

  async function loadIndonesia(){
    if(loading)return loading;
    loading=(async()=>{
      const stats={version:VERSION,loaded:false,rows:0,added:0,matched:0,gpsReady:0,partialGps:0,courseLocated:0,locationPending:0,quarantined:0,error:null,loadedAt:null};
      try{
        if(typeof window.loadSharedCourseLibrary==='function')try{await window.loadSharedCourseLibrary({rerender:false})}catch{}
        const rows=await fetchCatalog();stats.rows=rows.length;
        for(const row of rows){
          const result=mergeRow(row);if(result.added)stats.added++;else stats.matched++;
          if(row.mapping_class==='gps_ready')stats.gpsReady++;else if(row.mapping_class==='partial_gps')stats.partialGps++;else if(row.mapping_class==='course_located')stats.courseLocated++;else if(row.mapping_class==='location_pending')stats.locationPending++;else if(row.mapping_class==='quarantined')stats.quarantined++;
        }
        courses.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
        stats.loaded=true;stats.loadedAt=new Date().toISOString();window.PARFOLIO_ID_CATALOG=stats;
        if(typeof render==='function')render();window.repairParFolioCaliforniaStatuses?.(document);return true;
      }catch(error){stats.error=String(error?.message||error);stats.loadedAt=new Date().toISOString();window.PARFOLIO_ID_CATALOG=stats;console.warn('Indonesia catalog load failed',error);return false;}
    })();return loading;
  }
  window.loadParFolioIndonesiaCatalog=loadIndonesia;

  const priorMappedCount=typeof mappedCount==='function'?mappedCount:null;
  mappedCount=function(course){
    if(course?.parfolioIndonesiaAudit){
      if(course.parfolioMappingClass==='gps_ready')return Number(course.holes)||Number(course.parfolioMappedHoleCount)||0;
      if(course.parfolioMappingClass==='partial_gps')return Math.max(1,Number(course.parfolioMappedHoleCount)||0);
      return 0;
    }
    return priorMappedCount?priorMappedCount(course):actualMappedCount(course);
  };

  const priorStartCourseFromLibrary=startCourseFromLibrary;
  startCourseFromLibrary=async function(index){
    const course=courses?.[index];
    if(course?.parfolioIndonesiaAudit&&course.parfolioMappingClass==='quarantined')alert(`${course.name} has ambiguous or unsafe GPS geometry and is not published for GPS play. Scorecard use remains available while the map is reviewed.`);
    if(course?.parfolioIndonesiaAudit&&course.parfolioMappingClass==='gps_ready'){
      try{await hydrateCourse(course)}catch(error){console.warn('Indonesia GPS hydration failed',error);alert('This Indonesia course is listed as GPS Ready, but its validated hole payload could not be loaded. Please try again.');return;}
    }
    return priorStartCourseFromLibrary(index);
  };

  setTimeout(loadIndonesia,0);
})();
