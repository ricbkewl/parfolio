/* ParFolio v159: lazy-load New York OSM GPS drafts into the admin course editor.
   Drafts never activate live play and never overwrite existing verified GPS. */
(function(){
  const URL='data/ny-osm-gps-drafts-v159.json?v=159';
  let cache=null,pending=null;

  function hasExistingGps(course){
    return Array.isArray(course?.greens)&&course.greens.some(g=>g?.tee&&g?.center);
  }
  function nyCourse(course){
    return String(course?.state||'').toUpperCase()==='NY' || String(course?.id||'').startsWith('opengolf-ny-');
  }
  function sourceId(course){
    return String(course?.openGolfApiId||String(course?.id||'').replace(/^opengolf-ny-/,''));
  }
  async function data(){
    if(cache)return cache;
    if(pending)return pending;
    pending=fetch(URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`NY GPS draft file returned ${r.status}`);return r.json();}).then(v=>(cache=v)).finally(()=>pending=null);
    return pending;
  }
  function emptyGreen(){return{tee:null,tees:{black:null,blue:null,white:null,red:null},aim1:null,aim2:null,front:null,center:null,back:null,_review:'osm-draft-review'};}

  function applyMapping(course,mapping){
    if(!course||!mapping||hasExistingGps(course))return false;
    const maxHole=Math.max(18,...(mapping.numberedHoles||[]).map(Number).filter(Number.isFinite));
    const greens=Array.from({length:maxHole},emptyGreen),pars=Array.isArray(course.pars)?course.pars.slice():Array.from({length:maxHole},()=>4);
    for(const row of mapping.greens||[]){
      const n=Number(row.hole);if(!Number.isInteger(n)||n<1||n>maxHole)continue;
      greens[n-1]={tee:row.tee||null,tees:{black:row.tee||null,blue:null,white:null,red:null},aim1:row.aim1||null,aim2:row.aim2||null,front:row.front||null,center:row.center||null,back:row.back||null,_review:'osm-draft-review',_nyAutoMapped:true};
      if(Number(row.par)>=3&&Number(row.par)<=6)pars[n-1]=Number(row.par);
    }
    course.greens=greens;
    course.pars=pars;
    course.holes=mapping.playableHoles||course.holes||18;
    course.catalogOnly=true;
    course.sharedLibraryGpsActive=false;
    course.sharedMappingStatus='gps_draft';
    course.mappingStatus='gps_draft';
    course._nyAutoMap={version:159,reviewReady:Boolean(mapping.reviewReady),confidence:mapping.confidence||'partial',mappedHoleCount:mapping.mappedHoleCount||0,boundaryMatch:mapping.boundaryMatch||null,issues:mapping.issues||[]};
    return true;
  }

  window.loadNyGpsDraftForCourse=async function(course){
    if(!nyCourse(course)||hasExistingGps(course))return false;
    try{
      const payload=await data(),mapping=payload?.courses?.[sourceId(course)];
      return mapping?applyMapping(course,mapping):false;
    }catch(error){console.warn('NY GPS draft unavailable',error);return false;}
  };

  if(typeof mapCourse==='function'){
    const prior=mapCourse;
    mapCourse=function(){
      prior();
      const active=typeof draft!=='undefined'?draft:null;
      if(!active||!nyCourse(active)||hasExistingGps(active)||active?._nyDraftLoading)return;
      active._nyDraftLoading=true;
      window.loadNyGpsDraftForCourse(active).then(changed=>{
        delete active._nyDraftLoading;
        if(changed){
          try{prior();}catch{}
          const editor=document.querySelector('.course-editor,.editor-shell,#courseEditor');
          if(editor){
            const note=document.createElement('div');
            note.className='ny-gps-draft-note';
            note.textContent=`NY automated GPS draft loaded · ${active._nyAutoMap.mappedHoleCount} holes · ${active._nyAutoMap.reviewReady?'Review-ready':'Manual review needed'}`;
            editor.prepend(note);
          }
        }
      });
    };
  }
})();
