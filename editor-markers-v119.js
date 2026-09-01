/* Version 119: always expose the complete course-mapping marker set.
   Every hole editor shows Black/Blue/White/Red tees, Aim 1/Aim 2, and Front/Center/Back green points. */
(function(){
  function ensureCompleteEditorMarkers(){
    if(!draft?.greens?.length)return;
    for(const green of draft.greens){
      if(!green)continue;
      green.tees??={};
      /* Preserve the legacy/reference tee as Black when colored tees have not yet been created. */
      if(!green.tees.black&&green.tee)green.tees.black={...green.tee};
      green.tees.black??=null;
      green.tees.blue??=null;
      green.tees.white??=null;
      green.tees.red??=null;
      green.aim1??=null;
      green.aim2??=null;
      green.front??=null;
      green.center??=null;
      green.back??=null;
      if(green.tees.black)green.tee={...green.tees.black};
    }
  }

  const priorMapCourse119=mapCourse;
  mapCourse=function(){
    ensureCompleteEditorMarkers();
    priorMapCourse119();
  };

  /* New and catalog mapping drafts should start with the same complete controls immediately. */
  if(typeof newCourse==='function'){
    const priorNewCourse119=newCourse;
    newCourse=function(){priorNewCourse119();ensureCompleteEditorMarkers();};
  }
  if(typeof mapCatalogCourse==='function'){
    const priorMapCatalog119=mapCatalogCourse;
    mapCatalogCourse=function(i){priorMapCatalog119(i);ensureCompleteEditorMarkers();};
  }
  if(typeof editCourse==='function'){
    const priorEditCourse119=editCourse;
    editCourse=function(i){priorEditCourse119(i);ensureCompleteEditorMarkers();};
  }
})();
