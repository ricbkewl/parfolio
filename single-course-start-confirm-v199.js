/* ParFolio v199 — consolidate course start + unfinished-round confirmation into one prompt. */
(function(){
  if(typeof startCourseFromLibrary!=='function')return;

  const priorStartCourseFromLibrary=startCourseFromLibrary;

  async function hydrateAuditedGpsCourse(course){
    if(course?.parfolioMappingClass!=='gps_ready')return;
    const candidates=[
      [course.parfolioCaliforniaAudit,window.hydrateParFolioCaliforniaCourse],
      [course.parfolioTexasAudit,window.hydrateParFolioTexasCourse],
      [course.parfolioTennesseeAudit,window.hydrateParFolioTennesseeCourse],
      [course.parfolioIndonesiaAudit,window.hydrateParFolioIndonesiaCourse]
    ];
    const hydrate=candidates.find(([matches,fn])=>matches&&typeof fn==='function')?.[1];
    if(!hydrate)return;
    await hydrate(course);
    const holes=Number(course.holes)||0,greens=Array.isArray(course.greens)?course.greens:[];
    if(!holes||greens.length<holes||!greens.slice(0,holes).every(hole=>(hole?.tee||hole?.tees?.black)&&hole?.center))throw new Error('GPS-ready course geometry is incomplete');
  }

  async function resetForCourseStart(){
    if(!currentUser){
      alert('Each golfer needs an account so scores can be protected. Please sign in or create an account first.');
      await signInAccount();
      if(!currentUser)return false;
    }
    const playerName=golferProfile?.first_name?.trim()||'';
    s={...roundDefault,v:'setup',players:[playerName],scores:{},putts:{},pars:[],resumeView:'setup',sharedRoundId:null,joinCode:null,ownerUserId:currentUser.id};
    render();
    return true;
  }

  async function singlePromptCourseStart(index){
    const course=courses?.[index];
    if(!course)return;
    let mapped=typeof mappedCount==='function'?mappedCount(course):0;
    const unfinished=!!(s?.resumeView&&!s?.done);
    let message=`Start a new game at ${course.name}?`;
    if(unfinished)message+=' Your unfinished round will be replaced.';
    if(course.catalogOnly&&!mapped)message+='\n\nThis course is approved for scorecard play while GPS mapping continues.';
    if(!confirm(message))return;

    try{await hydrateAuditedGpsCourse(course)}catch(error){
      console.warn('GPS-ready course hydration failed',error);
      alert('This course is listed as GPS Ready, but its validated hole map could not be loaded. Please try again.');
      return;
    }
    mapped=typeof mappedCount==='function'?mappedCount(course):0;

    rememberRecentCourse(course.id);
    if(!(await resetForCourseStart()))return;
    if(s.v!=='setup')return;
    if(course.royaleFacility){chooseCourse(course.id);return;}
    if(!course.catalogOnly){chooseCourse(course.id);return;}

    s.courseId=null;
    s.catalogCourseId=course.id;
    s.royaleRoute=null;
    s.course=course.name;
    s.holes=course.holes;
    s.pars=course.pars?.length===course.holes?[...course.pars]:Array(course.holes).fill(4);
    s.teeSet='black';
    s.teeDistanceMeters=course.tee_meters||null;
    s.v='pars';
    s.resumeView='pars';
    save();
    if(!mapped)alert(`${course.name} is ready for scorecard play. Live GPS guidance will appear as its holes are mapped.`);
    render();
  }

  window.parfolioPriorStartCourseFromLibraryV199=priorStartCourseFromLibrary;
  window.startCourseFromLibrary=startCourseFromLibrary=singlePromptCourseStart;
})();
