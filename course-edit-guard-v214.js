/* ParFolio v216 — systemwide resilient course-editor entry guard + UUID-safe catalog editing. */
(function(){
  function clone(value){try{return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}catch{return JSON.parse(JSON.stringify(value||{}))}}
  function validPoint(p){return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))}
  function isUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''))}
  function newUuid(){
    if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
    const bytes=new Uint8Array(16);globalThis.crypto?.getRandomValues?.(bytes);
    if(!bytes.some(Boolean)){for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256)}
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const h=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  function blankGreen(){return{tee:null,aim1:null,aim2:null,front:null,center:null,back:null}}
  function normalizeGreen(g){const x=(g&&typeof g==='object')?clone(g):blankGreen();x.aim1??=null;x.aim2??=null;x.front??=null;x.center??=null;x.back??=null;if(!('tee' in x))x.tee=x?.tees?.black||null;return x}
  function normalizeCourseForEditor(course,{catalog=false}={}){
    const c=clone(course||{}),declared=Number(c.holes),existing=Array.isArray(c.greens)?c.greens.length:0,holes=[9,18,27].includes(declared)?declared:(existing||18);
    c.holes=holes;
    const sourceGreens=Array.isArray(c.greens)?c.greens:[];
    c.greens=Array.from({length:holes},(_,i)=>normalizeGreen(sourceGreens[i]));
    c.pars=Array.from({length:holes},(_,i)=>Number(c.pars?.[i])||4);
    c.mapHole=1;
    c.target=c.greens[0]?.tees?'center':catalog?'tee':'center';
    c.mapStyle=c.mapStyle||'satellite';
    if(validPoint(c.catalog_point)&&!c.mapView)c.mapView={lat:Number(c.catalog_point.lat),lng:Number(c.catalog_point.lng),zoom:17};
    return c;
  }
  function makeDraftIdSafe(course,d){
    if(isUuid(d.id)){d.isNew=false;return d}
    d.catalogSourceId=d.catalogSourceId||course?.id||null;
    d.catalogDatabaseId=d.parfolioCatalogId||course?.parfolioCatalogId||null;
    d.sourceCourseId=course?.id||d.id||null;
    d.id=newUuid();
    d.isNew=true;
    return d;
  }
  function disposeMap(){try{if(typeof map!=='undefined'&&map){map.remove();map=null}}catch{}}
  function fail(error,course){console.error('ParFolio course editor failed',course?.name,error);alert(`Unable to open the course editor${course?.name?` for ${course.name}`:''}. Please try again.`)}
  function ensureAdmin(){if(typeof adminRole==='undefined'||!adminRole){alert('Administrator sign-in required.');return false}return true}

  window.parfolioNormalizeCourseForEditor=normalizeCourseForEditor;
  window.parfolioCourseIdIsUuid=isUuid;

  editCourse=function(i){
    if(!ensureAdmin())return;
    const course=Array.isArray(courses)?courses[i]:null;if(!course){alert('Course could not be found.');return}
    try{
      disposeMap();
      draft=normalizeCourseForEditor(course,{catalog:false});
      makeDraftIdSafe(course,draft);
      if(typeof EAGLE_GLEN_COURSE_ID!=='undefined'&&draft.id===EAGLE_GLEN_COURSE_ID&&typeof buildEagleGlenDraft==='function'&&!draft.greens?.every(g=>g?.tees?.black)){
        draft.pars=Array.isArray(EAGLE_GLEN_PARS)?[...EAGLE_GLEN_PARS]:draft.pars;draft.greens=buildEagleGlenDraft();draft.intelligentDraft=true;draft.reviewedHoles=Array(draft.holes).fill(false);draft.mapStyle='satellite';
      }else if(typeof REVIEW_TEE_OFFSETS!=='undefined'&&REVIEW_TEE_OFFSETS[draft.id]&&typeof buildExistingCourseReviewDraft==='function'&&!draft.greens?.every(g=>g?.tees?.black)){
        draft.greens=buildExistingCourseReviewDraft(draft,REVIEW_TEE_OFFSETS[draft.id]);draft.intelligentDraft=true;draft.reviewedHoles=Array(draft.holes).fill(false);draft.mapStyle='satellite';
      }
      s.v='mapCourse';render();
    }catch(error){fail(error,course)}
  };

  mapCatalogCourse=function(i){
    if(!ensureAdmin())return;
    const course=Array.isArray(courses)?courses[i]:null;if(!course){alert('Course could not be found.');return}
    try{
      disposeMap();
      draft=normalizeCourseForEditor(course,{catalog:true});
      draft.catalogSourceId=course.id;draft.catalogDatabaseId=course.parfolioCatalogId||null;draft.sourceCourseId=course.id;
      draft.id=newUuid();draft.isNew=true;draft.target='tee';draft.mapStyle='satellite';
      s.v='mapCourse';render();
    }catch(error){fail(error,course)}
  };

  /* Final render guard: malformed/partial geometry and non-UUID draft IDs can never reach persistence. */
  const priorMapCourse=mapCourse;
  mapCourse=function(){
    try{
      if(draft){
        const safe=normalizeCourseForEditor(draft,{catalog:!!draft.isNew});
        Object.assign(draft,safe);
        if(!isUuid(draft.id)){draft.sourceCourseId=draft.sourceCourseId||draft.id;draft.id=newUuid();draft.isNew=true}
        draft.mapHole=Math.max(1,Math.min(draft.holes,Number(draft.mapHole)||1));
      }
      return priorMapCourse.apply(this,arguments);
    }catch(error){
      console.error('ParFolio mapCourse render guard caught an error',error);
      if(typeof s!=='undefined')s.v='coursesView';
      alert('This course had incomplete mapping data. ParFolio repaired the editor draft; please tap Edit again.');
      try{render()}catch{}
    }
  };
})();
