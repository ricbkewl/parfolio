/* ATG Version 110 — official course mapping reference data.
   Sources are official course websites/scorecards only.
   This file intentionally stores routing/yardage evidence without inventing GPS coordinates. */
(function(){
  const refs={
    butterfield:{
      source:'https://www.elpradogolfcourses.com/butterfield-stage',
      verified:'2026-08-31',
      tees:{
        blue:[369,160,370,421,397,512,186,377,489,362,374,524,389,195,374,543,143,383],
        white:[361,130,360,410,384,493,178,362,480,346,359,509,370,149,364,501,128,367],
        red:[316,107,314,350,339,450,142,315,437,306,324,463,327,124,315,451,107,320]
      },
      pars:[4,3,4,4,4,5,3,4,5,4,4,5,4,3,4,5,3,4],
      routingHints:{1:'big dogleg right',3:'uphill dogleg right',6:'pond affects second shot; typical layup near 100-yard marker',8:'pond left / OB and sand right',9:'pond left',12:'pond left around 110 yards from green',13:'slight dogleg right; favor left-center',16:'pond left inside 100 yards',17:'pond left'}
    },
    chino:{
      source:'https://www.elpradogolfcourses.com/chino-creek',
      verified:'2026-08-31',
      tees:{
        blue:[384,377,399,178,552,371,180,429,555,385,398,401,520,181,413,175,512,440],
        white:[364,339,389,144,517,358,142,399,504,368,350,384,506,150,406,146,442,401],
        red:[306,306,341,118,450,313,118,335,460,321,310,333,458,124,360,121,409,393]
      },
      pars:[4,4,4,3,5,4,3,4,5,4,4,4,5,3,4,3,5,4],
      routingHints:{2:'landing area slopes right; pond right of cart path',5:'approach uphill',6:'slight dogleg right; downhill to green',7:'pond carry',8:'approach uphill',9:'favor left half; uphill approach',10:'creek crosses fairway about 100 yards from green then runs left',11:'pond right / OB left',13:'aim just right of tower',15:'creek crosses fairway about 80 yards short of green',17:'creek crosses fairway; about 300 yards from blue / 250 from white',18:'tee shot carries creek; uphill finish'}
    },
    westridge:{
      source:'https://www.westridgegolfclub.com/course-details/',
      verified:'2026-08-31',
      parTotal:72,
      backYards:6438,
      routingHints:{4:'par 5; water hazard forces layup',14:'par 5 dogleg right; deep ravine crosses fairway; lay up short',18:'par 5; hazard right; water front and right of green'}
    },
    ranchoCalifornia:{
      source:'https://www.thegolfclubatranchocalifornia.com/wp-content/uploads/sites/8463/2022/04/scorecardupdated.pdf',
      verified:'2026-08-31',
      pars:[5,3,4,5,4,3,4,4,4,3,4,4,5,4,4,3,5,4],
      tees:{
        black:[565,185,413,553,428,167,348,431,391,201,406,419,586,427,351,205,515,445],
        blue:[545,174,387,539,420,160,324,400,363,191,380,411,558,408,343,189,499,411],
        white:[514,146,372,527,392,144,309,387,343,135,369,377,538,398,319,164,459,401],
        gold:[514,146,350,527,392,144,309,299,303,135,369,377,483,318,319,164,459,307],
        red:[473,113,213,426,351,110,280,299,303,127,348,367,483,318,277,155,429,307]
      },
      scorecardReady:true,
      mappingStatus:'scorecard-ready-gps-pending'
    },
    sierraLakes:{
      source:'https://www.sierralakes.com/wp-content/uploads/2019/12/Sierra_lakes_scorecard.pdf',
      verified:'2026-08-31',
      pars:[4,4,5,3,4,3,4,5,4,4,4,4,3,4,5,4,3,5],
      red:[286,301,456,123,318,89,312,462,268,328,330,286,108,305,444,331,127,450]
    },
    glenIvy:{
      source:'https://www.glenivygolf.com/golf/course-information',
      verified:'2026-08-31',
      mappingEvidence:'official 18-hole course tour images',
      routingHints:{18:'signature hole with approximately 200-foot drop to fairway'}
    }
  };

  window.ATG_MAPPING_REFERENCE_V110=refs;

  try{
    const byId=id=>LISTED_COURSE_CATALOG.find(c=>c.id===id);
    const butterfield=byId('catalog-el-prado-butterfield');
    if(butterfield){butterfield.officialMappingReference=refs.butterfield;butterfield.official_tees=refs.butterfield.tees;}
    const chino=byId('catalog-el-prado-chino-creek');
    if(chino){chino.officialMappingReference=refs.chino;chino.official_tees=refs.chino.tees;}
    const westridge=byId('catalog-westridge');
    if(westridge){westridge.officialMappingReference=refs.westridge;}
    const rancho=byId('catalog-rancho-california');
    if(rancho){
      rancho.pars=[...refs.ranchoCalifornia.pars];
      rancho.official_tees=refs.ranchoCalifornia.tees;
      rancho.officialMappingReference=refs.ranchoCalifornia;
      rancho.catalog_note='Official scorecard verified; hole-by-hole pars and five tee yardage sets loaded. GPS mapping still pending.';
    }
    const glenIvy=byId('catalog-glen-ivy');
    if(glenIvy){glenIvy.officialMappingReference=refs.glenIvy;}
  }catch(err){console.warn('ATG mapping reference v110 could not patch catalog',err);}
})();
