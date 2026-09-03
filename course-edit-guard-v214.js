/* ParFolio v214 — systemwide resilient course-editor entry guard. */
(function(){
  function clone(value){try{return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}catch{return JSON.parse(JSON.stringify(value||{}))}}
  function validPoint(p){return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))}
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
  function disposeMap(){try{if(typeof map!=='undefined'&&map){map.remove();map=null}}catch{}}
  function fail(error,course){console.error('ParFolio course editor failed',course?.name,error);alert(`Unable to open the course editor${course?.name?` for ${course.name}`:''}. Please try again.`)}
  function ensureAdmin(){if(typeof adminRole==='undefined'||!adminRole){alert('Administrator sign-in required.');return false}return true}

  window.parfolioNormalizeCourseForEditor=normalizeCourseForEditor;

  editCourse=function(i){
    if(!ensureAdmin())return;
    const course=Array.isArray(courses)?courses[i]:null;if(!course){alert('Course could not be found.');return}
    try{
      disposeMap();
      draft=normalizeCourseForEditor(course,{catalog:false});
      draft.isNew=false;
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
      draft.id=(globalThis.crypto?.randomUUID?.()||`catalog-${Date.now()}`);
      draft.isNew=true;draft.catalogSourceId=course.id;draft.target='tee';draft.mapStyle='satellite';
      s.v='mapCourse';render();
    }catch(error){fail(error,course)}
  };

  /* Final render guard: malformed/partial course geometry can never crash the editor. */
  const priorMapCourse=mapCourse;
  mapCourse=function(){
    try{
      if(draft){
        const safe=normalizeCourseForEditor(draft,{catalog:!!draft.isNew});
        Object.assign(draft,safe);
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
