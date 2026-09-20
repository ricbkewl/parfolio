/* ParFolio v315 — direct course selection; no redundant native start/unfinished-round prompt. */
(function(){
  if(typeof startCourseFromLibrary!=='function')return;

  const priorStartCourseFromLibrary=startCourseFromLibrary;

  async function hydrateAuditedGpsCourse(course){
    const claimed=typeof window.parfolioCourseClaimsGpsReady==='function'
      ?window.parfolioCourseClaimsGpsReady(course)
      :course?.parfolioMappingClass==='gps_ready';
    if(!claimed)return;
    if(typeof window.ensureParFolioGpsCourseReady==='function'){
      await window.ensureParFolioGpsCourseReady(course);
      return;
    }
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
    // Course-card taps now go straight to the setup screen. The setup screen's
    // Start Round / Preview Course actions provide the intentional choice, so a
    // native confirmation dialog here is redundant and interrupts browsing.
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
