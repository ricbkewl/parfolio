/* ATG Version 112 — Royale Jakarta hole-by-hole remap reference.
   GPS coordinates remain quarantined until each hole is verified against satellite imagery.
   Sources:
   - Official Royale Jakarta course pages (North / South / West structure, par and course identity)
   - Royale Jakarta published scorecard data mirrored in course-reference publications
   - Independent hole-by-hole photo guide used only as visual/routing evidence, never as a GPS source
*/
(function(){
  const reference={
    verified:'2026-08-31',
    officialCourseSource:'https://www.royalejakarta.com/golf-course/',
    location:{lat:-6.271247,lng:106.901222},
    status:'hole-by-hole-remap-in-progress',
    rule:'Do not restore live GPS for any Royale hole until tee, route aim point(s), and green center have been checked on current satellite imagery.',
    loops:{
      west:{
        pars:[4,5,4,3,4,4,3,4,5],
        meters:{black:[389,554,343,150,447,322,194,425,494],blue:[372,516,327,138,429,307,175,408,466],white:[350,479,300,122,395,281,152,360,428],red:[308,406,260,99,338,250,117,315,379]},
        holes:[
          {hole:1,status:'reference-ready',shape:'mostly straight / slight rise',verify:['tee on correct West 1 box','fairway right-side target','green with right bunker'],note:'Favor the right side from the tee; green approach favors left side.'},
          {hole:2,status:'reference-ready',shape:'long par 5',verify:['tee','landing zone between bunkers','green'],note:'Flower bed left toward green; OB right; use bunker pair to identify first landing zone.'},
          {hole:3,status:'reference-ready',shape:'par 4',verify:['tee','fairway between bunkers','green'],note:'Lake runs along left; OB right.'},
          {hole:4,status:'reference-ready',shape:'downhill par 3',verify:['tee across water','green'],note:'Water carry; green left side falls toward water.'},
          {hole:5,status:'reference-ready',shape:'uphill par 4',verify:['tee','front pot bunker','green'],note:'Flower beds both sides; target beyond central pot bunker.'},
          {hole:6,status:'reference-ready',shape:'short par 4 over water',verify:['tee across water','fairway bunker / layup point','green'],note:'Strategic layup short of bunker or carry it; elevated green.'},
          {hole:7,status:'reference-ready',shape:'par 3',verify:['tee','green'],note:'Water left; flower bed and OB right; green touches water on left.'},
          {hole:8,status:'reference-ready',shape:'uphill par 4',verify:['tee','bunker corridor','green'],note:'Straight tee shot between bunkers; avoid trees left.'},
          {hole:9,status:'reference-ready',shape:'par 5 finish',verify:['tee','left-side fairway target','second-shot bunker / layup','green'],note:'Water along right; flower beds and trees left; second shot favors left.'}
        ]
      },
      south:{
        pars:[4,3,5,4,4,3,4,4,5],
        meters:{black:[365,155,490,432,365,189,400,420,563],blue:[347,137,474,411,351,173,382,401,515],white:[316,117,449,369,318,143,347,354,482],red:[272,96,387,309,280,111,294,300,383]},
        holes:[
          {hole:1,status:'reference-ready',shape:'par 4',verify:['tee','right fairway bunker','green'],note:'Avoid bunker on right from tee; pot bunker left of green.'},
          {hole:2,status:'reference-ready',shape:'par 3',verify:['tee','green'],note:'Front bunker and vegetation right constrain the green.'},
          {hole:3,status:'reference-ready',shape:'par 5',verify:['tee across creek','first landing zone','second-shot bunker corridor','green'],note:'Tee shot crosses water/creek; second shot favors right side.'},
          {hole:4,status:'reference-ready',shape:'par 4',verify:['tee','fairway bunker layup','creek crossing','green'],note:'Second shot crosses creek; tee shot should finish short of fairway bunker.'},
          {hole:5,status:'reference-ready',shape:'par 4',verify:['tee across creek','left fairway target','green'],note:'Creek carry; favor left on both tee and approach.'},
          {hole:6,status:'reference-ready',shape:'par 3 over water',verify:['tee','green'],note:'Water carry; safer miss is right.'},
          {hole:7,status:'reference-ready',shape:'long par 4',verify:['tee','center fairway','small green'],note:'Primarily straight; small green with bunker right.'},
          {hole:8,status:'reference-ready',shape:'par 4',verify:['tee','cross-bunker landing zone','green'],note:'Cross bunker defines tee-shot target; water right of green.'},
          {hole:9,status:'reference-ready',shape:'long par 5',verify:['tee across water','cross-bunker target','creek about 150 yd short of green','green'],note:'Large water left; creek affects second/third shot.'}
        ]
      },
      north:{
        pars:[4,5,4,3,4,4,4,3,5],
        meters:{black:[362,550,344,150,373,431,400,171,510],blue:[345,500,321,124,350,399,388,153,487],white:[319,471,289,111,318,365,340,133,455],red:[276,410,250,88,286,319,296,108,387]},
        holes:[
          {hole:1,status:'reference-ready',shape:'downhill dogleg left',verify:['tee','left-turn landing zone near bunker','green'],note:'This is a true left dogleg; use the left bunker as a routing landmark.'},
          {hole:2,status:'reference-ready',shape:'par 5',verify:['tee','right-side first target','bunker-defined second target','green'],note:'Right side is safer; bunkers define route.'},
          {hole:3,status:'reference-ready',shape:'short par 4',verify:['tee','right-side water edge','green'],note:'Water expands from front-right of green.'},
          {hole:4,status:'reference-ready',shape:'short par 3 over water',verify:['tee','green'],note:'Water carry; favor left side of green.'},
          {hole:5,status:'reference-ready',shape:'dogleg left par 4',verify:['tee','left-turn fairway','green'],note:'Water runs along left; elevated green.'},
          {hole:6,status:'reference-ready',shape:'uphill par 4',verify:['tee','right fairway target','green'],note:'Favor right; bunker guards right of green.'},
          {hole:7,status:'reference-ready',shape:'dogleg left par 4',verify:['tee across creek','right-side layup near bunker','left-turn approach','green'],note:'Creek crossing and lake left are major route features.'},
          {hole:8,status:'reference-ready',shape:'uphill par 3',verify:['tee','green'],note:'Avoid right bunker; favor left side.'},
          {hole:9,status:'reference-ready',shape:'uphill dogleg left par 5',verify:['tee','right-side first target','left-turn second target','green'],note:'Strong left dogleg finish; do not map as a straight line.'}
        ]
      }
    }
  };

  window.ROYALE_JAKARTA_REMAP_V112=reference;

  try{
    const catalog=courses.find(course=>course.id==='catalog-royale-jakarta');
    if(catalog){
      catalog.officialMappingReference=reference;
      catalog.mappingStatus='hole-by-hole-remap-in-progress';
      catalog.catalog_note='Scorecard verified. All 27 holes now have hole-by-hole routing references. GPS remains disabled until satellite coordinates are individually verified.';
    }
  }catch(err){console.warn('Royale remap reference v112 could not patch catalog',err);}
})();
