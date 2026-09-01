/* Version 114: keep course editor tied to the selected course location.
   Prevent a previous editor map from leaking its center into the next course,
   then prefer existing hole markers and fall back to the course catalog point. */
(function(){
  function disposeEditorMap(){
    if(!map)return;
    try{map.remove()}catch{}
    map=null;
  }

  function firstCoursePoint(course){
    const holes=course?.greens||[];
    for(const hole of holes){
      const point=hole?.tee||hole?.tees?.black||hole?.center||hole?.front||hole?.back||hole?.aim1||hole?.aim2;
      if(point?.lat!=null&&point?.lng!=null)return{lat:Number(point.lat),lng:Number(point.lng),zoom:18};
    }
    const point=course?.catalog_point;
    if(point?.lat!=null&&point?.lng!=null)return{lat:Number(point.lat),lng:Number(point.lng),zoom:17};
    return null;
  }

  const priorEditCourse=editCourse;
  editCourse=function(i){
    const course=courses[i];
    /* render() saves the current map center into the new draft if map still exists.
       Clear the old editor first so one course can never inherit another course's view. */
    disposeEditorMap();
    priorEditCourse(i);
    if(!draft||!course)return;
    const focus=firstCoursePoint(course);
    if(focus){
      draft.mapView={...focus};
      draft.verifiedCourseLocation=course.catalog_point?{...course.catalog_point}:null;
      draft.courseAddress=course.address||'';
      draft.courseCity=course.city||'';
      draft.courseState=course.state||'';
    }
  };

  const priorMapCatalogCourse=mapCatalogCourse;
  mapCatalogCourse=function(i){
    disposeEditorMap();
    priorMapCatalogCourse(i);
    const course=courses[i];
    if(!draft||!course)return;
    const focus=firstCoursePoint(course);
    if(focus)draft.mapView={...focus};
    draft.verifiedCourseLocation=course.catalog_point?{...course.catalog_point}:null;
    draft.courseAddress=course.address||'';
    draft.courseCity=course.city||'';
    draft.courseState=course.state||'';
  };

  /* When changing holes, prefer that hole's own mapped geometry. If the hole is empty,
     keep the editor at the verified course location rather than a generic fallback. */
  const priorInitMap=initMap;
  initMap=async function(){
    if(draft){
      const hole=draft.greens?.[draft.mapHole-1];
      const holePoint=hole?.tee||hole?.tees?.black||hole?.center||hole?.front||hole?.back||hole?.aim1||hole?.aim2;
      if(holePoint?.lat!=null&&holePoint?.lng!=null){
        draft.mapView={lat:Number(holePoint.lat),lng:Number(holePoint.lng),zoom:18};
      }else if(draft.verifiedCourseLocation?.lat!=null&&draft.verifiedCourseLocation?.lng!=null){
        draft.mapView={lat:Number(draft.verifiedCourseLocation.lat),lng:Number(draft.verifiedCourseLocation.lng),zoom:17};
      }
    }
    return priorInitMap();
  };
})();
